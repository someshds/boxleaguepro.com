const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(require.resolve('../promos.js'), 'utf8');
const pages = ['index.html', 'app.html', 'apply.html', 'privacy.html', 'terms.html'];

function createStorage() {
  const data = new Map();
  return {
    data,
    getItem(key) { return data.has(key) ? data.get(key) : null; },
    setItem(key, value) { data.set(key, String(value)); },
    removeItem(key) { data.delete(key); }
  };
}

function createHost(view, sync) {
  const attrs = {
    'data-blp-promo': '',
    'data-blp-promo-view': view || 'index'
  };
  if (sync) attrs['data-blp-promo-sync'] = sync;
  const listeners = {};
  const host = {
    hidden: false,
    innerHTML: '',
    attrs,
    querySelector(sel) {
      if (sel === '.blp-promo-dismiss' && this.innerHTML.includes('blp-promo-dismiss')) {
        return {
          addEventListener(type, fn) {
            listeners[type] = listeners[type] || [];
            listeners[type].push(fn);
          }
        };
      }
      return null;
    },
    getAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attrs, name) ? this.attrs[name] : null; },
    setAttribute(name, value) { this.attrs[name] = String(value); }
  };
  host._listeners = listeners;
  return host;
}

function loadApi(overrides) {
  overrides = overrides || {};
  const store = overrides.sessionStorage || createStorage();
  const hosts = overrides.hosts || [createHost(overrides.view || 'index', overrides.sync)];
  const created = [];
  const document = {
    readyState: 'loading',
    head: {
      appendChild() {}
    },
    getElementById() { return null; },
    createElement() {
      const el = { id: '', textContent: '' };
      created.push(el);
      return el;
    },
    querySelectorAll(sel) {
      if (sel === '[data-blp-promo]') return hosts;
      if (sel === '[data-blp-promo-sync="tab"]') return hosts.filter((h) => h.getAttribute('data-blp-promo-sync') === 'tab');
      if (sel === '[data-blp-promo-sync="hash"]') return hosts.filter((h) => h.getAttribute('data-blp-promo-sync') === 'hash');
      return [];
    },
    addEventListener() {}
  };
  const window = {
    document,
    sessionStorage: store,
    location: overrides.location || { pathname: '/index.html', hash: '' },
    addEventListener() {},
    Date
  };
  vm.runInNewContext(source, { window, Date, isFinite, parseInt });
  return { api: window.BoxLeaguePromos, store, hosts, document };
}

const WEBINAR = {
  id: 'email-reimagined-webinar',
  headline: 'Missed a payment warning or customer reply?',
  line: 'Free live webinar, Fri 16 Oct, 5pm UK. See a priority inbox sort a Gmail inbox.',
  cta: 'Save my free seat',
  url: 'https://email-reimagined.com/founder-priority-inbox-16th-october?utm_source=boxleaguepro&utm_medium=in-app&utm_campaign=email-reimagined-webinar',
  expiresAt: '2026-10-16T17:00:00+01:00'
};

const { api } = loadApi();

assert.equal(api.OFFERS.length, 3, 'three offers should be configured');
assert.equal(api.OFFERS[0].id, 'email-reimagined-webinar');
assert.equal(api.OFFERS[1].id, 'ripplekeep-health-check');
assert.equal(api.OFFERS[2].id, 'ripplekeep-free-website');

assert.equal(
  api.isOfferActive(WEBINAR, new Date('2026-10-16T16:59:59+01:00')),
  true,
  'webinar should remain visible before it starts'
);
assert.equal(
  api.isOfferActive(WEBINAR, new Date('2026-10-16T17:00:00+01:00')),
  false,
  'expired offer must not stay active at expiresAt'
);
assert.equal(
  api.getValidOffers(new Date('2026-10-16T17:00:00+01:00'), [WEBINAR]).length,
  0,
  'expired offer must not be in the valid list'
);

const expiredMount = loadApi();
const expiredHtml = expiredMount.api.slotMarkup(WEBINAR, 'index');
assert.ok(expiredHtml.includes('Save my free seat'), 'markup helper still builds live copy');
const expiredRendered = expiredMount.api.mount({
  now: new Date('2026-10-16T17:00:00+01:00'),
  offers: [WEBINAR]
});
assert.equal(expiredRendered, null, 'expired offer must not render');
assert.equal(expiredMount.hosts[0].innerHTML, '', 'expired offer leaves the host empty');
assert.equal(expiredMount.hosts[0].hidden, true, 'empty expired slot should be hidden');

const emptyMount = loadApi();
const emptyRendered = emptyMount.api.mount({ now: new Date('2026-10-08T12:00:00Z'), offers: [] });
assert.equal(emptyRendered, null, 'empty list renders nothing');
assert.equal(emptyMount.hosts[0].innerHTML, '', 'empty list leaves the host empty');

