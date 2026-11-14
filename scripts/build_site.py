"""Build static resource pages with crawler-readable social metadata."""
import argparse
import hashlib
import io
import html
import json
import re
import shutil
import subprocess
from html.parser import HTMLParser
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import parse_qs, quote, unquote, urlencode, urljoin, urlsplit

from PIL import Image, ImageOps

ORIGIN = 'https://slexams.site'

PUBLIC_PAGES = {
    'index.html': ('Sri Lanka Exam Papers for Grades 1–13 | SLExam Pro', 'Find free Sri Lankan school exam papers, term tests and worksheets for Grades 1–13, plus news, schemes and learning apps.'),
    'news.html': ('News | SLExam Pro', 'Read news and updates across a range of topics on SLExam Pro.'),
    'apps.html': ('Educational Apps for Students & Teachers | SLExam Pro', 'Explore educational apps, their features, preview images and official download links for students and teachers.'),
    'scheme.html': ('School Schemes & Teaching Resources | SLExam Pro', 'Browse available school schemes and teaching resources by grade and subject on SLExam Pro.'),
    'exam-papers.html': ('School Exam Papers for Grades 1–13 | SLExam Pro', 'Choose a grade to browse Sri Lankan school term examination papers and revision resources.'),
    'about.html': ('About SLExam Pro | Sri Lanka Learning Resources', 'Learn about SLExam Pro, a free educational resource platform for Sri Lankan students, teachers and parents.'),
    'contact.html': ('Contact SLExam Pro', 'Contact SLExam Pro with questions, corrections and enquiries about school papers and educational resources.'),
    'privacy.html': ('Privacy Policy | SLExam Pro', 'Read the SLExam Pro privacy policy and information about data handling on this educational resource website.'),
    'terms.html': ('Terms & Conditions | SLExam Pro', 'Read the terms and conditions for accessing and using SLExam Pro educational resources.'),
    'disclaimer.html': ('Disclaimer & Copyright | SLExam Pro', 'Read the SLExam Pro educational resource disclaimer and copyright information.')
}


def json_ld(value):
    text = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
    text = text.replace('<', '\\u003c').replace('>', '\\u003e').replace('&', '\\u0026')
    return '<script type="application/ld+json">' + text + '</script>'


def breadcrumbs_for(record):
    items = [('Home', ORIGIN + '/')]
    if record['kind'] in ('paper', 'worksheet'):
        grade = record.get('grade')
        if grade:
            items.append((f'Grade {grade}', ORIGIN + '/grade.html?' + urlencode({'grade': grade})))
    else:
        parent = {'news': ('News', 'news.html'), 'scheme': ('Schemes', 'scheme.html'), 'app': ('Education Apps', 'apps.html')}[record['kind']]
        items.append((parent[0], ORIGIN + '/' + parent[1]))
    items.append((record['title'], ORIGIN + record['path']))
    return items


def resource_schema(record):
    canonical = ORIGIN + record['path']
    crumb_id = canonical + '#breadcrumbs'
    graph = [
        {'@type': 'WebPage', '@id': canonical, 'url': canonical, 'name': record['title'],
         'description': record['description'], 'isPartOf': {'@id': ORIGIN + '/#website'}, 'breadcrumb': {'@id': crumb_id}},
        {'@type': 'BreadcrumbList', '@id': crumb_id, 'itemListElement': [
            {'@type': 'ListItem', 'position': i + 1, 'name': name, 'item': target}
            for i, (name, target) in enumerate(breadcrumbs_for(record))
        ]}
    ]
    if record['kind'] in ('paper', 'worksheet'):
        details = record.get('paper_details')
        details = details if isinstance(details, dict) else {}
        learning = {'@type': 'LearningResource', '@id': canonical + '#resource',
                    'name': record['title'], 'description': record['description'],
                    'url': canonical, 'inLanguage': 'ta' if str(details.get('medium', '')).lower() in ('tamil', 'tamil medium', 'tm') else 'en' if str(details.get('medium', '')).lower() in ('english', 'english medium', 'em') else 'und',
                    'educationalLevel': f"Grade {record['grade']}",
                    'learningResourceType': 'Worksheet' if record['kind'] == 'worksheet' else 'Exam paper',
                    'isPartOf': {'@id': ORIGIN + '/#website'}}
        if record.get('subject'):
            learning['about'] = {'@type': 'Thing', 'name': str(record['subject'])}
        if record.get('pdf'):
            learning['encoding'] = {'@type': 'MediaObject', 'contentUrl': record['pdf'], 'encodingFormat': 'application/pdf'}
        graph.append(learning)
    if record['kind'] == 'news':
        article = {'@type': 'NewsArticle', '@id': canonical + '#article', 'headline': record['title'],
                   'description': record['description'], 'image': [record.get('share_image', record['image'])],
                   'mainEntityOfPage': {'@id': canonical}, 'publisher': {'@type': 'Organization', '@id': ORIGIN + '/#organization', 'name': 'SLExam Pro', 'url': ORIGIN + '/', 'logo': {'@type': 'ImageObject', 'url': ORIGIN + '/assets/images/icon-512.png'}}}
        # Do not invent a publication time or author when the source has only a date.
        date = str(record.get('date') or '')
        try:
            parsed = datetime.fromisoformat(date.replace('Z', '+00:00'))
            if 'T' in date and parsed.tzinfo is not None:
                article['datePublished'] = date
        except (ValueError, TypeError):
            pass
        graph.append(article)
    return {'@context': 'https://schema.org', '@graph': graph}


