const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
class Element {
    constructor(tag) { this.tag = tag; this.children = []; this.hidden = false; }
    append(...elements) { this.children.push(...elements); }
    replaceChildren(...elements) { this.children = elements; }
}
const host = new Element('section');
const context = vm.createContext({
    document: { getElementById: id => id === 'paperDetails' ? host : null, createElement: tag => new Element(tag) },
    window: { location: { search: '?grade=8&subject=கணிதம்&term=3' }, addEventListener() {} },
    URLSearchParams, console, Map
});
vm.runInContext(fs.readFileSync('assets/js/app.js', 'utf8'), context);
function rows() { return host.children[1].children[1].children.map(row => row.children.map(cell => cell.textContent)); }
context.renderPaperDetails({ title: 'Paper 2024' });
assert.equal(host.hidden, false);
assert.equal(rows().length, 3);
assert.equal(rows().find(r => r[0] === 'வகுப்பு')[1], '8');
assert.equal(rows().find(r => r[0] === 'வகை / தவணை')[1], 'மூன்றாம் தவணை');
assert.ok(!rows().some(r => r[0] === 'ஆண்டு'));
const unsafe = '<img src=x onerror=alert(1)>';
context.renderPaperDetails({ paperDetails: { exam: 'இறுதிக் கணிப்பீடு', publisher: unsafe, year: '2021 (2022)', pages: 4, durationMinutes: 120 } });
assert.equal(rows().find(r => r[0] === 'வெளியிட்ட அமைப்பு')[1], unsafe); // textContent, never parsed as markup.
assert.equal(rows().find(r => r[0] === 'வகை / தவணை')[1], 'இறுதிக் கணிப்பீடு');
assert.equal(host.children.length, 2); // Re-render replaces rather than duplicates.
context.renderPaperDetails({ paperDetails: { pages: -1, durationMinutes: '120', year: true } });
assert.ok(!rows().some(r => ['பக்கங்கள்', 'நேரம்', 'ஆண்டு'].includes(r[0])));
console.log('Paper detail rendering checks passed');
