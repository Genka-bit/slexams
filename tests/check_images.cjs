const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const context = vm.createContext({
    window: { location: { search: '' }, addEventListener() {} },
    document: { readyState: 'complete', baseURI: 'https://slexams.site/', getElementById() { return null; }, querySelectorAll() { return []; } },
    URL, URLSearchParams, Map, console
});
vm.runInContext(fs.readFileSync('assets/js/app.js', 'utf8'), context);
const metadata = { sources: [
    { src: '/assets/images/test-320.webp', width: 320, height: 480 },
    { src: '/assets/images/test-640.webp', width: 640, height: 960 },
    { src: 'javascript:alert(1)', width: 960, height: 1440 }
] };
context.metadata = metadata;
const attributes = vm.runInContext('responsiveImageAttributes(metadata, "original.png", "92vw")', context);
assert.ok(attributes.includes('test-640.webp'));
assert.ok(attributes.includes('320w'));
assert.ok(attributes.includes('sizes="92vw"'));
assert.ok(attributes.includes('width="640" height="960"'));
assert.ok(!attributes.includes('javascript:'));
assert.equal(vm.runInContext('responsiveImageAttributes(null, "javascript:alert(1)", "100vw")', context), 'decoding="async"');
assert.ok(vm.runInContext('responsiveImageAttributes(null, "assets/original.png", "100vw")', context).includes('https://slexams.site/assets/original.png'));
console.log('Responsive image attributes: srcset, dimensions, original fallback and URL validation passed');
