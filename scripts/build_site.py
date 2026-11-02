"""Build static resource pages with crawler-readable social metadata (stdlib only)."""
import argparse
import hashlib
import html
import json
import re
import shutil
from pathlib import Path
from urllib.parse import quote, urlencode, urljoin, urlsplit

ORIGIN = 'https://slexams.site'


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
                        description = f'Grade {grade} • {subject} • ' + ('Worksheet' if kind == 'worksheet' else f'Term {term} exam paper') + ' | SLExam Pro'
                        add(kind, pdf, title, description, 'paper.html?' + urlencode(query), pdf=pdf,
                            date=item.get('addedAt', ''), grade=grade, subject=subject)
    for index, item in enumerate(read_data(root, 'news.json').get('news', [])):
        add('news', item.get('id') or item.get('title', '') + '\n' + item.get('date', ''),
            item.get('title', 'Education News'), item.get('description', ''), f'news-detail.html?id={index}',
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
    return list(records.values())


def paragraphs(text):
    return ''.join('<p>' + escape(p).replace('\n', '<br>') + '</p>' for p in str(text).split('\n\n') if p.strip())


def render(record, header, footer):
    title, description = escape(record['title']), escape(record['description'][:300])
    canonical = ORIGIN + record['path']
    body = ''
    if record['kind'] in ('paper', 'worksheet', 'scheme'):
        pdf = record['pdf']
        preview = pdf
        match = re.search(r'drive\.google\.com/file/d/([A-Za-z0-9_-]+)', pdf)
        if match:
            preview = 'https://drive.google.com/file/d/' + match[1] + '/preview'
        body += f'<p><a class="resource-button" href="{escape(pdf)}" target="_blank" rel="noopener noreferrer">📄 Open PDF / Download</a></p>'
        body += f'<iframe class="resource-pdf" src="{escape(preview)}" title="{title}" loading="lazy"></iframe>'
    else:
        body += f'<img class="resource-cover" src="{escape(record["image"])}" alt="{title}" width="640" height="360">'
        body += paragraphs(record.get('body') or record['description'])
        if record.get('link'):
            body += f'<p><a class="resource-button" href="{escape(record["link"])}" target="_blank" rel="noopener noreferrer">Official link</a></p>'
        for label, target in record.get('links', {}).items():
            body += f'<p><a class="resource-button" href="{escape(target)}" target="_blank" rel="noopener noreferrer">{escape(label)}</a></p>'
        for image in record.get('previews', []):
            body += f'<img class="resource-preview" src="{escape(image)}" alt="{title} preview" loading="lazy" width="640" height="480">'
    social_type = 'article' if record['kind'] == 'news' else 'website'
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
<meta property="og:image" content="{escape(record['image'])}">
<meta property="og:image:alt" content="{title}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="{title}">
<meta name="twitter:description" content="{description}">
<meta name="twitter:image" content="{escape(record['image'])}">
<link rel="stylesheet" href="assets/css/style.css">
<link rel="stylesheet" href="assets/css/social.css">
</head><body>{header}
<main class="resource-page" data-content-id="{escape(record['id'])}">
<p><a href="index.html">← Home</a></p>
<h1>{title}</h1><p>{description}</p>
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
    index = []
    for record in records:
        page = output / record['path'].strip('/') / 'index.html'
        page.parent.mkdir(parents=True, exist_ok=True)
        page.write_text(render(record, header, footer), encoding='utf-8')
        index.append({k: record[k] for k in ('id', 'kind', 'title', 'description', 'path', 'aliases')})
    (output / 'assets/data/content-index.json').write_text(json.dumps(index, ensure_ascii=False), encoding='utf-8')
    original = (source / 'sitemap.xml').read_text(encoding='utf-8')
    urls = ''.join('<url><loc>' + escape(ORIGIN + r['path']) + '</loc></url>\n' for r in records)
    (output / 'sitemap.xml').write_text(original.replace('</urlset>', urls + '</urlset>'), encoding='utf-8')
    (output / 'robots.txt').write_text('User-agent: *\nAllow: /\nSitemap: ' + ORIGIN + '/sitemap.xml\n', encoding='utf-8')
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