class _TagAttributes(HTMLParser):
    def handle_starttag(self, tag, attrs):
        self.attributes = dict(attrs)


def inline_home_styles(document, source):
    """Keep the cascade intact while avoiding two cold-load CSS requests."""
    def replace_link(match):
        parser = _TagAttributes()
        parser.feed(match[0])
        attrs = parser.attributes
        path = attrs.get('href', '')
        if attrs.get('rel', '').lower() != 'stylesheet' or path not in (
            'assets/css/style.css', 'assets/css/social.css'
        ) or any(key in attrs for key in ('media', 'disabled', 'title')):
            return match[0]
        css = (source / path).read_text(encoding='utf-8')
        # Relative CSS resources would resolve differently inside an HTML page.
        # Retain the external stylesheet if those are introduced in the future.
        if re.search(r'url\s*\(|@import|</style', css, re.I):
            return match[0]
        return '<style data-inline-source="' + path + '">\n' + css + '\n</style>'
    return re.sub(r'<link\b[^>]*>', replace_link, document, flags=re.I)


def update_html_seo(document, filename):
    match = re.search(r'<head\b[^>]*>([\s\S]*?)</head>', document, re.I)
    if not match:
        return document
    head = match[1]
    old_title = re.search(r'<title\b[^>]*>([\s\S]*?)</title>', head, re.I)
    title, description = PUBLIC_PAGES.get(filename, (html.unescape(old_title[1].strip()) if old_title else 'SLExam Pro', None))
    def remove_tag(tag_match):
        nonlocal description
        parser = _TagAttributes()
        parser.feed(tag_match[0])
        attrs = getattr(parser, 'attributes', {})
        name, prop = attrs.get('name', '').lower(), attrs.get('property', '').lower()
        if name == 'description':
            if description is None:
                description = attrs.get('content', '')
            return ''
        if (name == 'robots' and filename in ('admin.html', 'search.html', 'viewer.html')) or 'canonical' in attrs.get('rel', '').lower().split():
            return ''
        if filename in PUBLIC_PAGES and (prop.startswith('og:') or name.startswith('twitter:')):
            return ''
        return tag_match[0]
    head = re.sub(r'<(?:meta|link)\b[^>]*>', remove_tag, head, flags=re.I)
    head = re.sub(r'<title\b[^>]*>[\s\S]*?</title>', '', head, flags=re.I)
    description = description or 'Browse free school papers and educational resources for Sri Lankan students and teachers on SLExam Pro.'
    tags = [f'<title>{escape(title)}</title>', f'<meta name="description" content="{escape(description)}">']
    if filename in ('admin.html', 'search.html', 'viewer.html'):
        tags.append('<meta name="robots" content="noindex,follow">')
    if filename in PUBLIC_PAGES:
        canonical = ORIGIN + ('/' if filename == 'index.html' else '/' + filename)
        tags.extend([
            f'<link rel="canonical" href="{canonical}">',
            '<meta property="og:site_name" content="SLExam Pro">', '<meta property="og:type" content="website">',
            f'<meta property="og:title" content="{escape(title)}">', f'<meta property="og:description" content="{escape(description)}">',
            f'<meta property="og:url" content="{canonical}">', f'<meta property="og:image" content="{ORIGIN}/assets/images/icon-512.png">'
        ])
        page_type = 'AboutPage' if filename == 'about.html' else 'ContactPage' if filename == 'contact.html' else 'CollectionPage' if filename in ('news.html', 'apps.html', 'scheme.html', 'exam-papers.html') else 'WebPage'
        graph = [{'@type': page_type, '@id': canonical, 'url': canonical, 'name': title, 'description': description, 'isPartOf': {'@id': ORIGIN + '/#website'}}]
        if filename == 'index.html':
            graph.extend([
                {'@type': 'WebSite', '@id': ORIGIN + '/#website', 'url': ORIGIN + '/', 'name': 'SLExam Pro', 'inLanguage': ['en', 'ta'], 'publisher': {'@id': ORIGIN + '/#organization'}},
                {'@type': 'Organization', '@id': ORIGIN + '/#organization', 'name': 'SLExam Pro', 'url': ORIGIN + '/', 'logo': ORIGIN + '/assets/images/icon-512.png'}
            ])
        tags.append(json_ld({'@context': 'https://schema.org', '@graph': graph}))
    document = document[:match.start(1)] + head + '\n' + '\n'.join(tags) + '\n' + document[match.end(1):]
    if filename in ('grade.html', 'stream.html', 'subject.html', 'term.html', 'paper.html'):
        # Preserve IDs and styles while making the primary page heading semantic.
        document = re.sub(r'<h2([^>]*\bid="(?:gradeTitle|streamGradeTitle|subjectTitle|termTitle|paperTitle)"[^>]*)>([\s\S]*?)</h2>', r'<h1\1>\2</h1>', document, count=1)
    return document.replace('href="schemes.html"', 'href="scheme.html"').replace('href="index.html"', 'href="/"')


