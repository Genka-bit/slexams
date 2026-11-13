import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
import re
from pathlib import Path
from xml.etree import ElementTree
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build_site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StaticPagesTest(unittest.TestCase):
    def test_home_inline_styles_preserve_cascade_ads_and_resource_fallback(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder)
            (source / 'assets/css').mkdir(parents=True)
            (source / 'assets/css/style.css').write_text('body { color: blue; }')
            (source / 'assets/css/social.css').write_text('.recent { color: red; }')
            document = '<head><link rel="stylesheet" href="assets/css/style.css"><style>body { color: green; }</style><script async src="https://example.com/ads.js"></script><link rel="stylesheet" href="assets/css/social.css"></head>'
            page = builder.inline_home_styles(document, source)
            self.assertNotIn('<link', page)
            self.assertLess(page.index('color: blue'), page.index('color: green'))
            self.assertLess(page.index('color: green'), page.index('color: red'))
            self.assertIn('<script async src="https://example.com/ads.js"></script>', page)
            (source / 'assets/css/style.css').write_text('body { background: url(../image.png); }')
            self.assertIn('<link rel="stylesheet" href="assets/css/style.css">', builder.inline_home_styles(document, source))

    def test_static_canonical_metadata_and_verification_are_preserved(self):
        source = '<html><head><title>Old</title><meta name="description" content="Old description"><meta name="google-adsense-account" content="keep-me"><meta name="monetag" content="keep-too"></head><body><h1>Home</h1></body></html>'
        page = builder.update_html_seo(source, 'index.html')
        self.assertEqual(page.count('rel="canonical"'), 1)
        self.assertIn('href="https://slexams.site/"', page)
        self.assertIn('content="keep-me"', page)
        self.assertIn('content="keep-too"', page)
        self.assertEqual(page.count('name="description"'), 1)
        data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)[1])
        self.assertTrue({'WebSite', 'Organization'} <= {item['@type'] for item in data['@graph']})
        for name in ('admin.html', 'search.html', 'viewer.html'):
            self.assertIn('content="noindex,follow"', builder.update_html_seo(source, name))
        category = builder.update_html_seo(source.replace('<h1>Home</h1>', '<h2 id="gradeTitle">Grade</h2>'), 'grade.html')
        self.assertNotIn('rel="canonical"', category)  # Runtime knows the grade query.
        self.assertIn('<h1 id="gradeTitle">', category)

    def test_resource_schema_and_visible_breadcrumbs_match(self):
        record = next(r for r in builder.collect(ROOT) if r['kind'] == 'news')
        page = builder.render(record, '', '')
        self.assertIn('aria-label="Breadcrumb"', page)
        self.assertIn('Published <time', page)
        data = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', page, re.S)[1])
        crumbs = next(item for item in data['@graph'] if item['@type'] == 'BreadcrumbList')['itemListElement']
        self.assertEqual([item['position'] for item in crumbs], list(range(1, len(crumbs) + 1)))
        for crumb in crumbs[:-1]:
            self.assertIn('href="' + builder.escape(crumb['item']) + '"', page)
        article = next(item for item in data['@graph'] if item['@type'] == 'NewsArticle')
        self.assertEqual(article['headline'], record['title'])
        self.assertNotIn('author', article)
        self.assertNotIn('datePublished', article)  # Only the date is known in current data.
        record['title'] = '</script><script>alert(1)</script>'
        self.assertNotIn('</script><script>alert(1)</script>', builder.json_ld(builder.resource_schema(record)))

    def test_sitemap_lists_canonicals_and_populated_categories_only(self):
        urls = builder.sitemap_urls(ROOT, builder.collect(ROOT))
        self.assertEqual(len(urls), len(set(urls)))
        self.assertIn(builder.ORIGIN + '/about.html', urls)
        self.assertIn(builder.ORIGIN + '/grade.html?grade=8', urls)
        self.assertTrue(any('/term.html?' in url and 'type=worksheet' in url for url in urls))
        self.assertFalse(any('/paper.html?' in url or '/news-detail.html?' in url for url in urls))
        self.assertFalse(any('/admin.html' in url or '/search.html' in url or '/viewer.html' in url for url in urls))

    def test_responsive_webp_sizes_and_original_preservation(self):
        with tempfile.TemporaryDirectory() as temp:
            source, output = Path(temp) / 'source', Path(temp) / 'output'
            image_path = source / 'assets/images/poster.png'
            image_path.parent.mkdir(parents=True)
            Image.new('RGB', (1500, 1000), (30, 90, 140)).save(image_path)
            original = image_path.read_bytes()
            metadata = builder.prepare_display_image(source, output, builder.ORIGIN + '/assets/images/poster.png')
            self.assertEqual([v['width'] for v in metadata['sources']], [320, 640, 960, 1280])
            for variant in metadata['sources']:
                with Image.open(output / variant['src'].lstrip('/')) as image:
                    self.assertEqual(image.format, 'WEBP')
                    self.assertEqual(image.size, (variant['width'], variant['height']))
                    self.assertAlmostEqual(image.height / image.width, 1000 / 1500, delta=0.003)
            self.assertEqual(image_path.read_bytes(), original)
            Image.new('RGBA', (120, 80), (40, 80, 120, 160)).save(image_path)
            small = builder.prepare_display_image(source, output, builder.ORIGIN + '/assets/images/poster.png')
            self.assertEqual([v['width'] for v in small['sources']], [120])
            self.assertEqual(builder.prepare_display_image(source, output, 'https://example.com/photo.jpg'), {})

    def test_deployed_media_metadata_keeps_original_json_and_share_jpeg(self):
        with tempfile.TemporaryDirectory() as temp:
            source, output = Path(temp) / 'source', Path(temp) / 'output'
            folder = source / 'assets/data'
            folder.mkdir(parents=True)
            for grade in range(1, 14):
                (folder / f'grade{grade}.json').write_text('{"subjects":{}}')
            item = dict(title='A poster', description='News', date='2026-01-01', image='assets/images/poster.png')
            (folder / 'news.json').write_text(json.dumps({'news': [item]}))
            for name in ('apps', 'schemes'):
                (folder / f'{name}.json').write_text(json.dumps({name: []}))
            (source / 'index.html').write_text('<html><header>Header</header><footer>Footer</footer></html>')
            (source / 'sitemap.xml').write_text('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>')
            image = source / item['image']
            image.parent.mkdir(parents=True)
            Image.new('RGB', (1000, 1500), 'white').save(image)
            before = (folder / 'news.json').read_bytes()
            records = builder.build(source, output)
            deployed = json.loads((output / 'assets/data/news.json').read_text())['news'][0]
            self.assertEqual(deployed['image'], item['image'])
            self.assertTrue(deployed['imageVariants']['sources'])
            self.assertEqual((folder / 'news.json').read_bytes(), before)
            page = (output / records[0]['path'].strip('/') / 'index.html').read_text()
            self.assertIn('srcset="/assets/images/optimized/', page)
            self.assertIn('sizes="(max-width: 700px) 92vw, 640px"', page)
            self.assertIn('og:image:type" content="image/jpeg"', page)
            self.assertIn('loading="lazy"', builder.render({**records[0], 'previews': ['https://example.com/preview.jpg']}, '', ''))

    def test_paper_details_use_only_known_fields_and_escape_text(self):
        record = next(r for r in builder.collect(ROOT) if r['kind'] == 'paper')
        minimal = {**record, 'title': '2024 Paper', 'term': '2', 'paper_details': {}}
        rows = dict(builder.paper_detail_rows(minimal))
        self.assertEqual(rows['வகை / தவணை'], 'இரண்டாம் தவணை')
        self.assertNotIn('ஆண்டு', rows)
        self.assertNotIn('வெளியிட்ட அமைப்பு', rows)
        self.assertNotIn('பக்கங்கள்', rows)
        hostile = {**minimal, 'paper_details': {'publisher': '<script>alert(1)</script>', 'pages': -1, 'durationMinutes': True}}
        markup = builder.render_paper_details(hostile)
        self.assertNotIn('<script>', markup)
        self.assertIn('&lt;script&gt;', markup)
        self.assertNotIn('நேரம்', markup)
        self.assertNotIn('பக்கங்கள்', markup)
        self.assertEqual(builder.render_paper_details({**record, 'kind': 'news'}), '')
        worksheet = {**minimal, 'kind': 'worksheet', 'term': 'worksheets'}
        self.assertEqual(dict(builder.paper_detail_rows(worksheet))['வகை / தவணை'], 'செயலட்டை')

    def test_verified_sample_metadata_preserves_resource_identity(self):
        expected = 'paper:ac3f68111aff23e851ea32b9102370f787140127aac4961fff04a409b3bea1f4'
        sample = next(r for r in builder.collect(ROOT) if r['id'] == expected)
        rows = dict(builder.paper_detail_rows(sample))
        self.assertEqual(rows['ஆண்டு'], '2021 (2022)')
        self.assertEqual(rows['பக்கங்கள்'], '4')
        self.assertEqual(rows['நேரம்'], '120 நிமிடங்கள்')
        self.assertEqual(rows['வகை / தவணை'], 'இறுதிக் கணிப்பீடு')
        self.assertEqual(sample['path'], '/content/' + expected.replace(':', '-') + '/')
        markup = builder.render(sample, '', '')
        self.assertIn('scope="row"', markup)
        self.assertIn(sample['pdf'], markup)
        self.assertIn('<iframe', markup)

    def test_google_ad_serving_is_paused_but_verification_remains(self):
        for page in ROOT.glob('*.html'):
            document = page.read_text()
            self.assertNotIn('pagead2.googlesyndication.com/pagead/js/adsbygoogle.js', document, page.name)
            self.assertNotIn('class="adsbygoogle"', document, page.name)
            self.assertNotRegex(document, r'adsbygoogle\s*=')
        home = (ROOT / 'index.html').read_text()
        self.assertIn('name="google-adsense-account"', home)
        self.assertIn('ca-pub-6650578728997048', home)
        self.assertIn('nap5k.com/tag.min.js', (ROOT / 'paper.html').read_text())

    def test_current_resource_id_collectors_match(self):
        ids = set()
        for path in (ROOT / 'assets/data').glob('*.json'):
            ids.update(builder.resource_ids(path.name, json.loads(path.read_text())))
        self.assertEqual(ids, {r['id'] for r in builder.collect(ROOT)})

    def test_upload_dates_ignore_reorders_and_content_dates(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            def git(*args, **kwargs):
                return subprocess.run(['git', '-C', str(root), *args], check=True, capture_output=True, text=True, **kwargs)
            git('init', '-q')
            git('config', 'user.name', 'Test')
            git('config', 'user.email', 'test@example.invalid')
            folder = root / 'assets/data'
            folder.mkdir(parents=True)
            def publish(filename, data, timestamp):
                (folder / filename).write_text(json.dumps(data))
                git('add', 'assets/data')
                git('commit', '-qm', 'Update data', env={**os.environ, 'GIT_AUTHOR_DATE': timestamp, 'GIT_COMMITTER_DATE': timestamp})
            first = {'title': 'Old paper', 'pdf': 'assets/pdf/old.pdf'}
            second = {'title': 'Newer grade 1 paper', 'pdf': 'assets/pdf/new.pdf'}
            publish('grade11.json', {'subjects': {'Math': {'1': [first]}}}, '2026-01-01T12:00:00+00:00')
            publish('grade1.json', {'subjects': {'Tamil': {'1': [second]}}}, '2026-01-02T12:00:00+00:00')
            publish('grade11.json', {'subjects': {'Math': {'1': [{**first, 'title': 'Renamed old paper'}]}}}, '2026-01-03T12:00:00+00:00')
            publish('news.json', {'news': [{'id': 'news-stable', 'title': 'News', 'date': '2099-01-01'}]}, '2026-01-04T12:00:00+00:00')
            dates = builder.resource_added_dates(root)
            old_id = builder.content_id('paper', builder.safe_url(first['pdf']))
            new_id = builder.content_id('paper', builder.safe_url(second['pdf']))
            self.assertEqual(dates[old_id].replace('Z', '+00:00'), '2026-01-01T12:00:00+00:00')
            self.assertEqual(dates[new_id].replace('Z', '+00:00'), '2026-01-02T12:00:00+00:00')
            self.assertEqual(dates[builder.content_id('news', 'news-stable')].replace('Z', '+00:00'), '2026-01-04T12:00:00+00:00')
            records = [dict(id=old_id, kind='paper', title='Old', description='', path='/old'), dict(id=new_id, kind='paper', title='New', description='', path='/new')]
            self.assertEqual([r['id'] for r in builder.recent_feed(records, dates)['paper']], [new_id, old_id])
            # Re-adding a removed item is a fresh addition, but a rename is not.
            publish('grade11.json', {'subjects': {'Math': {'1': []}}}, '2026-01-05T12:00:00+00:00')
            publish('grade11.json', {'subjects': {'Math': {'1': [first]}}}, '2026-01-06T12:00:00+00:00')
            self.assertEqual(builder.resource_added_dates(root)[old_id].replace('Z', '+00:00'), '2026-01-06T12:00:00+00:00')

    def test_unknown_dates_are_not_labelled_recent(self):
        record = dict(id='unknown', kind='paper', title='Unknown', description='', path='/unknown')
        self.assertEqual(builder.recent_feed([record], {})['paper'], [])

    def test_share_jpeg_is_small_and_metadata_preserves_original(self):
        with tempfile.TemporaryDirectory() as temp:
            source, output = Path(temp) / 'source', Path(temp) / 'output'
            original = source / 'assets/images/news/poster.png'
            original.parent.mkdir(parents=True)
            Image.new('RGBA', (1600, 2000), (20, 80, 120, 180)).save(original)
            original_bytes = original.read_bytes()
            details = builder.prepare_share_image(source, output, builder.ORIGIN + '/assets/images/news/poster.png')
            target = output / details['share_image'].removeprefix(builder.ORIGIN + '/')
            self.assertLessEqual(target.stat().st_size, 200_000)
            with Image.open(target) as image:
                self.assertEqual(image.format, 'JPEG')
                self.assertEqual(image.size, (details['image_width'], details['image_height']))
            self.assertEqual(original.read_bytes(), original_bytes)
            record = next(r for r in builder.collect(ROOT) if r['kind'] == 'news')
            original_url = record['image']
            record.update(details)
            page = builder.render(record, '', '')
            self.assertIn('og:image:type" content="image/jpeg', page)
            self.assertIn('og:image:width" content="1200', page)
            self.assertIn('src="' + original_url + '"', page)
            self.assertIn('og:image" content="' + details['share_image'] + '"', page)

    def test_paper_descriptions_prefer_real_titles(self):
        records = [
            dict(kind='paper', id='paper:a', title='Northern Province 2024 Maths',
                 description='Grade 10 | Maths | Term 1. Free PDF.'),
            dict(kind='paper', id='paper:b', title='Western Province 2023 Maths',
                 description='Grade 10 | Maths | Term 1. Free PDF.'),
        ]
        builder.make_paper_descriptions_unique(records)
        self.assertEqual(len({r['description'] for r in records}), 2)
        self.assertIn('Northern Province 2024 Maths', records[0]['description'])
        self.assertIn('Western Province 2023 Maths', records[1]['description'])
        self.assertNotIn('Resource reference:', records[0]['description'])

    def test_identical_titles_get_stable_pdf_option_labels(self):
        records = [
            dict(kind='paper', id='paper:b', title='Maths', description='Grade 10 | Maths.'),
            dict(kind='paper', id='paper:a', title='Maths', description='Grade 10 | Maths.'),
            dict(kind='paper', id='paper:c', title='Science', description='Grade 10 | Science.'),
        ]
        builder.make_paper_descriptions_unique(records)
        self.assertEqual(len({r['description'] for r in records}), 3)
        self.assertIn('PDF option 1 of 2', records[1]['description'])
        self.assertIn('PDF option 2 of 2', records[0]['description'])
        self.assertEqual(records[2]['description'], 'Grade 10 | Science.')

    def test_all_source_paper_meta_descriptions_are_unique(self):
        records = builder.collect(ROOT)
        papers = [r for r in records if r['kind'] in ('paper', 'worksheet')]
        descriptions = [r['description'] for r in papers]
        self.assertEqual(len(descriptions), len(set(descriptions)))
        self.assertTrue(all('Resource reference:' not in d for d in descriptions))

    def test_identity_does_not_depend_on_list_position(self):
        records = builder.collect(ROOT)
        self.assertEqual(len(records), len({r['id'] for r in records}))
        self.assertTrue(all(len(r['id']) <= 160 for r in records))
        self.assertTrue({'paper', 'worksheet', 'news', 'scheme', 'app'} <= {r['kind'] for r in records})
        item = next(r for r in records if r['kind'] == 'paper')
        self.assertEqual(item['id'], builder.content_id('paper', item['pdf']))
        self.assertNotEqual(builder.content_id('paper', item['pdf']), builder.content_id('worksheet', item['pdf']))

    def test_static_metadata_and_sitemap(self):
        with tempfile.TemporaryDirectory() as temp:
            output = Path(temp) / 'site'
            records = builder.build(ROOT, output)
            index = json.loads((output / 'assets/data/content-index.json').read_text())
            self.assertEqual(len(records), len(index))
            for record in records:
                page = (output / record['path'].strip('/') / 'index.html').read_text()
                self.assertIn('property="og:title" content="' + builder.escape(record['title']) + '"', page)
                self.assertIn('property="og:image"', page)
                self.assertIn('assets/js/app.js?v=', page)
                self.assertIn('data-content-id="' + record['id'] + '"', page)
                self.assertIn('href="' + builder.ORIGIN + record['path'] + '"', page)
            tree = ElementTree.parse(output / 'sitemap.xml')
            urls = {x.text for x in tree.findall('.//{*}loc')}
            self.assertTrue({builder.ORIGIN + r['path'] for r in records} <= urls)
            self.assertIn('assets/js/app.js?v=', (output / 'index.html').read_text())

    def test_markup_and_url_injection(self):
        self.assertEqual(builder.safe_url('javascript:alert(1)'), '')
        self.assertEqual(builder.safe_url('data:text/html,test'), '')
        self.assertEqual(builder.safe_url('https://user:secret@example.com/file'), '')
        record = next(r for r in builder.collect(ROOT) if r['kind'] == 'news')
        record['title'] = '\"><script>alert(1)</script>'
        record['body'] = '<img src=x onerror=alert(1)>'
        page = builder.render(record, '', '')
        self.assertNotIn('<script>alert(1)</script>', page)
        self.assertNotIn('<img src=x', page)
        self.assertIn('&lt;script&gt;', page)


if __name__ == '__main__':
    unittest.main()
