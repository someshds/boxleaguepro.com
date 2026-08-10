const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const scheduler = require('../season-scheduler.js');

const html = fs.readFileSync(require.resolve('../app.html'), 'utf8');
assert.match(html, /<script src="score-entry\.js"><\/script>/, 'app must load score-entry rules');
assert.match(html, /BoxLeagueScoreEntry\.inputMax\(scoreSport\)/, 'score modal must use sport-aware input limits');
assert.match(html, /BoxLeagueScoreEntry\.validateLine\(a, b, scoreSport\)/, 'score save must validate sport rules');
const start = html.indexOf('const SCORING_PRESETS = {');
const end = html.indexOf('function setScopedSetupStep', start);
assert.ok(start >= 0 && end > start, 'could not locate the scoring code in app.html');

const context = vm.createContext({
  window: { BoxLeagueSeasonScheduler: scheduler },
  console
});
const scoringSource = html.slice(start, end) + `
globalThis.__points = [
  calculateMatchPoints(SCORING_PRESETS['game-won'], { setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: false, winner: 'A' }, true, 'A'),
  calculateMatchPoints(SCORING_PRESETS['game-won'], { setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: false, winner: 'A' }, false, 'B'),
  calculateMatchPoints(SCORING_PRESETS['game-won'], { setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: true, winner: 'A' }, true, 'A'),
  calculateMatchPoints(SCORING_PRESETS['default'], { setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: false, winner: 'A' }, true, 'A')
];
`;

vm.runInContext(scoringSource, context);
assert.deepEqual(Array.from(context.__points), [1, 0, 0, 3]);

console.log('scoring-integration.test.js: all assertions passed');
