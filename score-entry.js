/*
 * Sport-aware score-entry rules for BoxLeague Pro.
 *
 * This module has no DOM or Firebase dependency so score validity can be
 * tested independently from the browser UI.
 */
(function(root, factory) {
  var api = factory();
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.BoxLeagueScoreEntry = api;
})(typeof window !== 'undefined' ? window : globalThis, function() {
  function normalizedSport(sport) {
    return String(sport || '').trim().toLowerCase();
  }

  function isSquash(sport) {
    return normalizedSport(sport) === 'squash';
  }

  function inputMax(sport) {
    return isSquash(sport) ? 99 : 13;
  }

  function validateLine(scoreA, scoreB, sport) {
    var a = Number(scoreA);
    var b = Number(scoreB);
    var max = inputMax(sport);

    if (!Number.isInteger(a) || !Number.isInteger(b) || a < 0 || b < 0) {
      return { valid: false, message: 'Enter whole, non-negative scores for both players.' };
    }
    if (a > max || b > max) {
      return { valid: false, message: 'Scores must be ' + max + ' or lower.' };
    }
    if (a === b) {
      return { valid: false, message: 'A completed game cannot finish level.' };
    }
    if (!isSquash(sport)) return { valid: true, message: '' };

    var winner = Math.max(a, b);
    var loser = Math.min(a, b);
    if (winner < 15) {
      return { valid: false, message: 'Squash games must be won with at least 15 points.' };
    }
    if (winner === 15 && loser > 13) {
      return { valid: false, message: 'At 14-14, play continues until one player leads by two.' };
    }
    if (winner > 15 && (loser < 14 || winner - loser !== 2)) {
      return { valid: false, message: 'Extended squash games must finish with a two-point margin after 14-14.' };
    }
    return { valid: true, message: '' };
  }

  return {
    inputMax: inputMax,
    isSquash: isSquash,
    validateLine: validateLine
  };
});
