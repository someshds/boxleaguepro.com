const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

assert.match(
  html,
  /https:\/\/www\.gstatic\.com\/firebasejs\/9\.23\.0\/firebase-app-check-compat\.js/,
  'App Check must use the same Firebase 9.23.0 compat CDN as the rest of the app'
);

assert.match(
  html,
  /const APP_CHECK_SITE_KEY = '';/,
  'APP_CHECK_SITE_KEY must exist and stay empty until a site key is pasted'
);

const initStart = html.indexOf('app = firebase.initializeApp');
assert.ok(initStart >= 0, 'firebase.initializeApp not found');
const initEnd = html.indexOf('auth = firebase.auth()', initStart);
assert.ok(initEnd > initStart, 'App Check init must sit between initializeApp and auth');
const initBlock = html.slice(initStart, initEnd);

assert.match(initBlock, /try\s*\{/, 'App Check init must be wrapped in try');
assert.match(initBlock, /catch\s*\(/, 'App Check init must be wrapped in catch');
assert.match(
  initBlock,
  /if\s*\(\s*APP_CHECK_SITE_KEY\s*\)/,
  'App Check init must be skipped when the site key is empty'
);
assert.match(
  initBlock,
  /ReCaptchaEnterpriseProvider/,
  'App Check must use the reCAPTCHA Enterprise provider'
);
assert.match(
  initBlock,
  /(?:const|let|var)\s+isTokenAutoRefreshEnabled\s*=\s*true|isTokenAutoRefreshEnabled:\s*true/,
  'isTokenAutoRefreshEnabled must be true'
);

assert.doesNotMatch(
  html,
  /FIREBASE_APPCHECK_DEBUG_TOKEN\s*=\s*['"][^'"]+['"]/,
  'must not ship a hardcoded App Check debug token'
);
assert.match(
  html,
  /hostname === 'localhost'[\s\S]+FIREBASE_APPCHECK_DEBUG_TOKEN = true/,
  'debug provider may be enabled on localhost only'
);

console.log('app-check.test.js: all assertions passed');
