const assert = require('assert');
const fs = require('fs');
const vm = require('vm');

const consentSource = fs.readFileSync(require.resolve('../privacy-consent.js'), 'utf8');

function runWithChoice(choice) {
  const scripts = [];
  const banner = { style: { display: 'none' } };
  const store = new Map(choice ? [['blp_cookies', choice]] : []);
  const document = {
    readyState: 'complete',
    head: { appendChild(script) { scripts.push(script); } },
    createElement() {
      return { setAttribute(key, value) { this[key] = value; } };
    },
    getElementById(id) { return id === 'cookie-consent' ? banner : null; },
    querySelector() { return null; }
  };
  const window = {};
  const context = {
    window,
    document,
    localStorage: {
      getItem(key) { return store.get(key) || null; },
      setItem(key, value) { store.set(key, value); }
    },
    Date,
    setTimeout() {}
  };
  vm.runInNewContext(consentSource, context);
  return { scripts, banner, store, api: window.BoxLeagueConsent };
}

const undecided = runWithChoice('');
assert.equal(undecided.banner.style.display, 'block', 'undecided visitors should see the banner');
assert.equal(undecided.scripts.length, 0, 'optional services must not load before a choice');

const declined = runWithChoice('declined');
assert.equal(declined.banner.style.display, 'none', 'returning declined visitors should not see the banner');
assert.equal(declined.scripts.length, 0, 'declined visitors must not load optional services');

const accepted = runWithChoice('accepted');
assert.equal(accepted.scripts.length, 2, 'accepted visitors should load analytics and support chat once');
assert(accepted.scripts.some((script) => String(script.src).includes('googletagmanager.com/gtag/js')));
assert(accepted.scripts.some((script) => String(script.src).includes('widgets.leadconnectorhq.com/loader.js')));

undecided.api.decline();
assert.equal(undecided.store.get('blp_cookies'), 'declined');
assert.equal(undecided.scripts.length, 0);

for (const page of ['index.html', 'app.html']) {
  const html = fs.readFileSync(require.resolve(`../${page}`), 'utf8');
  assert(html.includes('/privacy-consent.js'), `${page} should load the consent controller`);
  assert(!html.includes('src="https://www.googletagmanager.com/gtag/js'), `${page} must not load GA4 directly`);
  assert(!html.includes('src="https://widgets.leadconnectorhq.com/loader.js'), `${page} must not load chat directly`);
  assert(html.includes('/privacy.html'), `${page} should link to the BoxLeague privacy page`);
}

const app = fs.readFileSync(require.resolve('../app.html'), 'utf8');
assert(!app.includes('<script src="https://link.aifusionautomations.com/js/form_embed.js"'), 'feedback helper must not load before the form is opened');
assert(app.includes('data-src="https://link.aifusionautomations.com/widget/form/'), 'feedback form should retain a lazy data source');

const landing = fs.readFileSync(require.resolve('../index.html'), 'utf8');
for (const staleClaim of ['automatic scheduling', 'instant notifications', 'any format', 'within 24 hours']) {
  assert(!landing.toLowerCase().includes(staleClaim), `landing page still contains stale claim: ${staleClaim}`);
}
assert(landing.toLowerCase().includes('padel is always doubles-only'));

console.log('privacy-consent.test.js: all assertions passed');
