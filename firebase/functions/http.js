'use strict';

const { HttpError, createClub } = require('./core');

function bearerToken(header) {
  const match = /^Bearer\s+(.+)$/i.exec(String(header || ''));
  if (!match) throw new HttpError(401, 'Missing Firebase bearer token.', 'UNAUTHENTICATED');
  return match[1];
}

function createClubHandler({ db, verifyIdToken, allowedOrigins = [] }) {
  return async function handler(req, res) {
    const origin = String(req.headers.origin || '');
    if (!origin || !allowedOrigins.includes(origin)) {
      res.status(403).json({ error: 'Origin not allowed.', code: 'ORIGIN_DENIED' });
      return;
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, Idempotency-Key');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    if (req.method === 'OPTIONS') { res.status(204).end(); return; }
    if (req.method !== 'POST') { res.status(405).json({ error: 'Method not allowed.', code: 'METHOD_NOT_ALLOWED' }); return; }
    try {
      const token = bearerToken(req.headers.authorization);
      let decoded;
      try {
        decoded = await verifyIdToken(token);
      } catch (error) {
        throw new HttpError(401, 'Invalid or expired Firebase bearer token.', 'UNAUTHENTICATED');
      }
      const result = await createClub(db, req.body || {}, {
        uid: decoded.uid,
        email: decoded.email,
        emailVerified: decoded.email_verified === true,
        name: decoded.name || ''
      }, { idempotencyKey: req.headers['idempotency-key'] });
      res.status(result.idempotent ? 200 : 201).json(result);
    } catch (error) {
      const status = error instanceof HttpError ? error.status : 500;
      res.status(status).json({ error: status === 500 ? 'Club creation failed.' : error.message, code: error.code || 'INTERNAL' });
    }
  };
}

module.exports = { bearerToken, createClubHandler };
