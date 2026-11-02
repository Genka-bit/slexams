import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from xml.etree import ElementTree

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build_site.py')
builder = importlib.util.module_from_spec(spec)
spec.loader.exec_module(builder)


class StaticPagesTest(unittest.TestCase):
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
                self.assertIn('data-content-id="' + record['id'] + '"', page)
                self.assertIn('href="' + builder.ORIGIN + record['path'] + '"', page)
            tree = ElementTree.parse(output / 'sitemap.xml')
            urls = {x.text for x in tree.findall('.//{*}loc')}
            self.assertTrue({builder.ORIGIN + r['path'] for r in records} <= urls)

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
