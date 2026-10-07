'use strict';

const assert = require('node:assert/strict');
const { cleanRequest } = require('../core');

const verified = { uid: 'uid-1', email: 'organiser@example.com', emailVerified: true };
const valid = {
  name: 'Riverside Tennis Club', slug: 'riverside-tennis-club', sport: 'tennis',
  format: 'singles', scoringSystem: 'default', bookingUrl: 'https://clubspark.lta.org.uk/riverside'
};

assert.throws(() => cleanRequest(valid, { ...verified, emailVerified: false }), (error) => error.code === 'EMAIL_NOT_VERIFIED');
assert.throws(() => cleanRequest({ ...valid, name: 'Wimbledon Official' }, verified), (error) => error.code === 'INVALID_NAME');
assert.throws(() => cleanRequest({ ...valid, name: '<img onerror=alert(1)>' }, verified), (error) => error.code === 'INVALID_NAME');
assert.throws(() => cleanRequest({ ...valid, bookingUrl: 'https://evil.example/phish' }, verified), (error) => error.code === 'INVALID_BOOKING_URL');
assert.equal(cleanRequest(valid, verified).bookingUrl, valid.bookingUrl);
assert.equal(cleanRequest({ ...valid, bookingUrl: '' }, verified).bookingUrl, '');

console.log('Self-service security validation passed.');
