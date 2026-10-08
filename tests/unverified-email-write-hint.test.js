const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

const HINT = 'Please verify your email to do this. Check your inbox for the verification link.';
const RESEND = 'Resend verification email';
const REFRESH = "I've verified";

assert.match(html, /const UNVERIFIED_EMAIL_WRITE_HINT = 'Please verify your email to do this\. Check your inbox for the verification link\.'/);
assert.match(html, /id="verify-email-write-resend"[^>]*>Resend verification email/);
assert.match(html, /id="verify-email-write-refresh"[^>]*>I've verified/);
assert.doesNotMatch(HINT, /\*/);
assert.doesNotMatch(RESEND, /\*/);
assert.doesNotMatch(REFRESH, /\*/);
assert.doesNotMatch(HINT, /AIFA|AI FUSION|AI Fusion/i);
assert.doesNotMatch(RESEND, /AIFA|AI FUSION|AI Fusion/i);

function sliceBetween(startText, endText) {
  const start = html.indexOf(startText);
  const end = html.indexOf(endText, start);
  assert.ok(start >= 0 && end > start, 'Could not extract ' + startText);
  return html.slice(start, end);
}

const joinSource = sliceBetween('function joinAndEnterLeague(', 'function adminEnterLeague(');
assert.match(joinSource, /reportUnverifiedEmailWriteError\(err/);
assert.match(joinSource, /Could not join league: /);

const preallocSource = sliceBetween('function runEmailPreallocation(', '// v4.8.0: Is the current user a clubAdmin');
assert.match(preallocSource, /reportUnverifiedEmailWriteError\(err\)/);
assert.match(preallocSource, /Pre-allocation write failed:/);

const profileSource = sliceBetween('function saveProfile()', '// ── Signup consent ──');
assert.match(profileSource, /reportUnverifiedEmailWriteError\(e, \{ once: true \}\)/);
assert.match(profileSource, /console\.warn\('\[profile\] save user-level partners failed'/);
assert.equal((profileSource.match(/reportProfileSaveError\(err, errEl\)/g) || []).length, 4);
assert.match(html, /errEl\.textContent = 'Save failed: ' \+ err\.message/);

const homeClubSource = sliceBetween("db.ref('/users/' + currentUser.uid + '/homeClub').set(userHomeClub).catch", 'runEmailPreallocation(result.id');
assert.match(homeClubSource, /console\.error\('homeClub persist failed:', err\)/);
assert.match(homeClubSource, /reportUnverifiedEmailWriteError\(err, \{ once: true \}\)/);

const createOm = sliceBetween('function createOpenMatch()', 'function joinOpenMatch(');
assert.match(createOm, /reportUnverifiedEmailWriteError\(err/);
assert.match(createOm, /Could not create game: /);

const joinOm = sliceBetween('function joinOpenMatch(', 'function leaveOpenMatch(');
assert.match(joinOm, /reportUnverifiedEmailWriteError\(err/);
assert.match(joinOm, /Error joining — try again/);

const leaveOm = sliceBetween('function leaveOpenMatch(', 'function toggleOmCourtBooked(');
assert.match(leaveOm, /reportUnverifiedEmailWriteError\(err/);
assert.match(leaveOm, /Could not leave: /);

assert.match(html, /async function resendUnverifiedEmailWriteHint\(\)/);
assert.match(html, /resendSelfServiceVerificationEmail\(\)/);
assert.match(html, /user\.sendEmailVerification\(getEmailVerificationActionSettings\(\)\)/);
assert.match(html, /async function refreshUnverifiedEmailWriteHint\(\)/);
assert.match(html, /user\.getIdToken\(true\)/);

function makeDom() {
  const nodes = {
    'verify-email-write-hint': { style: { display: 'none' } },
    'verify-email-write-hint-text': { textContent: '' },
    'verify-email-write-resend': { disabled: false, textContent: RESEND }
  };
  return {
    nodes,
    getElementById(id) { return nodes[id] || null; }
  };
}

function loadHelpers(overrides) {
  const helpers = sliceBetween(
    "const UNVERIFIED_EMAIL_WRITE_HINT = '",
    'function showAuthError('
  );
  const document = makeDom();
  const context = {
    document,
    currentUser: null,
    auth: { currentUser: null },
    lastVerificationEmailAt: 0,
    VERIFICATION_RESEND_WAIT_MS: 60000,
    setTimeout() {},
    console,
    Date,
    String,
    resendSelfServiceVerificationEmail: async function() {},
    ...overrides
  };
  if (overrides && overrides.document) context.document = overrides.document;
  vm.createContext(context);
  vm.runInContext(helpers, context);
  return { context, document: context.document };
}

const permErr = { code: 'PERMISSION_DENIED', message: 'PERMISSION_DENIED: Permission denied' };
const otherErr = { code: 'NETWORK_ERROR', message: 'client is offline' };

assert.equal(loadHelpers().context.isPermissionDeniedError(permErr), true);
assert.equal(loadHelpers().context.isPermissionDeniedError({ message: 'Permission denied' }), true);
assert.equal(loadHelpers().context.isPermissionDeniedError(otherErr), false);
assert.equal(loadHelpers().context.isPermissionDeniedError(null), false);

assert.equal(loadHelpers().context.isCurrentUserEmailUnverified({
  uid: 'u1', emailVerified: false
}), true);
assert.equal(loadHelpers().context.isCurrentUserEmailUnverified({
  uid: 'u1', emailVerified: true
}), false);
assert.equal(loadHelpers().context.isCurrentUserEmailUnverified({
  uid: 'demo', emailVerified: false
}), false);
assert.equal(loadHelpers().context.isCurrentUserEmailUnverified(null), false);

async function runHandle(user, err, options) {
  const reloads = [];
  const currentUser = user && {
    ...user,
    reload: async function() { reloads.push(true); }
  };
  const { context, document } = loadHelpers({ currentUser });
  const handled = await context.maybeHandleUnverifiedEmailWriteError(err, options);
  return { handled, context, document, reloads };
}

(async function() {
  const unverified = await runHandle({ uid: 'u1', emailVerified: false }, permErr);
  assert.equal(unverified.handled, true);
  assert.equal(unverified.reloads.length, 1, 'reload the user before deciding');
  assert.equal(unverified.document.nodes['verify-email-write-hint'].style.display, 'block');
  assert.equal(unverified.document.nodes['verify-email-write-hint-text'].textContent, HINT);

  const verified = await runHandle({ uid: 'u1', emailVerified: true }, permErr);
  assert.equal(verified.handled, false);
  assert.equal(verified.document.nodes['verify-email-write-hint'].style.display, 'none');

  const other = await runHandle({ uid: 'u1', emailVerified: false }, otherErr);
  assert.equal(other.handled, false);
  assert.equal(other.document.nodes['verify-email-write-hint'].style.display, 'none');
  assert.equal(other.reloads.length, 0, 'do not reload unless the error is permission-denied');

  const demo = await runHandle({ uid: 'demo', emailVerified: false }, permErr);
  assert.equal(demo.handled, false);

  const errEl = { textContent: '', style: { display: 'none' } };
  const profile = await runHandle({ uid: 'u1', emailVerified: false }, permErr, { errorEl: errEl });
  assert.equal(profile.handled, true);
  assert.equal(errEl.textContent, HINT);
  assert.equal(errEl.style.display, 'block');

  const first = await runHandle({ uid: 'u1', emailVerified: false }, permErr, { once: true });
  assert.equal(first.handled, true);
  first.context.unverifiedEmailWriteHintShown = true;
  first.document.nodes['verify-email-write-hint'].style.display = 'none';
  const second = await first.context.maybeHandleUnverifiedEmailWriteError(permErr, { once: true });
  assert.equal(second, true);
  assert.equal(first.document.nodes['verify-email-write-hint'].style.display, 'none',
    'silent paths must not re-show the notice');

  let fallbackCalled = false;
  const { context } = loadHelpers({
    currentUser: { uid: 'u1', emailVerified: true, reload: async function() {} }
  });
  await context.reportUnverifiedEmailWriteError(permErr, null, function() { fallbackCalled = true; });
  assert.equal(fallbackCalled, true, 'verified users keep the existing error path');

  fallbackCalled = false;
  const unverifiedReport = loadHelpers({
    currentUser: { uid: 'u1', emailVerified: false, reload: async function() {} }
  });
  await unverifiedReport.context.reportUnverifiedEmailWriteError(permErr, null, function() { fallbackCalled = true; });
  assert.equal(fallbackCalled, false, 'unverified permission-denied must not use the raw error');

  console.log('unverified-email-write-hint.test.js: all assertions passed');
})().catch(function(err) {
  console.error(err);
  process.exit(1);
});
