const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
    constructor() { this.children = []; this.events = {}; this.attributes = {}; this.classList = { add() {} }; }
    setAttribute(k, v) { this.attributes[k] = v; }
    append(...items) { this.children.push(...items); }
    addEventListener(k, fn) { this.events[k] = fn; }
    matches() { return true; }
    insertAdjacentElement(_, item) { this.nav = item; }
    focus() { this.focused = true; }
    scrollIntoView() { this.scrolled = true; }
}
let changed;
const context = vm.createContext({
    window: { location: { search: '' }, addEventListener() {} },
    document: { readyState: 'complete', getElementById() { return null; }, querySelectorAll() { return []; }, createElement() { return new Element(); } },
    MutationObserver: class { constructor(fn) { changed = fn; } observe() {} },
    URL, URLSearchParams, Map, console
});
vm.runInContext(fs.readFileSync('assets/js/app.js', 'utf8'), context);
const list = new Element(); list.id = 'papers';
list.children = Array.from({length:23}, (_, index) => Object.assign(new Element(), { href: `paper=${index}` }));
context.list = list;
vm.runInContext('paginateList(list, ".paper", "Papers")', context);
const [previous,status,next] = list.nav.children;
const visible = () => list.children.filter(item => !item.hidden).map(item => item.href);
assert.equal(visible().length,10); assert.equal(visible()[0],'paper=0'); assert.equal(previous.disabled,true);
next.events.click(); assert.equal(visible()[0],'paper=10'); assert.equal(visible().length,10); assert.ok(list.focused && list.scrolled);
next.events.click(); assert.equal(visible()[0],'paper=20'); assert.equal(visible().length,3); assert.equal(next.disabled,true);
next.events.click(); assert.equal(visible().length,3);
previous.events.click(); assert.equal(visible()[0],'paper=10');
list.children = list.children.slice(0,10); changed(); assert.equal(list.nav.hidden,true); assert.equal(visible().length,10);
list.children = []; changed(); assert.equal(list.nav.hidden,true);
list.children = Array.from({length:11},(_,i)=>Object.assign(new Element(),{href:`new=${i}`})); changed();
assert.equal(list.nav.hidden,false); assert.equal(visible().length,10); next.events.click(); assert.deepEqual(visible(),['new=10']);
console.log('Pagination: 10/10/3 boundaries, stable item links, previous/next limits, focus, empty/short and asynchronously replaced lists passed');
