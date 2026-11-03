import importlib.util
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build_site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StaticPagesTest(unittest.TestCase):
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