def sitemap_urls(source, records):
    urls = {ORIGIN + ('/' if name == 'index.html' else '/' + name) for name in PUBLIC_PAGES if (source / name).exists()}
    urls.update(ORIGIN + record['path'] for record in records)
    for grade in range(1, 14):
        data = read_data(source, f'grade{grade}.json')
        if (source / 'grade.html').exists():
            urls.add(ORIGIN + '/grade.html?' + urlencode({'grade': grade}))
        groups = [('', data['subjects'])] if 'subjects' in data else list(data.get('streamSubjects', {}).items())
        for stream, subjects in groups:
            base = dict(grade=str(grade))
            if stream:
                base['stream'] = stream
                if (source / 'stream.html').exists():
                    urls.add(ORIGIN + '/stream.html?' + urlencode(base))
            for subject, terms in subjects.items():
                query = {**base, 'subject': subject}
                populated = [(term, items) for term, items in terms.items() if isinstance(items, list) and any(isinstance(item, dict) and safe_url(item.get('pdf')) for item in items)]
                if populated and (source / 'subject.html').exists():
                    urls.add(ORIGIN + '/subject.html?' + urlencode(query))
                if (source / 'term.html').exists():
                    for term, _ in populated:
                        params = {**query, **({'type': 'worksheet'} if term == 'worksheets' else {'term': term})}
                        urls.add(ORIGIN + '/term.html?' + urlencode(params))
    return sorted(urls)


def escape(value):
    return html.escape(str(value or ''), quote=True)


def safe_url(value):
    value = str(value or '').strip()
    if not value or any(ord(c) < 32 for c in value):
        return ''
    absolute = urljoin(ORIGIN + '/', value)
    parts = urlsplit(absolute)
    if parts.scheme not in ('http', 'https') or not parts.netloc or parts.username:
        return ''
    return absolute


def content_id(kind, identity):
    return kind + ':' + hashlib.sha256(str(identity).encode('utf-8')).hexdigest()


def read_data(root, name):
    return json.loads((root / 'assets/data' / name).read_text(encoding='utf-8'))


