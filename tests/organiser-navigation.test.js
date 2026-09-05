const assert = require('node:assert/strict');
const fs = require('node:fs');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');

const homeStart = html.indexOf('function topBarGoHome()');
const homeEnd = html.indexOf('function clearScopedClub()', homeStart);
assert.ok(homeStart >= 0 && homeEnd > homeStart, 'could not locate topBarGoHome');
const homeSource = html.slice(homeStart, homeEnd);
assert.doesNotMatch(homeSource, /clearScopedClub\(\)/, 'Home must retain the active club scope');

const actionStart = html.indexOf('function scopedSetupAction(action)');
const actionEnd = html.indexOf('function getScopedClubShareUrl()', actionStart);
assert.ok(actionStart >= 0 && actionEnd > actionStart, 'could not locate scoped setup actions');
const actionSource = html.slice(actionStart, actionEnd);
assert.match(actionSource, /if \(action === 'scoring'\) scopedOpenScoringSettings\(\)/,
  'Scoring guide must open a real settings route');
assert.match(actionSource, /window\._pendingTab = 'setup';\s*adminEnterLeague\(leagueIds\[0\], scope\.id\)/,
  'Single-league clubs must enter organiser Settings directly');

const cardStart = html.indexOf('function cardHtml(lid, isMember)');
const cardEnd = html.indexOf("return '<div onclick=", cardStart);
assert.ok(cardStart >= 0 && cardEnd > cardStart, 'could not locate scoped league card routing');
const cardSource = html.slice(cardStart, cardEnd);
const adminBranch = cardSource.indexOf('if (isAdminHere)');
const memberBranch = cardSource.indexOf('else if (isMember)');
assert.ok(adminBranch >= 0 && memberBranch > adminBranch,
  'Club organiser routing must take precedence over player membership');
assert.match(cardSource, /adminEnterLeague/, 'Club organiser cards must use organiser entry');

console.log('organiser-navigation.test.js: all assertions passed');
