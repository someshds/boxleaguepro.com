const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

assert.match(html, /id="btn-organiser-signup"[^>]+onclick="beginOrganiserSignup\(\)"/);
assert.match(html, /id="screen-club-create"/);
assert.match(html, /const SELF_SERVICE_CREATE_ENABLED = SELF_SERVICE_EMULATOR_MODE;/,
  'club creation must remain restricted to explicit emulator mode');
assert.match(html, /SELF_SERVICE_EMULATOR_MODE[\s\S]+window\.location\.hostname === '127\.0\.0\.1'[\s\S]+get\('emulator'\) === '1'/,
  'emulator mode must require localhost plus an explicit URL switch');
assert.match(html, /FIREBASE_RUNTIME_CONFIG = SELF_SERVICE_EMULATOR_MODE[\s\S]+databaseURL: 'http:\/\/127\.0\.0\.1:9002\?ns=demo-boxleague-pro-self-service'[\s\S]+: FIREBASE_CONFIG;/,
  'emulator mode must use an isolated demo namespace while production keeps its normal config');
assert.match(html, /SELF_SERVICE_CREATE_ENDPOINT = SELF_SERVICE_EMULATOR_MODE[\s\S]+127\.0\.0\.1:5002[\s\S]+: '';/,
  'production must retain a blank creation endpoint');

function sliceBetween(startText, endText) {
  const start = html.indexOf(startText);
  const end = html.indexOf(endText, start);
  assert.ok(start >= 0 && end > start, `Could not extract ${startText}`);
  return html.slice(start, end);
}

const helpers = sliceBetween('function selfServiceSlugify(', 'function syncSelfServiceSlug(') +
  sliceBetween('function buildSelfServiceClubRequest(', 'function beginOrganiserSignup(');
const context = vm.createContext({ URL });
vm.runInContext(helpers, context);

assert.equal(context.selfServiceSlugify("St John's Tennis & Padel"), 'st-johns-tennis-padel');
assert.equal(context.selfServiceSlugify('  Élite Club  '), 'elite-club');

const user = { uid: 'uid-1', email: 'ORGANISER@Example.com', displayName: 'Organiser One' };
const base = {
  name: 'Riverside Tennis Club', slug: 'riverside-tennis-club', sport: 'tennis',
  format: 'singles', scoringSystem: 'default', bookingUrl: 'https://booking.example/club', confirmed: true
};
const request = context.buildSelfServiceClubRequest(base, user);
assert.equal(request.format, 'singles');
assert.equal(request.organiser.email, 'organiser@example.com');
assert.equal(request.requestVersion, 1);

const padel = context.buildSelfServiceClubRequest({ ...base, sport: 'padel', format: 'singles' }, user);
assert.equal(padel.format, 'doubles', 'padel must always be provisioned as doubles');

assert.throws(() => context.buildSelfServiceClubRequest({ ...base, bookingUrl: 'javascript:alert(1)' }, user), /https:\/\//);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, confirmed: false }, user), /authorised/);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, scoringSystem: 'invented' }, user), /supported scoring/);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, slug: 'x' }, user), /between 3 and 48/);

const submit = sliceBetween('async function submitSelfServiceClub(', 'function resetPassword(');
assert.doesNotMatch(submit, /db\.ref\(/, 'club creation must not write directly to Firebase from the browser');
assert.match(submit, /currentUser\.getIdToken\(\)/, 'enabled path must authenticate to the server');
assert.match(submit, /'Authorization': 'Bearer ' \+ token/);
assert.match(submit, /!SELF_SERVICE_CREATE_ENABLED \|\| !SELF_SERVICE_CREATE_ENDPOINT/);
assert.match(submit, /SELF_SERVICE_EMULATOR_MODE \? '&emulator=1' : ''/,
  'localhost staging redirect must remain in the isolated emulator environment');

console.log('self-service-club.test.js: all assertions passed');
