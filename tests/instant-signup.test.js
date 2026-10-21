const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const api = require('../instant-signup');
const applyHtml = fs.readFileSync(path.join(__dirname, '..', 'apply.html'), 'utf8');
const appHtml = fs.readFileSync(path.join(__dirname, '..', 'app.html'), 'utf8');
const instantSrc = fs.readFileSync(path.join(__dirname, '..', 'instant-signup.js'), 'utf8');

assert.equal(api.INSTANT_SIGNUP_UI, false, 'instant UI must stay off so a merge does not change visitors');
assert.equal(api.isInstantSignupUiEnabled(), false);
assert.equal(api.isInstantSignupUiEnabled({ search: '' }), false);
assert.equal(api.isInstantSignupUiEnabled({ search: '?utm=1' }), false);
assert.equal(api.isInstantSignupUiEnabled({ search: '?instant_signup=1' }), true);
assert.equal(api.isFallbackRequested({ search: '?signup=fallback' }), true);
assert.equal(api.isFallbackRequested({ search: '' }), false);

assert.equal(api.isPlaceholderSiteKey(), true);
assert.equal(api.isPlaceholderSiteKey('REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY'), true);
assert.equal(api.isPlaceholderSiteKey('abc123'), false);
assert.match(instantSrc, /GRANT MUST REPLACE/);
assert.match(instantSrc, /reCAPTCHA Enterprise/);

assert.equal(
  api.getClubCreateEndpoint({ search: '' }),
  api.SELF_SERVICE_CREATE_ENDPOINT,
  'default path keeps createSelfServiceClub'
);
assert.equal(
  api.getClubCreateEndpoint({ search: '?instant_signup=1' }),
  api.INSTANT_CREATE_ENDPOINT
);
assert.match(api.INSTANT_CREATE_ENDPOINT, /europe-west2-boxleague-pro\.cloudfunctions\.net\/createInstantClub/);

const created = api.interpretInstantSignupResponse({
  ok: true,
  httpStatus: 201,
  body: { status: 'created', reason: 'created', clubId: 'club-1', slug: 'riverside-tennis', name: 'Riverside Tennis' }
});
assert.equal(created.action, 'redirect');
assert.equal(created.slug, 'riverside-tennis');
assert.equal(created.clubId, 'club-1');
assert.equal(created.alreadyProvisioned, false);
assert.equal(api.clubRedirectUrl(created.slug), '/app.html?club=riverside-tennis');

const existing = api.interpretInstantSignupResponse({
  ok: true,
  httpStatus: 200,
  body: { status: 'created', reason: 'already_provisioned', clubId: 'club-9', slug: 'existing-club', idempotent: true }
});
assert.equal(existing.action, 'redirect');
assert.equal(existing.alreadyProvisioned, true);

const held = api.interpretInstantSignupResponse({
  ok: true,
  httpStatus: 200,
  body: { status: 'hold', reason: 'hold_near_duplicate_name', code: 'HELD', error: 'That club name is very close to an existing club.' }
});
assert.equal(held.action, 'held');
assert.equal(held.message, "We'll review and email you shortly.");

const slugTaken = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 409,
  body: { status: 'hold', reason: 'hold_slug_taken', code: 'SLUG_TAKEN', error: 'That club link is already in use.' }
});
assert.equal(slugTaken.action, 'slug_taken');
assert.match(slugTaken.message, /Try another name/);

const disabled = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 503,
  body: { error: 'Instant club sign-up is not enabled yet.', code: 'FEATURE_DISABLED' }
});
assert.equal(disabled.action, 'fallback');
assert.equal(disabled.reason, 'FEATURE_DISABLED');

const network = api.interpretInstantSignupResponse({ networkError: true });
assert.equal(network.action, 'fallback');

const failed = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 500,
  body: { error: 'Club creation failed.', code: 'INTERNAL' }
});
assert.equal(failed.action, 'fallback');

const verify = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 403,
  body: { error: 'A verified email address is required to create a club.', code: 'EMAIL_NOT_VERIFIED' }
});
assert.equal(verify.action, 'verify_email');

