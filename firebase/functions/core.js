'use strict';

const crypto = require('node:crypto');

const SPORTS = new Set(['tennis', 'padel', 'squash', 'racketball', 'badminton']);
const FORMATS = new Set(['singles', 'doubles', 'mixed']);
const SCORING = new Set(['default', 'competitive', 'participation', 'gameWins']);
const BOOKING_HOSTS = new Set([
  'clubspark.lta.org.uk',
  'www.clubspark.lta.org.uk',
  'playtomic.io',
  'www.playtomic.io',
  'matchi.se',
  'www.matchi.se'
]);
const RESERVED_CLUB_WORDS = /\b(?:boxleague|boxleague pro|wimbledon|official|administrator|admin|support)\b/i;

class HttpError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

function slugify(value) {
  return String(value || '').toLowerCase().normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .slice(0, 48).replace(/-+$/g, '');
}

function emailKey(email) {
  return String(email || '').trim().toLowerCase().replace(/\./g, ',');
}

function cleanRequest(input, identity) {
  if (!identity || !identity.uid || !identity.email || identity.emailVerified !== true) {
    throw new HttpError(403, 'Verify your email address before creating a club.', 'EMAIL_NOT_VERIFIED');
  }
  const name = String(input.name || '').trim();
  const slug = slugify(input.slug);
  const sport = String(input.sport || '');
  const format = sport === 'padel' ? 'doubles' : String(input.format || '');
  const scoringSystem = String(input.scoringSystem || '');
  const bookingUrl = String(input.bookingUrl || '').trim();
  if (name.length < 3 || name.length > 80) throw new HttpError(400, 'Club name must be between 3 and 80 characters.', 'INVALID_NAME');
  if (!/^[\p{L}\p{N}][\p{L}\p{N} .,'’&()\/-]*$/u.test(name) || /https?:\/\//i.test(name) || RESERVED_CLUB_WORDS.test(name)) {
    throw new HttpError(400, 'Club name contains unsupported or reserved wording.', 'INVALID_NAME');
  }
  if (!/^[a-z][a-z0-9-]{1,46}[a-z0-9]$/.test(slug)) throw new HttpError(400, 'Club link must be 3-48 characters and start with a letter.', 'INVALID_SLUG');
  if (!SPORTS.has(sport)) throw new HttpError(400, 'Unsupported sport.', 'INVALID_SPORT');
  if (!FORMATS.has(format)) throw new HttpError(400, 'Unsupported format.', 'INVALID_FORMAT');
  if (!SCORING.has(scoringSystem)) throw new HttpError(400, 'Unsupported scoring system.', 'INVALID_SCORING');
  if (bookingUrl) {
    let parsed;
    try { parsed = new URL(bookingUrl); } catch (error) { throw new HttpError(400, 'Booking URL must be a complete web address.', 'INVALID_BOOKING_URL'); }
    const host = parsed.hostname.toLowerCase().replace(/\.$/, '');
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || !BOOKING_HOSTS.has(host)) {
      throw new HttpError(400, 'Booking URL must use an approved booking provider.', 'INVALID_BOOKING_URL');
    }
  }
  return {
    name, slug, sport, format, scoringSystem, bookingUrl,
    organiser: {
      uid: identity.uid,
      email: identity.email.trim().toLowerCase(),
      displayName: String(identity.name || '').trim()
    }
  };
}

function safeIdempotencyKey(value, request, identity) {
  const supplied = String(value || '').trim();
  if (supplied && !/^[A-Za-z0-9_-]{8,80}$/.test(supplied)) throw new HttpError(400, 'Invalid idempotency key.', 'INVALID_IDEMPOTENCY_KEY');
  if (supplied) return supplied;
  return crypto.createHash('sha256').update(`${identity.uid}:${JSON.stringify(request)}`).digest('hex').slice(0, 40);
}

async function enforceRateLimit(db, uid, now) {
  const day = new Date(now).toISOString().slice(0, 10);
  const ref = db.ref(`selfServiceRateLimits/${uid}/${day}`);
  const result = await ref.transaction((current) => {
    const count = current && Number(current.count) || 0;
    if (count >= 3) return;
    return { count: count + 1, updatedAt: now };
  });
  if (!result.committed) throw new HttpError(429, 'Club creation limit reached. Contact support if you need another club.', 'RATE_LIMITED');
}

async function createClub(db, rawRequest, identity, options = {}) {
  const now = options.now || Date.now();
  const request = cleanRequest(rawRequest || {}, identity);
  const key = safeIdempotencyKey(options.idempotencyKey, request, identity);
  const ledgerRef = db.ref(`selfServiceClubRequests/${identity.uid}/${key}`);
  const existing = await ledgerRef.once('value');
  if (existing.child('status').val() === 'completed') return { ...existing.child('result').val(), idempotent: true };

  const claim = await ledgerRef.transaction((current) => {
    if (current) return;
    return { status: 'pending', slug: request.slug, requestedAt: now };
  });
  if (!claim.committed) throw new HttpError(409, 'This club request is already being processed. Please try again.', 'REQUEST_IN_PROGRESS');

  const clubId = db.ref('clubs').push().key;
  const slugRef = db.ref(`clubsBySlug/${request.slug}`);
  let slugReserved = false;
  try {
    await enforceRateLimit(db, identity.uid, now);
    const reservation = await slugRef.transaction((current) => current === null ? clubId : undefined);
    if (!reservation.committed) throw new HttpError(409, 'That club link is already in use. Choose another.', 'SLUG_TAKEN');
    slugReserved = true;

    const adminKey = emailKey(request.organiser.email);
    const club = {
      name: request.name,
      slug: request.slug,
      sport: request.sport,
      format: request.format,
      scoringSystem: request.scoringSystem,
      bookingUrl: request.bookingUrl,
      organiserEmail: request.organiser.email,
      createdByUid: identity.uid,
      createdBy: request.organiser.email,
      createdAt: now,
      modules: { boxLeagues: true, mixInGames: true }
    };
    const publicMeta = { name: request.name, slug: request.slug, sport: request.sport, bookingUrl: request.bookingUrl };
    const result = { clubId, slug: request.slug, name: request.name };
    await db.ref().update({
      [`clubs/${clubId}`]: club,
      [`clubPublicMeta/${clubId}`]: publicMeta,
      [`clubAdmins/${clubId}/${adminKey}`]: true,
      [`users/${identity.uid}/homeClub`]: { id: clubId, name: request.name, bookingUrl: request.bookingUrl },
      [`selfServiceClubRequests/${identity.uid}/${key}`]: { status: 'completed', requestedAt: now, completedAt: now, result }
    });
    return { ...result, idempotent: false };
  } catch (error) {
    if (slugReserved) {
      await slugRef.transaction((current) => current === clubId ? null : current).catch(() => {});
    }
    await ledgerRef.remove().catch(() => {});
    throw error;
  }
}

module.exports = { HttpError, cleanRequest, createClub, emailKey, slugify };