def collect(root):
    records = {}

    def add(kind, identity, title, description, legacy, **extra):
        cid = content_id(kind, identity)
        record = records.setdefault(cid, dict(
            id=cid, kind=kind, title=title, description=description,
            image=safe_url(extra.get('image')) or ORIGIN + '/assets/images/icon-512.png',
            path='/content/' + cid.replace(':', '-') + '/', aliases=[], **{
                k: v for k, v in extra.items() if k != 'image'
            }))
        record['aliases'].append(legacy)

    for grade in range(1, 14):
        data = read_data(root, f'grade{grade}.json')
        groups = [('', data['subjects'])] if 'subjects' in data else list(data.get('streamSubjects', {}).items())
        for stream, subjects in groups:
            for subject, terms in subjects.items():
                for term, items in terms.items():
                    if not isinstance(items, list):
                        continue
                    kind = 'worksheet' if term == 'worksheets' else 'paper'
                    for index, item in enumerate(items):
                        pdf = safe_url(item.get('pdf'))
                        if not pdf:
                            continue
                        query = dict(grade=str(grade), stream=stream, subject=subject, paper=str(index))
                        query.update(type='worksheet') if kind == 'worksheet' else query.update(term=term)
                        title = item.get('title') or f'Grade {grade} {subject}'
                        details = item.get('paperDetails') if isinstance(item.get('paperDetails'), dict) else {}
                        fields = [f'Grade {grade}', str(subject)]
                        if stream:
                            fields.append(str(stream))
                        fields.append('Worksheet' if kind == 'worksheet' else f'Term {term} exam paper')
                        for field in ('year', 'publisher', 'medium'):
                            value = details.get(field)
                            if isinstance(value, (str, int)) and not isinstance(value, bool) and str(value).strip():
                                fields.append(str(value).strip())
                        description = ' | '.join(fields) + '. View or download the PDF free on SLExam Pro.'
                        add(kind, pdf, title, description, 'paper.html?' + urlencode(query), pdf=pdf,
                            date=item.get('addedAt', ''), grade=grade, subject=subject,
                            term=term, stream=stream, paper_details=item.get('paperDetails', {}))
    for index, item in enumerate(read_data(root, 'news.json').get('news', [])):
        add('news', item.get('id') or item.get('title', '') + '\n' + item.get('date', ''),
            item.get('title', 'News'), item.get('description', ''), f'news-detail.html?id={index}',
            image=item.get('image'), body=item.get('content', ''), date=item.get('date', ''), link=safe_url(item.get('link')))
    for item in read_data(root, 'schemes.json').get('schemes', []):
        pdf = safe_url(item.get('url') or item.get('pdf'))
        if not pdf:
            continue
        query = urlencode(dict(grade=item.get('grade', ''), subject=item.get('subject', '')))
        add('scheme', item.get('id') or pdf, item.get('title', 'Scheme'),
            f"Grade {item.get('grade', '')} • {item.get('subject', '')} • Scheme | SLExam Pro",
            'scheme-view.html?' + query, pdf=pdf, date=item.get('date', ''))
    for item in read_data(root, 'apps.json').get('apps', []):
        add('app', item['id'], item.get('name', 'Education App'), item.get('demo') or item.get('description', ''),
            'app-detail.html?' + urlencode(dict(id=item['id'])),
            image=item.get('mainImage') or item.get('image'), body=item.get('description', ''),
            previews=[safe_url(x) for x in item.get('previewImages', []) if safe_url(x)],
            links={label: safe_url(item.get(key)) for label, key in (
                ('Google Play', 'playStore'), ('Download', 'download'), ('Website', 'website')) if safe_url(item.get(key))})
    make_paper_descriptions_unique(records.values())
    return list(records.values())


def make_paper_descriptions_unique(records):
    """Prefer actual paper titles; number indistinguishable PDF options last.

    Option numbers are positions in a stable URL-sorted group, not invented
    exam editions or years. Never display opaque resource hashes to students.
    """
    papers = [r for r in records if r['kind'] in ('paper', 'worksheet')]
    groups = {}
    for record in papers:
        groups.setdefault(record['description'], []).append(record)
    for group in groups.values():
        if len(group) < 2:
            continue
        for record in group:
            title = str(record.get('title') or '').strip()
            if title and title.casefold() not in record['description'].casefold():
                record['description'] = title + '. ' + record['description']
    # A real title may still be shared by multiple PDFs. Give each PDF a
    # truthful, stable option number rather than an opaque hash or fake date.
    groups = {}
    for record in papers:
        groups.setdefault(record['description'], []).append(record)
    for group in groups.values():
        if len(group) < 2:
            continue
        for number, record in enumerate(sorted(group, key=lambda r: r['id']), 1):
            record['description'] += f' PDF option {number} of {len(group)}.'
    descriptions = [r['description'] for r in papers]
    if len(descriptions) != len(set(descriptions)):
        raise ValueError('Paper meta descriptions must be unique')


def paragraphs(text):
    return ''.join('<p>' + escape(p).replace('\n', '<br>') + '</p>' for p in str(text).split('\n\n') if p.strip())


