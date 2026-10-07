const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

assert.match(html, /id="btn-organiser-signup"[^>]+onclick="beginOrganiserSignup\(\)"/);
assert.match(html, /id="screen-club-create"/);
assert.match(html, /const SELF_SERVICE_PRODUCTION_ENABLED = true;/,
  'reviewed production source must expose an explicit kill switch');
assert.match(html, /SELF_SERVICE_PRODUCTION_HOSTS = new Set\(\['boxleaguepro\.com', 'www\.boxleaguepro\.com'\]\)/,
  'production self-service must be restricted to the canonical hosts');
assert.match(html, /SELF_SERVICE_CREATE_ENABLED = SELF_SERVICE_EMULATOR_MODE \|\|[\s\S]+SELF_SERVICE_PRODUCTION_ENABLED[\s\S]+SELF_SERVICE_PRODUCTION_HOSTS\.has\(window\.location\.hostname\)/,
  'self-service must require emulator mode or the enabled canonical production host');
assert.match(html, /SELF_SERVICE_EMULATOR_MODE[\s\S]+window\.location\.hostname === '127\.0\.0\.1'[\s\S]+get\('emulator'\) === '1'/,
  'emulator mode must require localhost plus an explicit URL switch');
assert.match(html, /FIREBASE_RUNTIME_CONFIG = SELF_SERVICE_EMULATOR_MODE[\s\S]+databaseURL: 'http:\/\/127\.0\.0\.1:9002\?ns=demo-boxleague-pro-self-service'[\s\S]+: FIREBASE_CONFIG;/,
  'emulator mode must use an isolated demo namespace while production keeps its normal config');
assert.match(html, /SELF_SERVICE_CREATE_ENDPOINT = SELF_SERVICE_EMULATOR_MODE[\s\S]+127\.0\.0\.1:5002[\s\S]+https:\/\/europe-west2-boxleague-pro\.cloudfunctions\.net\/createSelfServiceClub/,
  'production endpoint must use the reviewed regional Firebase Function URL');

function sliceBetween(startText, endText) {
  const start = html.indexOf(startText);
  const end = html.indexOf(endText, start);
  assert.ok(start >= 0 && end > start, `Could not extract ${startText}`);
  return html.slice(start, end);
}

const helpers = sliceBetween('function selfServiceSlugify(', 'function syncSelfServiceSlug(') +
  sliceBetween('function buildSelfServiceClubRequest(', 'function beginOrganiserSignup(');
const context = vm.createContext({ URL, URLSearchParams });
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
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, bookingUrl: 'http://booking.example/club' }, user), /https:\/\//);
assert.equal(
  context.buildSelfServiceClubRequest({ ...base, bookingUrl: 'https://www.ourclub.example/book' }, user).bookingUrl,
  'https://www.ourclub.example/book',
  'other https booking links stay allowed on the client'
);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, confirmed: false }, user), /authorised/);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, scoringSystem: 'invented' }, user), /supported scoring/);
assert.throws(() => context.buildSelfServiceClubRequest({ ...base, slug: 'x' }, user), /between 3 and 48/);

assert.equal(context.needsSelfServiceEmailVerification({
  emailVerified: false, providerData: [{ providerId: 'google.com' }]
}), false, 'Google sign-in users skip the verification gate');
assert.equal(context.needsSelfServiceEmailVerification({
  emailVerified: false, providerData: [{ providerId: 'password' }]
}), true);
assert.equal(context.needsSelfServiceEmailVerification({
  emailVerified: true, providerData: [{ providerId: 'password' }]
}), false);
assert.equal(context.needsSelfServiceEmailVerification({
  emailVerified: false, providerData: [{ providerId: 'password' }, { providerId: 'google.com' }]
}), false);

assert.equal(context.getEmailVerificationContinueUrl(''), 'https://boxleaguepro.com/app.html');
assert.equal(
  context.getEmailVerificationContinueUrl('?club=riverside&tab=setup&utm=x'),
  'https://boxleaguepro.com/app.html?club=riverside&tab=setup'
);
assert.equal(
  context.getEmailVerificationContinueUrl('?league=abc&mixin=1'),
  'https://boxleaguepro.com/app.html?league=abc&mixin=1'
);

assert.match(context.emailVerificationNoticeText('pat@example.com'), /pat@example\.com/);
assert.doesNotMatch(context.emailVerificationNoticeText('pat@example.com'), /\*/);

assert.equal(context.readSelfServiceFunctionErrorCode({ error: 'EMAIL_NOT_VERIFIED' }), 'EMAIL_NOT_VERIFIED');
assert.equal(context.readSelfServiceFunctionErrorCode({ error: { code: 'ORIGIN_DENIED' } }), 'ORIGIN_DENIED');
assert.equal(context.readSelfServiceFunctionErrorCode({ error: 'SLUG_TAKEN' }), '');

const submit = sliceBetween('async function submitSelfServiceClub(', 'function resetPassword(');
assert.doesNotMatch(submit, /db\.ref\(/, 'club creation must not write directly to Firebase from the browser');
assert.match(submit, /currentUser\.getIdToken\(true\)/, 'enabled path must authenticate with a fresh token');
assert.match(submit, /'Authorization': 'Bearer ' \+ token/);
assert.match(submit, /!SELF_SERVICE_CREATE_ENABLED \|\| !SELF_SERVICE_CREATE_ENDPOINT/);
assert.match(submit, /SELF_SERVICE_EMULATOR_MODE \? '&emulator=1' : ''/,
  'localhost staging redirect must remain in the isolated emulator environment');
assert.match(submit, /needsSelfServiceEmailVerification\(currentUser\)/);
assert.match(submit, /currentUser\.reload\(\)/);
assert.match(submit, /EMAIL_NOT_VERIFIED/);
assert.match(submit, /ORIGIN_DENIED/);
assert.match(submit, /Please create your club from boxleaguepro\.com/);
assert.match(submit, /getIdToken\(true\)/);
assert.match(submit, /VERIFICATION_RESEND_WAIT_MS/);
assert.equal(context.VERIFICATION_RESEND_WAIT_MS, 60000);

assert.match(html, /sendSignupVerificationEmail\(cred\.user\)/);
assert.match(html, /user\.sendEmailVerification\(getEmailVerificationActionSettings\(\)\)/);
assert.match(html, /https:\/\/boxleaguepro\.com\/app\.html/);
assert.match(html, /id="self-club-resend-verify"[^>]*>Resend email/);
assert.match(html, /id="self-club-retry-verify"[^>]*>I've verified, continue/);
assert.match(html, /ClubSpark, MyCourts or Playtomic/);
assert.match(html, /id="self-club-booking-url"[\s\S]{0,400}Use an https link/);

console.log('self-service-club.test.js: all assertions passed');
