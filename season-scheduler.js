/*
 * Deterministic round-robin fixture planning for BoxLeague Pro.
 *
 * This file deliberately has no Firebase or DOM dependency. The app uses it
 * to preview and publish a plan, while the same functions are tested in Node.
 */
(function(root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BoxLeagueSeasonScheduler = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function asDate(dateString) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateString || ''))) {
      throw new Error('Choose the first fixture date.');
    }
    var date = new Date(dateString + 'T12:00:00');
    if (Number.isNaN(date.getTime())) throw new Error('Choose a valid fixture date.');
    return date;
  }

  function formatDate(date) {
    return date.getFullYear() + '-' + String(date.getMonth() + 1).padStart(2, '0') + '-' + String(date.getDate()).padStart(2, '0');
  }

  function addDays(dateString, days) {
    var date = asDate(dateString);
    date.setDate(date.getDate() + days);
    return formatDate(date);
  }

  function matchKey(a, b) {
    return [String(a), String(b)].sort().join('~~');
  }

  function validateGroups(groups) {
    if (!Array.isArray(groups) || groups.length < 2) {
      throw new Error('Add at least two players or teams before creating a season draw.');
    }
    if (groups.length % 2 !== 0) {
      throw new Error('A complete weekly draw needs an even number of players or teams. Add one more or remove one, then try again.');
    }
    var ids = groups.map(function(group) { return group && group.id; });
    if (ids.some(function(id) { return !id; }) || new Set(ids).size !== ids.length) {
      throw new Error('Every player or team needs a unique identifier before creating a season draw.');
    }
  }

  // Circle method: each participant appears exactly once in every round and
  // every unique pairing appears exactly once across the full season.
  function buildRoundRobinRounds(groups) {
    validateGroups(groups);
    var rotation = groups.slice();
    var rounds = [];
    var totalRounds = rotation.length - 1;
    var matchesPerRound = rotation.length / 2;

    for (var roundIndex = 0; roundIndex < totalRounds; roundIndex++) {
      var matches = [];
      for (var pairIndex = 0; pairIndex < matchesPerRound; pairIndex++) {
        var left = rotation[pairIndex];
        var right = rotation[rotation.length - 1 - pairIndex];
        // Alternate the displayed home side for a balanced, readable draw.
        var home = pairIndex === 0 && roundIndex % 2 === 1 ? right : left;
        var away = home === left ? right : left;
        matches.push({
          homeId: home.id,
          awayId: away.id,
          matchKey: matchKey(home.id, away.id)
        });
      }
      rounds.push({ number: roundIndex + 1, matches: matches });

      // Keep the first participant fixed and rotate everyone else clockwise.
      rotation = [rotation[0], rotation[rotation.length - 1]].concat(rotation.slice(1, rotation.length - 1));
    }

    return rounds;
  }

  function buildSeasonPlan(groups, options) {
    options = options || {};
    var firstDate = formatDate(asDate(options.firstDate));
    var slot = String(options.slot || '1800');
    var rounds = buildRoundRobinRounds(groups);
    var bookings = {};
    var totalRounds = rounds.length;

    rounds.forEach(function(round, index) {
      var date = addDays(firstDate, index * 7);
      round.date = date;
      round.matches.forEach(function(match) {
        bookings[match.matchKey] = {
          date: date,
          slot: slot,
          notes: 'Season fixture: round ' + round.number + ' of ' + totalRounds,
          courtBooked: false,
          agreed: {},
          seasonFixture: true,
          seasonRound: round.number,
          seasonTotalRounds: totalRounds
        };
      });
    });

    return {
      firstDate: firstDate,
      slot: slot,
      totalRounds: totalRounds,
      matchesPerRound: groups.length / 2,
      fixtureCount: Object.keys(bookings).length,
      rounds: rounds,
      bookings: bookings
    };
  }

  // Each completed score row is one game. The numerical scores inside that
  // row are rally totals used for countback, not league points.
  function gamePointsForResult(result, side) {
    if (!result || result.walkover) return 0;
    var value = side === 'A' ? result.setsA : result.setsB;
    value = Number(value);
    return Number.isFinite(value) && value >= 0 ? value : 0;
  }

  return {
    addDays: addDays,
    buildRoundRobinRounds: buildRoundRobinRounds,
    buildSeasonPlan: buildSeasonPlan,
    gamePointsForResult: gamePointsForResult,
    matchKey: matchKey
  };
});