const dismissMount = loadApi({ view: 'availability' });
const shown = dismissMount.api.mount({ now: new Date('2026-10-08T12:00:00Z') });
assert.ok(shown, 'a valid offer should render before dismiss');
assert.ok(dismissMount.hosts[0].innerHTML.includes('blp-promo'), 'slot markup should be present');
dismissMount.api.dismiss();
assert.equal(dismissMount.store.getItem(dismissMount.api.DISMISS_KEY), '1', 'dismiss flag is stored for the session');
assert.equal(dismissMount.api.isDismissed(), true, 'isDismissed should read sessionStorage');
assert.equal(dismissMount.hosts[0].innerHTML, '', 'dismiss clears the current slot');

const persistMount = loadApi({ sessionStorage: dismissMount.store, view: 'availability' });
const persisted = persistMount.api.mount({ now: new Date('2026-10-08T12:00:00Z') });
assert.equal(persisted, null, 'dismiss persists for the rest of the session');
assert.equal(persistMount.hosts[0].innerHTML, '', 'a later mount in the same session stays empty');

const live = loadApi({ view: 'index' });
const offer = live.api.mount({ now: new Date('2026-10-08T12:00:00Z') });
assert.ok(offer, 'at least one current offer should render');
const html = live.hosts[0].innerHTML;
assert.match(html, /rel="noopener sponsored"/, 'CTA must include rel="noopener sponsored"');
assert.match(html, /target="_blank"/, 'CTA must open in a new tab');
assert.match(html, /utm_source=boxleaguepro/, 'CTA must keep the shared UTM source');
assert.match(html, /utm_medium=in-app/, 'CTA must keep the in-app UTM medium');
assert.match(html, /utm_content=index/, 'CTA must append utm_content for the host view');
assert.match(html, /From the team behind BoxLeague Pro/, 'label should stay small and honest');

const built = live.api.buildUrl(offer.url, 'matches');
assert.match(built, /utm_content=matches/, 'buildUrl should append the page or view name');
assert.match(built, /utm_source=boxleaguepro/, 'buildUrl should preserve existing UTM params');

const tabHost = createHost('availability', 'tab');
const tabMount = loadApi({ hosts: [tabHost] });
tabMount.api.mount({ now: new Date('2026-10-08T12:00:00Z') });
tabMount.api.setView('results');
assert.equal(tabHost.getAttribute('data-blp-promo-view'), 'results');
assert.match(tabHost.innerHTML, /utm_content=results/, 'tab sync should update utm_content without a new page load');

for (const item of live.api.OFFERS) {
  for (const field of ['id', 'headline', 'line', 'cta', 'url', 'source']) {
    if (item[field] == null) continue;
    assert.equal(
      String(item[field]).includes('*'),
      false,
      `offer ${item.id} ${field} must not contain an asterisk`
    );
  }
}
assert.equal(live.api.LABEL.includes('*'), false, 'promo label must not contain an asterisk');
assert.equal(live.api.slotMarkup(offer, 'index').includes('*'), false, 'rendered markup must not contain an asterisk');

assert.equal(live.api.OFFERS[0].source, 'Email Re-imagined');
assert.equal(live.api.OFFERS[1].source, 'RippleKeep');
assert.equal(live.api.OFFERS[2].source, 'RippleKeep');

for (const page of pages) {
  const htmlPage = fs.readFileSync(path.join(__dirname, '..', page), 'utf8');
  assert.match(htmlPage, /\/promos\.js/, `${page} should load the shared promo script`);
  assert.match(htmlPage, /data-blp-promo/, `${page} should include a promo host`);
  assert.equal(htmlPage.includes('doubleclick'), false, `${page} must not add an ad network`);
  assert.equal(htmlPage.includes('googlesyndication'), false, `${page} must not add an ad network`);
}

const app = fs.readFileSync(require.resolve('../app.html'), 'utf8');
for (const view of [
  'welcome',
  'browse',
  'wizard',
  'onboarding',
  'club-create',
  'guided',
  'availability',
  'help'
]) {
  assert.match(app, new RegExp(`data-blp-promo-view="${view}"`), `app.html should host the promo on ${view}`);
}
assert.match(app, /BoxLeaguePromos\.setView/, 'league tab changes should refresh the promo view name');

const landing = fs.readFileSync(require.resolve('../index.html'), 'utf8');
assert.equal(
  landing.includes('built in 24 hours'),
  false,
  'offer copy belongs in promos.js, not the landing HTML'
);

console.log('promos.test.js: all assertions passed');
