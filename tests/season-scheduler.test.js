const assert = require('node:assert/strict');
const scheduler = require('../season-scheduler.js');

const players = Array.from({ length: 10 }, (_, index) => ({
  id: 'player-' + (index + 1),
  name: 'Player ' + (index + 1)
}));

const plan = scheduler.buildSeasonPlan(players, { firstDate: '2026-08-06', slot: '1730' });

assert.equal(plan.totalRounds, 9, '10 players need nine rounds');
assert.equal(plan.matchesPerRound, 5, '10 players need five matches per round');
assert.equal(plan.fixtureCount, 45, '10 players produce 45 unique pairings');
assert.equal(plan.rounds[0].date, '2026-08-06');
assert.equal(plan.rounds[8].date, '2026-10-01');

const pairings = new Set();
plan.rounds.forEach((round) => {
  assert.equal(round.matches.length, 5, 'each round has five matches');
  const usedThisRound = new Set();
  round.matches.forEach((match) => {
    assert.ok(!pairings.has(match.matchKey), 'pairing is only scheduled once');
    pairings.add(match.matchKey);
    assert.ok(!usedThisRound.has(match.homeId), 'participant appears once per round');
    assert.ok(!usedThisRound.has(match.awayId), 'participant appears once per round');
    usedThisRound.add(match.homeId);
    usedThisRound.add(match.awayId);
    assert.equal(plan.bookings[match.matchKey].date, round.date);
    assert.equal(plan.bookings[match.matchKey].slot, '1730');
  });
  assert.equal(usedThisRound.size, 10, 'all ten players appear in every round');
});
assert.equal(pairings.size, 45);

assert.equal(scheduler.gamePointsForResult({ setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: false }, 'A'), 1);
assert.equal(scheduler.gamePointsForResult({ setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: false }, 'B'), 0);
assert.equal(scheduler.gamePointsForResult({ setsA: 1, setsB: 0, gamesA: 15, gamesB: 9, walkover: true }, 'A'), 0);
assert.throws(() => scheduler.buildSeasonPlan(players.slice(0, 9), { firstDate: '2026-08-06', slot: '1730' }), /even number/);

console.log('season-scheduler.test.js: all assertions passed');
