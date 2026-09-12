const assert = require('node:assert/strict');
const fs = require('node:fs');

const STALE_SLA = ['in 24 hours', 'within 24 hours'];
const LIVE_PAGES = ['index.html', 'app.html', 'apply.html', 'privacy.html', 'terms.html'];

function readPage(name) {
  return fs.readFileSync(require.resolve(`../${name}`), 'utf8');
}

function assertNoStaleSla(label, text) {
  const lower = text.toLowerCase();
  for (const phrase of STALE_SLA) {
    assert.equal(
      lower.includes(phrase),
      false,
      `${label} still promises club setup "${phrase}"`
    );
  }
}

for (const page of LIVE_PAGES) {
  assertNoStaleSla(page, readPage(page));
}

const landing = readPage('index.html');
assert.match(
  landing,
  /Once provisioned, we email the organiser a dedicated link/,
  'landing CTA should describe provision + organiser email, not a 24-hour SLA'
);

const apply = readPage('apply.html');
assert.match(apply.toLowerCase(), /once your club is provisioned/);
assert.match(apply.toLowerCase(), /email the organiser a dedicated link/);
assert.match(apply.toLowerCase(), /on-screen guide/);

const app = readPage('app.html');
const tourStart = app.indexOf('const TOUR_STEPS = [');
const tourEnd = app.indexOf('];', tourStart);
assert.ok(tourStart >= 0 && tourEnd > tourStart, 'could not locate in-app TOUR_STEPS');
const tour = app.slice(tourStart, tourEnd + 2);
assert.match(tour, /title: 'Your Club Link'/, 'tour must still include the club-link step');
assertNoStaleSla('in-app tour (TOUR_STEPS)', tour);
assert.match(
  tour.toLowerCase(),
  /once the club is provisioned/,
  'tour club-link step should describe provisioning, not a 24-hour SLA'
);
assert.match(
  tour.toLowerCase(),
  /email the organiser a dedicated link/,
  'tour club-link step should mention the organiser email'
);
assert.match(
  tour.toLowerCase(),
  /on-screen guide/,
  'tour club-link step should mention on-screen setup'
);

console.log('club-setup-copy.test.js: all assertions passed');
