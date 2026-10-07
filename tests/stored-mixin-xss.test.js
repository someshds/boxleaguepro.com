'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const html = fs.readFileSync(path.resolve(__dirname, '..', 'app.html'), 'utf8');

assert.match(html, /function storedText\(value\) \{ return esc\(/);
assert.match(html, /storedText\(m\.title \|\| 'Open Game'\)/);
assert.match(html, /storedText\(m\.venue \|\| L\.settings\.leagueName \|\| 'League'\)/);
assert.match(html, /storedText\(m\.notes\)/);
assert.doesNotMatch(html, /\$\{m\.title\}/);
assert.doesNotMatch(html, /\$\{m\.venue\}/);
assert.doesNotMatch(html, /\$\{m\.notes\}/);

console.log('Stored mix-in text is escaped before HTML rendering.');
