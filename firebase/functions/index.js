'use strict';

const { onRequest } = require('firebase-functions/v2/https');
const { initializeApp, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getDatabase } = require('firebase-admin/database');
const { createClubHandler } = require('./http');

if (!getApps().length) initializeApp();

exports.createSelfServiceClub = onRequest({
  region: 'europe-west2',
  timeoutSeconds: 30,
  memory: '256MiB',
  invoker: 'public'
}, createClubHandler({
  db: getDatabase(),
  verifyIdToken: (token) => getAuth().verifyIdToken(token, true),
  allowedOrigins: [
    'https://boxleaguepro.com',
    'https://www.boxleaguepro.com',
    'http://127.0.0.1:4175',
    'http://localhost:4175'
  ]
}));