const disposable = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 400,
  body: { code: 'DISPOSABLE_EMAIL', reason: 'skip_disposable_email', error: 'Use a regular club or personal email address, not a temporary one.' }
});
assert.equal(disposable.action, 'error');
assert.match(disposable.message, /regular club or personal email/);

const bot = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 403,
  body: { code: 'BOT_PROTECTION_REQUIRED', error: 'Bot protection is required to create a club.' }
});
assert.equal(bot.action, 'fallback');

const origin = api.interpretInstantSignupResponse({
  ok: false,
  httpStatus: 403,
  body: { code: 'ORIGIN_DENIED', error: 'Origin not allowed.' }
});
assert.equal(origin.action, 'error');
assert.match(origin.message, /boxleaguepro\.com/);

assert.equal(api.needsEmailVerification({ emailVerified: false, providerData: [{ providerId: 'google.com' }] }), false);
assert.equal(api.needsEmailVerification({ emailVerified: false, providerData: [{ providerId: 'password' }] }), true);
assert.equal(api.needsEmailVerification({ emailVerified: true, providerData: [{ providerId: 'password' }] }), false);

const user = { uid: 'uid-1', email: 'ORGANISER@Example.com', displayName: 'Alex Taylor' };
const request = api.buildInstantClubRequest({ name: 'Riverside Tennis Club', sport: 'tennis', confirmed: true }, user);
assert.equal(request.sport, 'tennis');
assert.equal(request.format, 'singles');
assert.equal(request.organiser.email, 'organiser@example.com');
assert.equal(api.buildInstantClubRequest({ name: 'Court One', sport: 'padel', confirmed: true }, user).format, 'doubles');
assert.throws(() => api.buildInstantClubRequest({ name: 'Riverside Tennis Club', sport: 'tennis', confirmed: false }, user), /authorised/);
assert.throws(() => api.buildInstantClubRequest({ name: 'X', sport: 'tennis', confirmed: true }, user), /3 and 80/);

assert.match(applyHtml, /id="instant-card"/);
assert.match(applyHtml, /class="card instant-hidden"/);
assert.match(applyHtml, /id="ghl-card"/);
assert.match(applyHtml, /NZUQTviINhMuoejOVGQB/);
assert.match(applyHtml, /about 2 minutes/);
assert.match(applyHtml, /<option value="tennis">Tennis<\/option>/);
assert.match(applyHtml, /<option value="padel">Padel<\/option>/);
assert.match(applyHtml, /<option value="squash">Squash<\/option>/);
assert.match(applyHtml, /<option value="racketball">Racketball<\/option>/);
assert.match(applyHtml, /<option value="badminton">Badminton<\/option>/);
assert.match(applyHtml, /instant-held/);
assert.equal(/Grant de Swardt/i.test(applyHtml), false);

assert.match(appHtml, /INSTANT_SIGNUP_CREATE_ENDPOINT[\s\S]+createInstantClub/);
assert.match(appHtml, /createSelfServiceClub/);
assert.match(appHtml, /firebase-app-check-compat\.js/);
assert.match(appHtml, /initialiseAppCheck/);
assert.match(appHtml, /interpretInstantSignupResponse/);
assert.match(appHtml, /id="self-club-held"/);
assert.match(appHtml, /APPLY_FALLBACK_PATH|signup=fallback/);

const instantCopy = [
  api.HELD_MESSAGE,
  api.SLUG_TAKEN_MESSAGE,
  api.FALLBACK_MESSAGE,
  api.CRM_PRIVACY_NOTE,
  api.ONE_CLUB_NOTE,
  api.TOUR_CLUB_LINK_TEXT,
  api.HELP_SETUP_TEXT,
  api.LANDING_COPY['cta-apply'],
  api.LANDING_COPY['how-step'],
  api.LANDING_COPY['faq-added']
].join('\n');
assert.doesNotMatch(instantCopy, /\*/);
assert.doesNotMatch(instantCopy, /Grant de Swardt/i);
assert.match(instantCopy, /about 2 minutes/);
assert.match(instantCopy, /tennis/);
assert.match(instantCopy, /padel/);
assert.match(instantCopy, /squash/);
assert.match(instantCopy, /racketball/);
assert.match(instantCopy, /badminton/);
assert.match(instantCopy, /BoxLeague Pro|we /i);

console.log('instant-signup.test.js: all assertions passed');
