// Exercise the real DOMContentLoaded startup without page-specific containers.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const listeners = [];
const document = {
    readyState: 'complete',
    getElementById() { return null; },
    querySelectorAll() { return []; }
};
const window = {
    location: { search: '' },
    addEventListener(type, listener) {
        if (type === 'DOMContentLoaded') listeners.push(listener);
    }
};
const context = vm.createContext({ window, document, URLSearchParams, Map, console });
vm.runInContext(fs.readFileSync('assets/js/app.js', 'utf8'), context);
assert.equal(listeners.length, 1);
assert.doesNotThrow(() => listeners[0]());
console.log('DOM startup smoke test passed');
