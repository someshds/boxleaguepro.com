const assert = require('assert');
const playerEmail = require('../player-email');

assert.strictEqual(playerEmail.normalizeEmail(' Player.One@Example.COM '), 'player.one@example.com');
assert.strictEqual(playerEmail.emailKey('player.one@example.com'), 'player,one@example,com');
assert.throws(() => playerEmail.normalizeEmail('not-an-email'), /valid email/);

const plan = playerEmail.buildUpdates({
  clubId: 'heaven-farm',
  clubName: 'Heaven Farm',
  playerName: 'Alex Carter',
  email: 'Alex@example.com',
  now: 12345,
  updatedBy: 'organiser@example.com',
  activityPath: '/activityLog/log-1',
  assignments: [
    { leagueId: 'singles-1', groupKey: 'g1', emailField: 'email', leagueName: 'Singles', playerName: 'Alex Carter' },
    { leagueId: 'doubles-1', groupKey: '0', emailField: 'partnerEmail', leagueName: 'Doubles', playerName: 'Alex Carter', partnerName: 'Ben Foster' }
  ]
});

assert.strictEqual(plan.email, 'alex@example.com');
assert.strictEqual(plan.updates['/leagues/singles-1/groups/g1/email'], 'alex@example.com');
assert.strictEqual(plan.updates['/leagues/doubles-1/groups/0/partnerEmail'], 'alex@example.com');
assert.strictEqual(plan.updates['/clubPlayers/heaven-farm/alex@example,com/name'], 'Alex Carter');
assert.strictEqual(plan.updates['/clubPlayers/heaven-farm/alex@example,com/assignments/doubles-1'].role, 'partner');
assert.strictEqual(plan.updates['/activityLog/log-1'].action, 'set_player_email');
assert.strictEqual(plan.updates['/activityLog/log-1'].user, 'organiser@example.com');
assert.strictEqual(plan.updates['/activityLog/log-1'].timestamp, 12345);
assert.throws(() => playerEmail.buildUpdates({
  clubId: 'x', playerName: 'Alex', email: 'alex@example.com', now: 1, assignments: [{}]
}), /incomplete/);

console.log('player-email tests passed');
