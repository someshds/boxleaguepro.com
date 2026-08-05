const assert = require('node:assert/strict');
const scoreEntry = require('../score-entry.js');

assert.equal(scoreEntry.inputMax('squash'), 99);
assert.equal(scoreEntry.inputMax('tennis'), 13);

[
  [15, 0],
  [15, 9],
  [15, 13],
  [16, 14],
  [17, 15],
  [22, 20]
].forEach(([a, b]) => {
  assert.equal(scoreEntry.validateLine(a, b, 'squash').valid, true, `${a}-${b} should be valid`);
  assert.equal(scoreEntry.validateLine(b, a, 'squash').valid, true, `${b}-${a} should be valid`);
});

[
  [0, 1],
  [14, 12],
  [15, 14],
  [16, 15],
  [17, 14],
  [15, 15],
  [-1, 15],
  [100, 98]
].forEach(([a, b]) => {
  assert.equal(scoreEntry.validateLine(a, b, 'squash').valid, false, `${a}-${b} should be invalid`);
});

assert.equal(scoreEntry.validateLine(6, 4, 'tennis').valid, true);
assert.equal(scoreEntry.validateLine(13, 12, 'tennis').valid, true);

console.log('score-entry.test.js: all assertions passed');
