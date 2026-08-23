const assert = require('assert');
const fs = require('fs');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');
const start = html.indexOf('function loadUserLeagues()');
const end = html.indexOf('\nfunction maybeAutoEnterScopedLeague()', start);
assert(start >= 0 && end > start, 'loadUserLeagues function not found');

const source = html.slice(start, end);
assert(!source.includes("db.ref('/clubs')"), 'loadUserLeagues must not enumerate /clubs');
assert(source.includes('userHomeClub && userHomeClub.id'), 'known home club should hydrate local search metadata');
assert(source.includes('window._scopedClub && window._scopedClub.id'), 'active scoped club should hydrate local search metadata');
assert(source.includes("db.ref('/userLeagues/' + currentUser.uid)"), 'user-scoped league read must remain');

console.log('read-isolation.test.js: all assertions passed');
