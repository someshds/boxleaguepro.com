(function(root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BoxLeaguePlayerEmail = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  function normalizeEmail(value) {
    var email = String(value || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Enter a valid email address');
    }
    return email;
  }

  function emailKey(email) {
    return normalizeEmail(email).replace(/\./g, ',');
  }

  function buildUpdates(options) {
    options = options || {};
    var clubId = String(options.clubId || '').trim();
    var playerName = String(options.playerName || '').trim();
    var email = normalizeEmail(options.email);
    var key = emailKey(email);
    var now = options.now;
    var assignments = options.assignments || [];
    if (!clubId) throw new Error('Club is required');
    if (!playerName) throw new Error('Player name is required');
    if (now === undefined || now === null) throw new Error('Timestamp is required');
    if (!assignments.length) throw new Error('No editable league assignment found');

    var updates = {};
    var playerRoot = '/clubPlayers/' + clubId + '/' + key;
    updates[playerRoot + '/email'] = email;
    updates[playerRoot + '/name'] = playerName;
    updates[playerRoot + '/status'] = 'rostered';
    updates[playerRoot + '/source'] = 'organiser_email_update';
    updates[playerRoot + '/updatedAt'] = now;

    assignments.forEach(function(a) {
      var leagueId = String(a.leagueId || '').trim();
      var groupKey = String(a.groupKey === undefined ? '' : a.groupKey).trim();
      var field = a.emailField;
      if (!leagueId || !groupKey || (field !== 'email' && field !== 'partnerEmail')) {
        throw new Error('Player assignment is incomplete');
      }
      updates['/leagues/' + leagueId + '/groups/' + groupKey + '/' + field] = email;
      updates[playerRoot + '/assignments/' + leagueId] = {
        leagueName: a.leagueName || leagueId,
        playerName: a.playerName || playerName,
        partnerName: a.partnerName || '',
        role: field === 'partnerEmail' ? 'partner' : 'primary',
        updatedAt: now
      };
    });

    if (options.activityPath) {
      updates[options.activityPath] = {
        action: 'set_player_email',
        user: options.updatedBy || '',
        timestamp: now,
        clubId: clubId,
        clubName: options.clubName || '',
        playerName: playerName,
        playerEmail: email,
        updatedBy: options.updatedBy || ''
      };
    }
    return { email: email, emailKey: key, updates: updates };
  }

  return { normalizeEmail: normalizeEmail, emailKey: emailKey, buildUpdates: buildUpdates };
});