def resource_ids(filename, data):
    """Use the same identities as collect() when inspecting old JSON snapshots."""
    found = set()
    if re.fullmatch(r'grade\d+\.json', filename):
        groups = [data['subjects']] if 'subjects' in data else data.get('streamSubjects', {}).values()
        for subjects in groups:
            for terms in subjects.values():
                if not isinstance(terms, dict):
                    continue
                for term, items in terms.items():
                    if not isinstance(items, list):
                        continue
                    kind = 'worksheet' if term == 'worksheets' else 'paper'
                    for item in items:
                        if isinstance(item, dict) and (pdf := safe_url(item.get('pdf'))):
                            found.add(content_id(kind, pdf))
    elif filename == 'news.json':
        for item in data.get('news', []):
            found.add(content_id('news', item.get('id') or item.get('title', '') + '\n' + item.get('date', '')))
    elif filename == 'schemes.json':
        for item in data.get('schemes', []):
            if pdf := safe_url(item.get('url') or item.get('pdf')):
                found.add(content_id('scheme', item.get('id') or pdf))
    elif filename == 'apps.json':
        for item in data.get('apps', []):
            if item.get('id'):
                found.add(content_id('app', item['id']))
    return found


def resource_added_dates(source):
    """Recover publication times from additions on the current first-parent history.

    A title edit/reorder keeps its existing date. Removal followed by re-addition
    gets the new addition time. Do not use exam years or news publication dates
    as a substitute for repository upload time.
    """
    top = subprocess.run(['git', '-C', str(source), 'rev-parse', '--show-toplevel'], capture_output=True, text=True)
    if top.returncode or Path(top.stdout.strip()).resolve() != source.resolve():
        print('No repository history: recent sections will not guess upload dates')
        return {}
    shallow = subprocess.run(['git', '-C', str(source), 'rev-parse', '--is-shallow-repository'], capture_output=True, text=True, check=True)
    if shallow.stdout.strip() == 'true':
        raise ValueError('Complete Git history is required for upload ordering; use checkout fetch-depth: 0')
    history = subprocess.run([
        'git', '-C', str(source), 'log', '--first-parent', '--reverse',
        '--format=%H%x00%cI', '--name-only', '--', 'assets/data/'
    ], capture_output=True, text=True, check=True)
    dates, previous = {}, {}
    commit, timestamp = None, None
    for line in history.stdout.splitlines():
        if '\x00' in line:
            commit, timestamp = line.split('\x00', 1)
            continue
        path = line.strip()
        if not commit or not path or not re.fullmatch(r'assets/data/(grade\d+|news|schemes|apps)\.json', path):
            continue
        snapshot = subprocess.run(['git', '-C', str(source), 'show', f'{commit}:{path}'], capture_output=True, text=True)
        if snapshot.returncode:
            current = set()  # Deleted file.
        else:
            try:
                data = json.loads(snapshot.stdout)
                current = resource_ids(Path(path).name, data)
            except (ValueError, TypeError, AttributeError, KeyError):
                continue  # An invalid intermediate JSON snapshot was never a valid publication.
        for identity in current - previous.get(path, set()):
            dates[identity] = timestamp
        previous[path] = current
    return dates


def recent_feed(records, dates, limit=3):
    feed = {}
    for kind in ('paper', 'worksheet', 'news', 'scheme', 'app'):
        dated = []
        for record in records:
            if record['kind'] != kind or not dates.get(record['id']):
                continue
            try:
                added = datetime.fromisoformat(dates[record['id']].replace('Z', '+00:00'))
                if added.tzinfo is None:
                    continue
                dated.append((added.astimezone(timezone.utc), record))
            except (ValueError, TypeError):
                continue
        dated.sort(key=lambda pair: (pair[0], pair[1]['id']), reverse=True)
        feed[kind] = [dict(
            id=r['id'], title=r['title'], path=r['path'],
            description=r['description'][:180], addedAt=dates[r['id']]
        ) for _, r in dated[:limit]]
    return feed


