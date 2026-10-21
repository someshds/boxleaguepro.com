const assert = require('node:assert/strict');
const fs = require('node:fs');

const STALE_SLA = ['in 24 hours', 'within 24 hours'];
const STALE_WAIT = [
  'once your club is provisioned',
  'once the club is provisioned',
  'once it is provisioned',
  'once provisioned',
  'we review the application'
];
const LIVE_PAGES = ['index.html', 'app.html', 'apply.html', 'privacy.html', 'terms.html'];
const FIVE_SPORTS = ['tennis', 'padel', 'squash', 'racketball', 'badminton'];

function readPage(name) {
  return fs.readFileSync(require.resolve(`../${name}`), 'utf8');
}

function visibleCopy(html) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<!--[\s\S]*?-->/g, ' ');
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

function assertNoStaleWait(label, text) {
  const lower = text.toLowerCase();
  for (const phrase of STALE_WAIT) {
    assert.equal(
      lower.includes(phrase),
      false,
      `${label} still uses wait/apply language: "${phrase}"`
    );
  }
}

for (const page of LIVE_PAGES) {
  const html = readPage(page);
  assertNoStaleSla(page, html);
}

const landing = readPage('index.html');
assertNoStaleWait('index.html club-setup copy', landing);
assert.match(
  landing,
  /Your club is set up automatically, usually within minutes, and we email/,
  'landing should describe automatic setup, usually within minutes, plus the email'
);
assert.match(
  landing,
  />Set up your club</,
  'landing CTAs should say Set up your club, not Apply'
);
assert.equal(
  /Apply for (Your )?Club/i.test(landing),
  false,
  'landing should not keep Apply for Club CTAs'
);

const apply = readPage('apply.html');
const applyVisible = visibleCopy(apply);
assertNoStaleWait('apply.html', apply);
assert.match(apply.toLowerCase(), /about 2 minutes/);
assert.match(apply.toLowerCase(), /set up automatically/);
assert.match(apply.toLowerCase(), /usually within minutes/);
assert.match(apply.toLowerCase(), /we email you the link/);
assert.match(apply.toLowerCase(), /on-screen guide/);
assert.match(apply, /<h1>Set up your club<\/h1>/);
assert.match(apply, /NZUQTviINhMuoejOVGQB/, 'GHL club application embed must remain as the default / fallback');
assert.match(readPage('instant-signup.js'), /var INSTANT_SIGNUP_UI = false;/);

for (const sport of FIVE_SPORTS) {
  assert.match(
    apply.toLowerCase(),
    new RegExp(sport),
    `apply.html should keep the five-sport list including ${sport}`
  );
}

assert.equal(
  applyVisible.includes('*'),
  false,
  'apply.html visible copy must not use asterisks'
);
assert.equal(
  /Grant de Swardt/i.test(applyVisible),
  false,
  "apply.html must not put Grant's name in copy"
);

const iframeId = apply.indexOf('id="NZUQTviINhMuoejOVGQB"');
const iframeSrc = apply.indexOf('https://link.aifusionautomations.com/widget/survey/NZUQTviINhMuoejOVGQB');
const h1Idx = apply.indexOf('<h1>Set up your club</h1>');
const explainerIdx = apply.indexOf('class="explainer"');
const prefieldsIdx = apply.indexOf('class="prefields"');
assert.ok(iframeId >= 0 && iframeSrc >= 0, 'GHL embed ID and survey URL must stay unchanged');
assert.ok(h1Idx >= 0 && h1Idx < iframeId, 'form must sit under the short H1');
assert.ok(iframeId < explainerIdx, 'GHL form must appear before the what-happens-next box');
assert.ok(iframeId < prefieldsIdx, 'GHL form must appear before the message-field box');

const app = readPage('app.html');
const faqStart = app.indexOf('var faqs = [');
const faqEnd = app.indexOf('];', faqStart);
assert.ok(faqStart >= 0 && faqEnd > faqStart, 'could not locate in-app FAQ list');
const faq = app.slice(faqStart, faqEnd + 2);
assert.match(
  faq.toLowerCase(),
  /how do i get my club added to boxleague pro/,
  'app FAQ must still include the club-setup question'
);
assertNoStaleWait('app.html FAQ', faq);
assert.match(faq.toLowerCase(), /about 2 minutes/);
assert.match(faq.toLowerCase(), /set up automatically/);
assert.match(faq.toLowerCase(), /usually within minutes/);
assert.match(faq.toLowerCase(), /we email you the link/);

const tourStart = app.indexOf('const TOUR_STEPS = [');
const tourEnd = app.indexOf('];', tourStart);
assert.ok(tourStart >= 0 && tourEnd > tourStart, 'could not locate in-app TOUR_STEPS');
const tour = app.slice(tourStart, tourEnd + 2);
assert.match(tour, /title: 'Your Club Link'/, 'tour must still include the club-link step');
assertNoStaleSla('in-app tour (TOUR_STEPS)', tour);
assertNoStaleWait('in-app tour (TOUR_STEPS)', tour);
assert.match(
  tour.toLowerCase(),
  /set up automatically/,
  'tour club-link step should describe automatic setup, not a wait to provision'
);
assert.match(
  tour.toLowerCase(),
  /usually within minutes/,
  'tour club-link step should say setup is usually within minutes'
);
assert.match(
  tour.toLowerCase(),
  /we email you a dedicated link/,
  'tour club-link step should mention the setup email'
);
assert.match(
  tour.toLowerCase(),
  /on-screen guide/,
  'tour club-link step should mention on-screen setup'
);

console.log('club-setup-copy.test.js: all assertions passed');
