'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { initializeApp, deleteApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { assertFails, assertSucceeds, initializeTestEnvironment } = require('@firebase/rules-unit-testing');
const { createClubHandler } = require('../http');

const projectId = 'demo-boxleague-pro-self-service';
const rules = fs.readFileSync(path.resolve(__dirname, '../../../firebase.rules.json'), 'utf8');
const identities = {
  'token-a': { uid: 'uid-a', email: 'alice.organiser@example.com', email_verified: true, name: 'Alice Organiser' },
  'token-b': { uid: 'uid-b', email: 'bob.organiser@example.com', email_verified: true, name: 'Bob Organiser' },
  'token-unverified': { uid: 'uid-u', email: 'unverified@example.com', email_verified: false, name: 'Unverified' }
};

function mockResponse() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    end() { return this; }
  };
}

async function invoke(handler, { token, body, key, origin = 'https://boxleaguepro.com', method = 'POST' }) {
  const req = {
    method,
    body: body || {},
    headers: {
      origin,
      authorization: token ? `Bearer ${token}` : '',
      'idempotency-key': key || ''
    }
  };
  const res = mockResponse();
  await handler(req, res);
  return res;
}

function request(slug, overrides = {}) {
  return {
    name: 'Riverside Tennis Club',
    slug,
    sport: 'tennis',
    format: 'singles',
    scoringSystem: 'default',
    bookingUrl: 'https://clubspark.lta.org.uk/riverside',
    organiser: { uid: 'attacker', email: 'attacker@example.com', displayName: 'Attacker' },
    ...overrides
  };
}

async function run() {
  const testEnv = await initializeTestEnvironment({
    projectId,
    database: { host: '127.0.0.1', port: 9002, rules }
  });
  const adminApp = initializeApp({ projectId, databaseURL: `http://127.0.0.1:9002?ns=${projectId}` }, 'self-service-emulator-test');
  const db = getDatabase(adminApp);
  await testEnv.clearDatabase();
  const handler = createClubHandler({
    db,
    verifyIdToken: async (token) => {
      if (!identities[token]) throw new Error('invalid token');
      return identities[token];
    },
    allowedOrigins: ['https://boxleaguepro.com']
  });

  try {
    let res = await invoke(handler, { body: request('no-auth-club'), key: 'request001' });
    assert.equal(res.statusCode, 401);

    res = await invoke(handler, { token: 'invalid-token', body: request('bad-token-club'), key: 'request001a' });
    assert.equal(res.statusCode, 401);
    assert.equal(res.body.code, 'UNAUTHENTICATED');

    res = await invoke(handler, { token: 'token-a', body: request('bad-origin-club'), key: 'request002', origin: 'https://evil.example' });
    assert.equal(res.statusCode, 403);

    res = await invoke(handler, { token: 'token-a', body: request('missing-origin-club'), key: 'request002a', origin: '' });
    assert.equal(res.statusCode, 403);

    res = await invoke(handler, { token: 'token-unverified', body: request('unverified-club'), key: 'request002b' });
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.code, 'EMAIL_NOT_VERIFIED');

    res = await invoke(handler, { token: 'token-a', body: request('riverside-tennis-club'), key: 'request003' });
    assert.equal(res.statusCode, 201);
    assert.equal(res.body.idempotent, false);
    const firstClubId = res.body.clubId;

    const snapshot = await db.ref().once('value');
    assert.equal(snapshot.child(`clubsBySlug/riverside-tennis-club`).val(), firstClubId);
    assert.equal(snapshot.child(`clubs/${firstClubId}/createdByUid`).val(), 'uid-a');
    assert.equal(snapshot.child(`clubs/${firstClubId}/organiserEmail`).val(), 'alice.organiser@example.com');
    assert.equal(snapshot.child(`clubAdmins/${firstClubId}/alice,organiser@example,com`).val(), true);
    assert.equal(snapshot.child(`clubAdmins/${firstClubId}/attacker@example,com`).exists(), false);
    assert.equal(snapshot.child('users/uid-a/homeClub/id').val(), firstClubId);

    res = await invoke(handler, { token: 'token-a', body: request('riverside-tennis-club'), key: 'request003' });
    assert.equal(res.statusCode, 200);
    assert.equal(res.body.clubId, firstClubId);
    assert.equal(res.body.idempotent, true);

    res = await invoke(handler, { token: 'token-b', body: request('riverside-tennis-club'), key: 'request004' });
    assert.equal(res.statusCode, 409);
    assert.equal(res.body.code, 'SLUG_TAKEN');

    res = await invoke(handler, { token: 'token-b', body: request('padel-doubles-club', { sport: 'padel', format: 'singles' }), key: 'request005' });
    assert.equal(res.statusCode, 201);
    assert.equal((await db.ref(`clubs/${res.body.clubId}/format`).once('value')).val(), 'doubles');
    const secondClubId = res.body.clubId;

    res = await invoke(handler, { token: 'token-a', body: request('invalid-url-club', { bookingUrl: 'javascript:alert(1)' }), key: 'request006' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_BOOKING_URL');

    res = await invoke(handler, { token: 'token-a', body: request('evil-url-club', { bookingUrl: 'https://evil.example/phish' }), key: 'request006a' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_BOOKING_URL');

    res = await invoke(handler, { token: 'token-a', body: request('impersonation-club', { name: 'Wimbledon Official' }), key: 'request006b' });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.code, 'INVALID_NAME');

    res = await invoke(handler, { token: 'token-b', body: request('bob-second-club'), key: 'request007' });
    assert.equal(res.statusCode, 201);
    res = await invoke(handler, { token: 'token-b', body: request('bob-rate-limited-club'), key: 'request008' });
    assert.equal(res.statusCode, 429);
    assert.equal(res.body.code, 'RATE_LIMITED');

    const alice = testEnv.authenticatedContext('uid-a', { email: 'alice.organiser@example.com' });
    const bob = testEnv.authenticatedContext('uid-b', { email: 'bob.organiser@example.com' });
    await assertSucceeds(alice.database().ref(`clubs/${firstClubId}`).once('value'));
    await assertFails(alice.database().ref(`clubs/${secondClubId}`).once('value'));
    await assertSucceeds(bob.database().ref(`clubs/${secondClubId}`).once('value'));
    await assertFails(bob.database().ref(`clubs/${firstClubId}`).once('value'));
    await assertFails(alice.database().ref('clubsBySlug/browser-created').set('forged-club'));
    await assertFails(alice.database().ref('clubs/forged-club').set({ name: 'Forged' }));
    await assertFails(alice.database().ref(`clubAdmins/${secondClubId}/alice,organiser@example,com`).set(true));
    await assertFails(alice.database().ref('selfServiceClubRequests/uid-a/forged').set({ status: 'completed' }));

    const clubs = (await db.ref('clubs').once('value')).numChildren();
    assert.equal(clubs, 3, 'failed, duplicate, rate-limited and idempotent requests must not create extra clubs');
    console.log(JSON.stringify({
      endpoint: { unauthenticated: 'PASS', invalidToken: 'PASS', origin: 'PASS', create: 'PASS', tamperProtection: 'PASS', idempotency: 'PASS', slugConflict: 'PASS', padelDoubles: 'PASS', validation: 'PASS', rateLimit: 'PASS' },
      rules: { ownClubRead: 'PASS', crossClubIsolation: 'PASS', directCreationDenied: 'PASS', adminEscalationDenied: 'PASS', ledgerDenied: 'PASS' },
      clubsCreated: clubs
    }, null, 2));
  } finally {
    await deleteApp(adminApp);
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error(error.stack || error);
  process.exitCode = 1;
});
