const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync('assets/js/app.js', 'utf8');
function page(url) {
    const elements = [];
    const document = {
        readyState: 'complete',
        getElementById() { return null; },
        querySelectorAll() { return []; },
        createElement(tag) { return { tag, attributes: {}, setAttribute(key, value) { this.attributes[key] = value; } }; },
        head: { append(element) { elements.push(element); } },
        querySelector(selector) {
            const match = selector.match(/^(meta|link)\[(name|property|rel)="([^"]+)"\]$/);
            return match ? elements.find(element => element.tag === match[1] && element.attributes[match[2]] === match[3]) || null : null;
        }
    };
    const context = vm.createContext({ window: { location: new URL(url), addEventListener() {} }, document, URL, URLSearchParams, Map, console });
    vm.runInContext(code, context);
    vm.runInContext('initializeCategorySEO()', context);
    return { context, document, elements, canonical: () => document.querySelector('link[rel="canonical"]')?.attributes.href };
}
const grade = page('https://slexams.site/grade.html?grade=08&utm_source=test');
assert.equal(grade.canonical(), 'https://slexams.site/grade.html?grade=8');
assert.ok(grade.document.title.includes('Grade 8'));
const term = page('https://slexams.site/term.html?grade=8&stream=&subject=%E0%AE%95%E0%AE%A3%E0%AE%BF%E0%AE%A4%E0%AE%AE%E0%AF%8D&term=1&utm_source=example');
assert.ok(term.document.title.includes('கணிதம் Term 1'));
assert.equal(new URL(term.canonical()).searchParams.has('stream'), false);
assert.equal(new URL(term.canonical()).searchParams.has('utm_source'), false);
const worksheet = page('https://slexams.site/term.html?grade=8&subject=Math&term=1&type=worksheet');
assert.equal(worksheet.canonical(), 'https://slexams.site/term.html?grade=8&subject=Math&type=worksheet');
assert.ok(worksheet.document.title.includes('Worksheets'));
const stream = page('https://slexams.site/stream.html?grade=12&stream=Physical%20Science');
assert.equal(new URL(stream.canonical()).searchParams.get('stream'), 'Physical Science');
assert.equal(page('https://slexams.site/grade.html?grade=999').canonical(), undefined);
assert.equal(page('https://slexams.site/index.html?utm_source=example').canonical(), undefined);
const resource = page('https://slexams.site/paper.html?grade=8&paper=0');
vm.runInContext('setPageSEO("A Paper | SLExam Pro", "Paper description", "https://slexams.site/content/paper-test/")', resource.context);
vm.runInContext('setPageSEO("A Paper | SLExam Pro", "Paper description", "https://slexams.site/content/paper-test/")', resource.context);
assert.equal(resource.canonical(), 'https://slexams.site/content/paper-test/');
assert.equal(resource.elements.filter(element => element.tag === 'link').length, 1);
console.log('SEO: grade/stream/subject/term titles, canonical normalization, worksheet identity, and single resource canonical passed');
