const assert = require('node:assert/strict');
const fs = require('node:fs');

const app = fs.readFileSync(require.resolve('../app.html'), 'utf8');

function extractHelpModal(html) {
  const start = html.indexOf('id="help-modal"');
  assert.ok(start >= 0, 'could not locate Help modal (id="help-modal")');
  const open = html.lastIndexOf('<div', start);
  const end = html.indexOf('<!-- Explainer Modal -->', start);
  assert.ok(open >= 0 && end > open, 'could not bound Help modal markup');
  return html.slice(open, end);
}

const help = extractHelpModal(app);

const HELP_HARD_SELL = [
  'tools.aifusionautomations.com',
  'Got an idea for an app',
  'Get in Touch',
  'Club Branding',
  'CRM Systems',
  'See Our Portfolio',
  'Enquire About Branding'
];

for (const phrase of HELP_HARD_SELL) {
  assert.equal(
    help.includes(phrase),
    false,
    `Help modal still contains hard-sell copy: "${phrase}"`
  );
}

assert.equal(
  app.includes('tools.aifusionautomations.com'),
  false,
  'app.html should not CTA to tools.aifusionautomations.com'
);
assert.equal(
  /got an idea for an app/i.test(app),
  false,
  'app.html should not pitch “Got an idea for an app”'
);
assert.equal(
  /branding[\s\S]{0,160}fee/i.test(help),
  false,
  'Help modal should not sell club branding for a fee'
);
assert.equal(
  /want your club/i.test(help),
  false,
  'Help modal should not ask “Want your club’s branding”'
);

assert.match(
  help,
  /BoxLeague Pro is built by/,
  'Help modal should keep soft builder attribution'
);
assert.match(
  help,
  /AI Fusion Automations/,
  'Help modal should still name AI Fusion Automations'
);
assert.match(
  help,
  /aifusionautomations\.com/,
  'Help attribution should still link to aifusionautomations.com'
);
assert.match(
  help,
  /Who built BoxLeague Pro\?/,
  'FAQ who-built question should remain in Help'
);
assert.match(
  help,
  /BoxLeague Pro is built by AI Fusion Automations/,
  'FAQ who-built answer should remain'
);

assert.match(
  app,
  /Made by Grant de Swardt[\s\S]{0,80}AI Fusion Automations/,
  'auth footer Made-by attribution should remain'
);
assert.match(
  app,
  /class="aifa-footer-brand">Made by Grant de Swardt/,
  'main aifa-footer brand line should remain'
);
assert.match(
  app,
  /class="aifa-footer-contact"[\s\S]{0,200}grant@aifusionautomations\.com[\s\S]{0,80}\+44 7782 219066/,
  'aifa-footer contact/phone should remain'
);

console.log('app-attribution.test.js: all assertions passed');
