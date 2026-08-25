const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const source = fs.readFileSync(require.resolve('../app.html'), 'utf8');
function functionSource(name, nextName) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf(`function ${nextName}(`, start);
  assert(start >= 0 && end > start, `Could not extract ${name}`);
  return source.slice(start, end);
}

const elements = {
  'scoped-ba-league': { value: 'singles-1' },
  'scoped-ba-msg': { innerHTML: '' },
  'scoped-ba-text': { value: '' },
  'scoped-ba-pair-rows': { children: [] }
};
let submitted = false;
const context = {
  window: { _scopedBulkLeagues: {
    'singles-1': { format: 'singles', sport: 'tennis' },
    'doubles-1': { format: 'doubles', sport: 'tennis' },
    'mixed-1': { format: 'mixed', sport: 'tennis' },
    'padel-1': { format: 'singles', sport: 'padel' }
  } },
  document: { getElementById: id => elements[id] },
  scopedSubmitBulkAdd: () => { submitted = true; },
  esc: value => String(value)
};
vm.createContext(context);
vm.runInContext(
  functionSource('scopedBulkAddFormat', 'syncScopedBulkAddFormat') +
  functionSource('scopedSubmitStructuredPlayers', 'openScopedModal'),
  context
);

assert.strictEqual(context.scopedBulkAddFormat(), 'singles');
elements['scoped-ba-league'].value = 'doubles-1';
assert.strictEqual(context.scopedBulkAddFormat(), 'doubles');
elements['scoped-ba-league'].value = 'mixed-1';
assert.strictEqual(context.scopedBulkAddFormat(), 'mixed');
elements['scoped-ba-league'].value = 'padel-1';
assert.strictEqual(context.scopedBulkAddFormat(), 'doubles');

function row(p1Name, p1Email, p2Name, p2Email) {
  const values = {
    '.structured-p1-name': p1Name,
    '.structured-p1-email': p1Email,
    '.structured-p2-name': p2Name,
    '.structured-p2-email': p2Email
  };
  return { querySelector: selector => values[selector] == null ? null : { value: values[selector] } };
}

elements['scoped-ba-league'].value = 'singles-1';
elements['scoped-ba-pair-rows'].children = [row('Alex Carter', 'alex@example.com', null, null)];
context.scopedSubmitStructuredPlayers();
assert.strictEqual(elements['scoped-ba-text'].value, 'Alex Carter, alex@example.com');
assert.strictEqual(submitted, true);

submitted = false;
elements['scoped-ba-league'].value = 'doubles-1';
elements['scoped-ba-pair-rows'].children = [row('Alex Carter', 'alex@example.com', '', '')];
context.scopedSubmitStructuredPlayers();
assert.match(elements['scoped-ba-msg'].innerHTML, /enter both player names/);
assert.strictEqual(submitted, false);

elements['scoped-ba-pair-rows'].children = [row('Alex Carter', 'alex@example.com', 'Ben Foster', 'ben@example.com')];
context.scopedSubmitStructuredPlayers();
assert.strictEqual(elements['scoped-ba-text'].value, 'Alex Carter, alex@example.com & Ben Foster, ben@example.com');
assert.strictEqual(submitted, true);

console.log('format-aware bulk-add tests passed');
