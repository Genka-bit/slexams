const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.attributes = {}; }
    append(...nodes) { this.children.push(...nodes); }
    replaceChildren(...nodes) { this.children = nodes; }
    setAttribute(key, value) { this.attributes[key] = value; }
}
const ids = ['recentPapers', 'recentWorksheets', 'recentNews', 'recentSchemes', 'recentApps'];
const code = fs.readFileSync('assets/js/app.js', 'utf8');
async function run(feed, ok = true) {
    const containers = new Map(ids.map(id => [id, new Element('div')]));
    const requests = [];
    const context = vm.createContext({
        document: {
            readyState: 'complete',
            getElementById: id => containers.get(id) || null,
            querySelectorAll: () => [],
            createElement: tag => new Element(tag)
        },
        window: { location: { search: '' }, addEventListener() {} },
        URLSearchParams, Map, Intl,
        console: { warn() {}, error() {} },
        fetch: async (path, options) => {
            requests.push({ path, options });
            return { ok, json: async () => feed };
        }
    });
    vm.runInContext(code, context);
    await vm.runInContext('loadHomeRecentUpdates()', context);
    return { containers, requests };
}
(async () => {
    const item = {
        title: '<img src=x onerror=alert(1)>', path: '/content/paper-' + 'a'.repeat(64) + '/',
        addedAt: '2026-01-01T23:30:00Z'
    };
    const feed = Object.fromEntries(['paper', 'worksheet', 'news', 'scheme', 'app'].map(kind => [kind, [item]]));
    const { containers, requests } = await run(feed);
    assert.equal(requests.length, 1);
    assert.equal(requests[0].path, 'assets/data/recent-content.json');
    assert.equal(requests[0].options.cache, 'no-cache');
    for (const container of containers.values()) {
        const card = container.children[0];
        assert.equal(card.tag, 'a');
        assert.equal(card.href, item.path);
        const text = card.children[0].children[1];
        assert.equal(text.children[0].textContent, item.title);
        assert.equal(text.children[1].children[0].textContent, 'Added 2 Jan 2026');
    }
    const invalid = await run({ paper: [{ ...item, path: 'javascript:alert(1)' }] });
    assert.equal(invalid.containers.get('recentPapers').children[0].tag, 'p');
    const unavailable = await run({}, false);
    assert.ok(unavailable.containers.get('recentPapers').children[0].textContent.includes('could not be loaded'));
    console.log('Recent feed: one request, five linked categories, local dates, safe text/URLs, and failure fallback passed');
})().catch(error => { console.error(error); process.exit(1); });
