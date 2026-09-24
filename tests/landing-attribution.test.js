const assert = require('node:assert/strict');
const fs = require('node:fs');

const landing = fs.readFileSync(require.resolve('../index.html'), 'utf8');

const HARD_SELL = [
  '£99',
  '&pound;99',
  '£500',
  '&pound;500',
  'Enquire About Branding',
  'See Our Portfolio',
  "Want Your Club's Branding",
  'Got an Idea for an App?',
  'Projects from'
];

for (const phrase of HARD_SELL) {
  assert.equal(
    landing.includes(phrase),
    false,
    `index.html still contains hard-sell copy: "${phrase}"`
  );
}

assert.equal(
  landing.includes('tools.aifusionautomations.com'),
  false,
  'index.html should not CTA to tools.aifusionautomations.com'
);
assert.equal(
  landing.includes("content:'MOST POPULAR'"),
  false,
  'index.html should not show a MOST POPULAR badge on the sole pricing card'
);
assert.equal(
  landing.includes('.branding{'),
  false,
  'unused .branding upsell CSS should be removed'
);

assert.match(
  landing,
  /BoxLeague Pro is built by/,
  'landing should keep soft builder attribution'
);
assert.match(
  landing,
  /AI Fusion Automations/,
  'landing should still name AI Fusion Automations'
);
assert.match(
  landing,
  /Free\. Forever\. Seriously\./,
  'free-forever pricing copy should remain'
);
assert.match(
  landing,
  /Who built BoxLeague Pro\?/,
  'FAQ who-built answer should remain'
);
assert.match(
  landing,
  /Built by <a href="https:\/\/aifusionautomations\.com"/,
  'footer Built-by attribution should remain'
);

console.log('landing-attribution.test.js: all assertions passed');