def prepare_share_image(source, output, image_url):
    """Encode a small social derivative; preserve the original page image."""
    parts = urlsplit(image_url)
    if parts.netloc != urlsplit(ORIGIN).netloc:
        return {}
    original = (source / unquote(parts.path).lstrip('/')).resolve()
    if not original.is_relative_to(source.resolve()) or not original.is_file():
        original = source / 'assets/images/icon-512.png'
    if not original.is_file():
        return {}
    raw = original.read_bytes()
    digest = hashlib.sha256(b'social-jpeg-v1\n' + raw).hexdigest()[:24]
    relative = 'assets/images/share/' + digest + '.jpg'
    destination = output / relative
    destination.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(io.BytesIO(raw)) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGBA')
        flattened = Image.new('RGB', image.size, 'white')
        flattened.paste(image, mask=image.getchannel('A'))
    # Letterbox instead of cropping text out of posters. Baseline JPEG is widely readable.
    for width, height in ((1200, 630), (1000, 525), (800, 420), (600, 315)):
        contained = ImageOps.contain(flattened, (width, height), Image.Resampling.LANCZOS)
        canvas = Image.new('RGB', (width, height), 'white')
        canvas.paste(contained, ((width - contained.width) // 2, (height - contained.height) // 2))
        for quality in (82, 72, 62, 52, 42):
            encoded = io.BytesIO()
            canvas.save(encoded, format='JPEG', quality=quality, optimize=True, progressive=False)
            if encoded.tell() <= 200_000:
                destination.write_bytes(encoded.getvalue())
                print(f'Share JPEG: {original.name}: {len(raw)} -> {encoded.tell()} bytes ({width}x{height})')
                return dict(share_image=ORIGIN + '/' + relative, image_width=width, image_height=height)
    raise ValueError('Could not encode a bounded share image: ' + str(original))


def prepare_display_image(source, output, image_url):
    """Create responsive WebP variants for visible news/app media, without upscaling."""
    parts = urlsplit(image_url)
    if parts.netloc != urlsplit(ORIGIN).netloc:
        return {}
    original = (source / unquote(parts.path).lstrip('/')).resolve()
    if not original.is_relative_to(source.resolve()) or not original.is_file():
        return {}
    raw = original.read_bytes()
    digest = hashlib.sha256(b'display-webp-v1-quality85\n' + raw).hexdigest()[:24]
    with Image.open(io.BytesIO(raw)) as opened:
        image = ImageOps.exif_transpose(opened).convert('RGBA')
    widths = sorted({width for width in (320, 640, 960, 1280) if width < image.width} | {min(image.width, 1280)})
    variants = []
    for width in widths:
        height = max(1, round(image.height * width / image.width))
        resized = image.resize((width, height), Image.Resampling.LANCZOS)
        relative = f'assets/images/optimized/{digest}-{width}.webp'
        target = output / relative
        target.parent.mkdir(parents=True, exist_ok=True)
        resized.save(target, format='WEBP', quality=85, method=6)
        variants.append(dict(src='/' + relative, width=width, height=height))
    typical = next((v for v in variants if v['width'] >= 640), variants[-1])
    typical_bytes = (output / typical['src'].lstrip('/')).stat().st_size
    print(f'Display WebP: {original.name}: {len(raw)} -> {typical_bytes} bytes at {typical["width"]}px; {len(variants)} sizes')
    return dict(sources=variants)


def display_image_attributes(metadata, fallback, sizes):
    sources = metadata.get('sources', []) if metadata else []
    if not sources:
        return f'src="{escape(fallback)}" decoding="async"'
    default = next((v for v in sources if v['width'] >= 640), sources[-1])
    srcset = ', '.join(v['src'] + ' ' + str(v['width']) + 'w' for v in sources)
    return f'src="{escape(default["src"])}" srcset="{escape(srcset)}" sizes="{escape(sizes)}" width="{default["width"]}" height="{default["height"]}" decoding="async"'


def paper_detail_rows(record):
    """Use source fields only; never infer exam year or publisher from filenames."""
    details = record.get('paper_details')
    details = details if isinstance(details, dict) else {}
    rows = []
    def text(label, value):
        if isinstance(value, (str, int)) and not isinstance(value, bool) and str(value).strip():
            rows.append((label, str(value).strip()))
    text('வகுப்பு', record.get('grade'))
    text('பாடம்', record.get('subject'))
    text('பிரிவு', record.get('stream'))
    exam = details.get('exam')
    if not isinstance(exam, str) or not exam.strip():
        term = str(record.get('term', ''))
        exam = 'செயலட்டை' if record['kind'] == 'worksheet' else ({'1': 'முதலாம் தவணை', '2': 'இரண்டாம் தவணை', '3': 'மூன்றாம் தவணை'}.get(term))
    text('வகை / தவணை', exam)
    for label, field in [('ஆண்டு', 'year'), ('வெளியிட்ட அமைப்பு', 'publisher'), ('மொழிமூலம்', 'medium')]:
        text(label, details.get(field))
    for label, field, suffix in [('நேரம்', 'durationMinutes', ' நிமிடங்கள்'), ('பக்கங்கள்', 'pages', '')]:
        value = details.get(field)
        if isinstance(value, int) and not isinstance(value, bool) and value > 0:
            text(label, str(value) + suffix)
    return rows


def render_paper_details(record):
    if record['kind'] not in ('paper', 'worksheet'):
        return ''
    rows = ''.join('<tr><th scope="row">' + escape(label) + '</th><td>' + escape(value) + '</td></tr>' for label, value in paper_detail_rows(record))
    return '<section class="paper-details" lang="ta"><h2>வினாத்தாள் விவரங்கள்</h2><table><caption class="sr-only">இந்தப் பதிவில் கிடைக்கும் வினாத்தாள் தகவல்கள்</caption><tbody>' + rows + '</tbody></table></section>'


def render(record, header, footer):
    # Resource pages have an h1 but no enclosing h2 before the footer sections.
    footer = footer.replace('<h3>', '<h2>').replace('</h3>', '</h2>')
    title, description = escape(record['title']), escape(record['description'][:300])
    canonical = ORIGIN + record['path']
    body = render_paper_details(record)
    if record['kind'] in ('paper', 'worksheet', 'scheme'):
        pdf = record['pdf']
        preview = pdf
        match = re.search(r'drive\.google\.com/file/d/([A-Za-z0-9_-]+)', pdf)
        if match:
            preview = 'https://drive.google.com/file/d/' + match[1] + '/preview'
        body += f'<p><a class="resource-button" href="{escape(pdf)}" target="_blank" rel="noopener noreferrer">📄 Open PDF / Download</a></p>'
        body += f'<iframe class="resource-pdf" src="{escape(preview)}" title="{title}" loading="lazy"></iframe>'
    else:
        attrs = display_image_attributes(record.get('display_image'), record['image'], '(max-width: 700px) 92vw, 640px')
        body += f'<img class="resource-cover" {attrs} alt="{title}" fetchpriority="high">'
        body += paragraphs(record.get('body') or record['description'])
        if record.get('link'):
            body += f'<p><a class="resource-button" href="{escape(record["link"])}" target="_blank" rel="noopener noreferrer">Official link</a></p>'
        for label, target in record.get('links', {}).items():
            body += f'<p><a class="resource-button" href="{escape(target)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a></p>'
        for image in record.get('previews', []):
            attrs = display_image_attributes(record.get('display_previews', {}).get(image), image, '(max-width: 700px) 92vw, 640px')
            body += f'<img class="resource-preview" {attrs} alt="{title} preview" loading="lazy">'
    social_type = 'article' if record['kind'] == 'news' else 'website'
    share_image = record.get('share_image', record['image'])
    image_details = ''
    if record.get('image_width'):
        image_details = f'''<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="{record['image_width']}">
<meta property="og:image:height" content="{record['image_height']}">'''
    breadcrumbs = '<nav class="seo-breadcrumb" aria-label="Breadcrumb"><ol>' + ''.join(
        '<li>' + (f'<span aria-current="page">{escape(name)}</span>' if i == len(breadcrumbs_for(record)) - 1 else f'<a href="{escape(target)}">{escape(name)}</a>') + '</li>'
        for i, (name, target) in enumerate(breadcrumbs_for(record))
    ) + '</ol></nav>'
    publication = ''
    if record['kind'] == 'news':
        try:
            date = datetime.fromisoformat(str(record.get('date') or '').replace('Z', '+00:00'))
            publication = f'<p class="publication-date">Published <time datetime="{escape(record["date"])}">{date.strftime("%d %b %Y")}</time></p>'
        except (ValueError, TypeError):
            pass
    return f'''<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<base href="/">
<title>{title} | SLExam Pro</title>
<meta name="description" content="{description}">
<link rel="canonical" href="{escape(canonical)}">
<meta property="og:site_name" content="SLExam Pro">
<meta property="og:type" content="{social_type}">
<meta property="og:title" content="{title}">
<meta property="og:description" content="{description}">
<meta property="og:url" content="{escape(canonical)}">
<meta property="og:image" content="{escape(share_image)}">
<meta property="og:image:secure_url" content="{escape(share_image)}">
{image_details}
<meta property="og:image:alt" content="{title}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{escape(share_image)}">
{json_ld(resource_schema(record))}
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/social.css">
</head><body>{header}
<main class="resource-page" data-content-id="{escape(record['id'])}">
{breadcrumbs}
<h1>{title}</h1>{publication}<p>{description}</p>
<div id="contentActions"></div>
{body}
</main>{footer}
<script src="assets/js/app.js" defer></script>
<script src="assets/js/social.js" defer></script>
</body></html>'''


def build(source, output):
    source, output = source.resolve(), output.resolve()
    if source == output or output in source.parents:
        raise ValueError('Output must not contain or replace the source directory')
    if output.exists():
        shutil.rmtree(output)
    shutil.copytree(source, output, ignore=shutil.ignore_patterns('.git', '.github', '__pycache__', 'tests', 'scripts', '_site', output.name, 'node_modules'))
    home = (source / 'index.html').read_text(encoding='utf-8')
    header = re.search(r'<header\b[\s\S]*?</header>', home).group()
    footer = re.search(r'<footer\b[\s\S]*?</footer>', home).group()
    records = collect(source)
    upload_dates = resource_added_dates(source)
    index = []
    image_cache = {}
    display_cache = {}
    references = {r['image'] for r in records if r['kind'] in ('news', 'app')}
    references.update(image for r in records for image in r.get('previews', []))
    for image in sorted(references):
        display_cache[image] = prepare_display_image(source, output, image)
    # Enrich only deployed JSON; keep original fields and repository data intact.
    for filename, key in (('news.json', 'news'), ('apps.json', 'apps')):
        database = read_data(source, filename)
        for item in database.get(key, []):
            if key == 'news':
                metadata = display_cache.get(safe_url(item.get('image')))
                if metadata:
                    item['imageVariants'] = metadata
            else:
                metadata = display_cache.get(safe_url(item.get('mainImage') or item.get('image')))
                if metadata:
                    item['mainImageVariants'] = metadata
                item['previewImageVariants'] = [display_cache.get(safe_url(image), {}) for image in item.get('previewImages', [])]
        (output / 'assets/data' / filename).write_text(json.dumps(database, ensure_ascii=False, indent=2), encoding='utf-8')
    for record in records:
        record['display_image'] = display_cache.get(record['image'], {})
        record['display_previews'] = {image: display_cache.get(image, {}) for image in record.get('previews', [])}
        if record['image'] not in image_cache:
            image_cache[record['image']] = prepare_share_image(source, output, record['image'])
        record.update(image_cache[record['image']])
        record['shareVersion'] = hashlib.sha256((record.get('share_image', record['image']) + '\n' + record['title'] + '\n' + record['description']).encode()).hexdigest()[:12]
        page = output / record['path'].strip('/') / 'index.html'
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(render(record, header, footer), encoding='utf-8')
        index.append({k: record[k] for k in ('id', 'kind', 'title', 'description', 'path', 'aliases', 'shareVersion')})
    (output / 'assets/data/content-index.json').write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')
    (output / 'assets/data/recent-content.json').write_text(json.dumps(recent_feed(records, upload_dates), ensure_ascii=False), encoding='utf-8')
    print(f'Upload dates recovered for {sum(r["id"] in upload_dates for r in records)}/{len(records)} resources')
    urls = ''.join('<url><loc>' + escape(target) + '</loc></url>\n' for target in sitemap_urls(source, records))
    (output / 'sitemap.xml').write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '</urlset>\n', encoding='utf-8')
    (output / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + ORIGIN + '/sitemap.xml\n', encoding='utf-8')
    for page in output.glob('*.html'):
        page.write_text(update_html_seo(page.read_text(encoding='utf-8'), page.name), encoding='utf-8')
    home = output / 'index.html'
    home.write_text(inline_home_styles(home.read_text(encoding='utf-8'), source), encoding='utf-8')
    # Give changed JS/CSS new URLs so returning browsers do not retain old code.
    versions = {
        p.relative_to(output).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()[:12]
        for folder in ('assets/js', 'assets/css')
        for p in (output / folder).glob('*') if p.is_file()
    }
    pattern = re.compile(r'''(["'])(/?assets/(?:js|css)/[^"'?]+\.(?:js|css))(?:\?[^"']*)?\1''')
    def version_asset(match):
        version = versions.get(match[2].lstrip('/'))
        return match[1] + match[2] + '?v=' + version + match[1] if version else match[0]
    for page in output.rglob('*.html'):
        page.write_text(pattern.sub(version_asset, page.read_text(encoding='utf-8')), encoding='utf-8')
    print(f'Built {len(records)} resource pages into {output}')
    return records


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=Path('.'))
    parser.add_argument('--output', type=Path, default=Path('_site'))
    args = parser.parse_args()
    build(args.source, args.output)
