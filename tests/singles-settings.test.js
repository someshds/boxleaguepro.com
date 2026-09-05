const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

assert.match(html, /function syncSettingsGroupLabels\(leagueInfo\)/,
  'Settings must expose a format-aware labels helper');
assert.match(html, /setText\('setup-groups-title', singlesLeague \? 'Players' : 'Teams'\)/,
  'Singles Settings must label the roster Players');
assert.match(html, /quickButton\.textContent = singlesLeague \? 'Add Players' : 'Add Doubles Pairs'/,
  'Singles Settings must offer Add Players');
assert.match(html, /loadTemplate\('singles'\)/,
  'Singles Settings must select the one-player template');
assert.match(html, /singlesTemplate\s*\? 'One player per line/,
  'Singles quick add must explain one player per line');
assert.match(html, /setText\('setup-quick-add-line-label', singlesLeague \? '\(one player per line\)' : '\(one team per line\)'\)/,
  'Quick-add field label must follow the league format');
assert.match(html, /No \$\{singlesLeague \? 'players' : 'teams'\} yet/,
  'Empty-state terminology must follow the league format');

const start = html.indexOf('function syncSettingsGroupLabels(leagueInfo)');
const end = html.indexOf('function showGroupForm()', start);
assert.ok(start >= 0 && end > start, 'could not extract format-aware Settings helper');

const elements = {};
[
  'setup-groups-title', 'setup-new-group-title', 'setup-add-group-submit',
  'btn-add-group', 'setup-quick-add-title', 'setup-quick-add-button',
  'setup-quick-add-wrap', 'setup-quick-add-line-label'
].forEach(id => {
  elements[id] = {
    textContent: '',
    style: { display: 'none' },
    setAttribute(name, value) { this[name] = value; }
  };
});

const context = vm.createContext({
  document: { getElementById: id => elements[id] || null },
  isSinglesLeague: info => info.format === 'singles'
});
vm.runInContext(html.slice(start, end), context);

context.syncSettingsGroupLabels({ format: 'singles' });
assert.equal(elements['setup-groups-title'].textContent, 'Players');
assert.equal(elements['setup-new-group-title'].textContent, 'New Player');
assert.equal(elements['setup-add-group-submit'].textContent, 'Add Player');
assert.equal(elements['setup-quick-add-button'].textContent, 'Add Players');
assert.equal(elements['setup-quick-add-button'].onclick, "loadTemplate('singles')");
assert.equal(elements['setup-quick-add-line-label'].textContent, '(one player per line)');
assert.equal(elements['setup-quick-add-wrap'].style.display, '');

context.syncSettingsGroupLabels({ format: 'doubles' });
assert.equal(elements['setup-groups-title'].textContent, 'Teams');
assert.equal(elements['setup-new-group-title'].textContent, 'New Team');
assert.equal(elements['setup-add-group-submit'].textContent, 'Add Team');
assert.equal(elements['setup-quick-add-button'].textContent, 'Add Doubles Pairs');
assert.equal(elements['setup-quick-add-button'].onclick, "loadTemplate('doubles')");
assert.equal(elements['setup-quick-add-line-label'].textContent, '(one team per line)');

console.log('singles-settings.test.js: all assertions passed');
