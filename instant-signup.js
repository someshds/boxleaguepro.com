(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.BoxLeagueInstantSignup = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  // Front-end gate. Leave false so a merge does not change visitor pages.
  // Flip to true only after createInstantClub is enabled and App Check is configured.
  var INSTANT_SIGNUP_UI = false;

  // GRANT MUST REPLACE: In Firebase Console → App Check, register the web app
  // with reCAPTCHA Enterprise for boxleaguepro.com and www.boxleaguepro.com,
  // then paste the site key here. Leave this placeholder until that is done.
  // App Check is not initialised while this value still starts with REPLACE_.
  var RECAPTCHA_ENTERPRISE_SITE_KEY = 'REPLACE_WITH_RECAPTCHA_ENTERPRISE_SITE_KEY';

  var FIREBASE_CONFIG = {
    apiKey: 'AIzaSyA61YEch4YSShL3TyXd_R2ofTlIxs2qDuE',
    authDomain: 'boxleague-pro.firebaseapp.com',
    databaseURL: 'https://boxleague-pro-default-rtdb.europe-west1.firebasedatabase.app',
    projectId: 'boxleague-pro',
    storageBucket: 'boxleague-pro.firebasestorage.app',
    messagingSenderId: '755561965293',
    appId: '1:755561965293:web:ece2707254d53f7fc58ee4',
    measurementId: 'G-41R6M69CBW'
  };

  var SPORTS = ['tennis', 'padel', 'squash', 'racketball', 'badminton'];
  var PRODUCTION_HOSTS = ['boxleaguepro.com', 'www.boxleaguepro.com'];
  var INSTANT_CREATE_ENDPOINT = 'https://europe-west2-boxleague-pro.cloudfunctions.net/createInstantClub';
  var SELF_SERVICE_CREATE_ENDPOINT = 'https://europe-west2-boxleague-pro.cloudfunctions.net/createSelfServiceClub';
  var EMULATOR_INSTANT_ENDPOINT = 'http://127.0.0.1:5002/demo-boxleague-pro-self-service/europe-west2/createInstantClub';
  var EMULATOR_SELF_SERVICE_ENDPOINT = 'http://127.0.0.1:5002/demo-boxleague-pro-self-service/europe-west2/createSelfServiceClub';
  var APPLY_FALLBACK_PATH = '/apply.html?signup=fallback';
  var HELD_MESSAGE = "We'll review and email you shortly.";
  var SLUG_TAKEN_MESSAGE = 'That club link is already in use. Try another name.';
  var FALLBACK_MESSAGE = 'We could not create the club automatically. Use the form below and we will set it up.';
  var CRM_PRIVACY_NOTE = 'A club organiser account creates a BoxLeague Pro CRM contact so we can send setup and activation emails.';
  var ONE_CLUB_NOTE = 'One BoxLeague Pro account can have one club. If you already have one, we open it.';
  var TOUR_CLUB_LINK_TEXT = "Every club on BoxLeague Pro has its own short link like ?club=east-grinstead-tennis. Players land straight on your club's welcome screen with everything they need. If your club is not set up yet, create your account at /apply.html. Your club is ready in about 2 minutes and the on-screen guide leads you through setup.";
  var HELP_SETUP_TEXT = 'Create your account at /apply.html. Your club is ready in about 2 minutes. Existing clubs already have a link — ask your organiser to share it.';
  var HELP_FAQ_ADDED = "Create your account at boxleaguepro.com/apply.html — about 2 minutes. Choose tennis, padel, squash, racketball or badminton, and your club is ready. Once you are the organiser you can create leagues, bulk add players, and invite other organisers.";

  var KNOWN_CODES = [
    'FEATURE_DISABLED',
    'EMAIL_NOT_VERIFIED',
    'BOT_PROTECTION_REQUIRED',
    'APP_CHECK_FAILED',
    'RECAPTCHA_FAILED',
    'DISPOSABLE_EMAIL',
    'SLUG_TAKEN',
    'HELD',
    'SKIPPED',
    'ORIGIN_DENIED',
    'RATE_LIMITED',
    'UNAUTHENTICATED',
    'METHOD_NOT_ALLOWED',
    'INTERNAL'
  ];

  function asSearch(value) {
    if (value == null) return '';
    return String(value);
  }

  function isInstantSignupUiEnabled(options) {
    options = options || {};
    if (INSTANT_SIGNUP_UI === true) return true;
    var search = options.search;
    if (search === undefined && typeof window !== 'undefined' && window.location) {
      search = window.location.search;
    }
    try {
      if (asSearch(search) && new URLSearchParams(asSearch(search)).get('instant_signup') === '1') {
        return true;
      }
    } catch (e) {}
    return false;
  }

  function isFallbackRequested(options) {
    options = options || {};
    var search = options.search;
    if (search === undefined && typeof window !== 'undefined' && window.location) {
      search = window.location.search;
    }
    try {
      return new URLSearchParams(asSearch(search)).get('signup') === 'fallback';
    } catch (e) {
      return false;
    }
  }

  function isPlaceholderSiteKey(key) {
    var value = String(key == null ? RECAPTCHA_ENTERPRISE_SITE_KEY : key);
    return !value || value.indexOf('REPLACE_') === 0;
  }

  function isEmulatorMode(options) {
    options = options || {};
    if (options.emulator === true) return true;
    if (typeof window === 'undefined' || !window.location) return false;
    var host = window.location.hostname;
    if (host !== '127.0.0.1' && host !== 'localhost') return false;
    try {
      return new URLSearchParams(window.location.search).get('emulator') === '1';
    } catch (e) {
      return false;
    }
  }

  function getInstantCreateEndpoint(options) {
    return isEmulatorMode(options) ? EMULATOR_INSTANT_ENDPOINT : INSTANT_CREATE_ENDPOINT;
  }

  function getSelfServiceCreateEndpoint(options) {
    return isEmulatorMode(options) ? EMULATOR_SELF_SERVICE_ENDPOINT : SELF_SERVICE_CREATE_ENDPOINT;
  }

  function getClubCreateEndpoint(options) {
    options = options || {};
    if (isInstantSignupUiEnabled(options)) return getInstantCreateEndpoint(options);
    return getSelfServiceCreateEndpoint(options);
  }

  function readInstantSignupErrorCode(result, fallbackText) {
    var parts = [];
    if (result) {
      if (typeof result.code === 'string') parts.push(result.code);
      if (typeof result.error === 'string') parts.push(result.error);
      if (typeof result.status === 'string') parts.push(result.status);
      if (typeof result.reason === 'string') parts.push(result.reason);
      if (result.error && typeof result.error === 'object') {
        if (result.error.code) parts.push(result.error.code);
        if (result.error.message) parts.push(result.error.message);
      }
    }
    if (fallbackText) parts.push(fallbackText);
    var joined = parts.join(' ');
    for (var i = 0; i < KNOWN_CODES.length; i++) {
      if (joined.indexOf(KNOWN_CODES[i]) !== -1) return KNOWN_CODES[i];
    }
    if (joined.indexOf('hold_slug_taken') !== -1) return 'SLUG_TAKEN';
    if (joined.indexOf('hold_email_unverified') !== -1) return 'EMAIL_NOT_VERIFIED';
    if (joined.indexOf('skip_disposable_email') !== -1) return 'DISPOSABLE_EMAIL';
    if (String(result && result.status || '') === 'hold') return 'HELD';
    return '';
  }

  function clubRedirectUrl(slug, options) {
    options = options || {};
    var query = 'club=' + encodeURIComponent(slug);
    if (isEmulatorMode(options)) query += '&emulator=1';
    return '/app.html?' + query;
  }

  function interpretInstantSignupResponse(input) {
    input = input || {};
    if (input.networkError) {
      return { action: 'fallback', reason: 'network', message: FALLBACK_MESSAGE };
    }

    var body = input.body || {};
    var httpStatus = Number(input.httpStatus || 0);
    var code = readInstantSignupErrorCode(body);
    var status = String(body.status || '');
    var reason = String(body.reason || '');

    if (code === 'FEATURE_DISABLED' || httpStatus === 503) {
      return { action: 'fallback', reason: 'FEATURE_DISABLED', message: FALLBACK_MESSAGE };
    }

    if ((status === 'created' || reason === 'already_provisioned' || reason === 'created' || reason === 'idempotent')
      && body.clubId && body.slug) {
      return {
        action: 'redirect',
        clubId: body.clubId,
        slug: body.slug,
        name: body.name || '',
        alreadyProvisioned: reason === 'already_provisioned' || body.idempotent === true
      };
    }

    if (code === 'SLUG_TAKEN' || httpStatus === 409 || reason === 'hold_slug_taken') {
      return { action: 'slug_taken', message: SLUG_TAKEN_MESSAGE };
    }

    if (code === 'EMAIL_NOT_VERIFIED' || reason === 'hold_email_unverified') {
      return { action: 'verify_email' };
    }

    if (code === 'DISPOSABLE_EMAIL' || reason === 'skip_disposable_email') {
      return {
        action: 'error',
        message: body.error || 'Use a regular club or personal email address, not a temporary one.'
      };
    }

    if (code === 'BOT_PROTECTION_REQUIRED' || code === 'APP_CHECK_FAILED' || code === 'RECAPTCHA_FAILED') {
      return { action: 'fallback', reason: code, message: FALLBACK_MESSAGE };
    }

    if (code === 'ORIGIN_DENIED') {
      return { action: 'error', message: 'Please create your club from boxleaguepro.com' };
    }

    if (code === 'RATE_LIMITED' || httpStatus === 429) {
      return { action: 'error', message: body.error || 'Too many club-setup requests. Try again later.' };
    }

    if (code === 'UNAUTHENTICATED' || httpStatus === 401) {
      return { action: 'error', message: body.error || 'Sign in before creating a club.' };
    }

    if (reason === 'hold_slug_too_short' || reason === 'hold_missing_club_name') {
      return { action: 'error', message: body.error || 'Enter a club name of at least a few letters.' };
    }

    if (code === 'HELD' || status === 'hold') {
      return { action: 'held', message: HELD_MESSAGE };
    }

    if (code === 'SKIPPED') {
      return { action: 'error', message: body.error || 'This account cannot be used for automatic club setup.' };
    }

    if (input.ok === false || httpStatus >= 400) {
      return { action: 'fallback', reason: 'call_failed', message: FALLBACK_MESSAGE };
    }

    return { action: 'fallback', reason: 'unknown', message: FALLBACK_MESSAGE };
  }

  function selfServiceSlugify(value) {
    return String(value || '').toLowerCase().normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
      .slice(0, 48).replace(/-+$/g, '');
  }

  function buildInstantClubRequest(values, user) {
    var name = String(values && values.name || '').trim();
    var sport = String(values && values.sport || '').toLowerCase();
    if (!user || !user.uid || !user.email) throw new Error('Sign in before creating a club.');
    if (name.length < 3 || name.length > 80) throw new Error('Enter a club name between 3 and 80 characters.');
    if (SPORTS.indexOf(sport) === -1) throw new Error('Choose tennis, padel, squash, racketball or badminton.');
    if (!values || !values.confirmed) {
      throw new Error('Confirm that you are authorised to organise leagues for this club.');
    }
    return {
      name: name,
      clubName: name,
      sport: sport,
      format: sport === 'padel' ? 'doubles' : 'singles',
      scoringSystem: 'default',
      organiser: {
        uid: user.uid,
        email: String(user.email).trim().toLowerCase(),
        displayName: String(user.displayName || values.displayName || '').trim()
      },
      requestVersion: 1
    };
  }

  function needsEmailVerification(user) {
    if (!user) return true;
    var providers = user.providerData || [];
    for (var i = 0; i < providers.length; i++) {
      if (providers[i] && providers[i].providerId === 'google.com') return false;
    }
    return user.emailVerified !== true;
  }

  function initialiseAppCheck(firebaseNs, app, siteKey) {
    var key = siteKey == null ? RECAPTCHA_ENTERPRISE_SITE_KEY : siteKey;
    if (!firebaseNs || !firebaseNs.appCheck || isPlaceholderSiteKey(key)) return null;
    try {
      var appCheck = firebaseNs.appCheck(app);
      var provider = firebaseNs.appCheck.ReCaptchaEnterpriseProvider
        ? new firebaseNs.appCheck.ReCaptchaEnterpriseProvider(key)
        : key;
      appCheck.activate(provider, true);
      return appCheck;
    } catch (e) {
      return null;
    }
  }

  function getAppCheckHeaders(appCheck) {
    if (!appCheck || typeof appCheck.getToken !== 'function') {
      return Promise.resolve({});
    }
    return appCheck.getToken(false).then(function (result) {
      if (result && result.token) return { 'X-Firebase-AppCheck': result.token };
      return {};
    }).catch(function () {
      return {};
    });
  }

  var LANDING_COPY = {
    'cta-apply': 'Create your club',
    'cta-apply-free': 'Create your club — Free',
    'cta-apply-short': 'Create your club',
    'how-step': 'Create your BoxLeague Pro account at /apply.html. Your club is ready in about 2 minutes, with a dedicated link like ?club=your-club.',
    'cta-banner': 'Create your BoxLeague Pro account in about 2 minutes. Your club is ready, with a dedicated organiser link. Free forever.',
    'faq-added': 'Create your account at /apply.html with your club name and sport — tennis, padel, squash, racketball or badminton. About 2 minutes. Your club is ready and the on-screen guide leads you through creating a league, adding players and sharing the link.'
  };

  function applyInstantLandingCopy(doc, options) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !isInstantSignupUiEnabled(options)) return false;
    var nodes = doc.querySelectorAll('[data-instant-copy]');
    for (var i = 0; i < nodes.length; i++) {
      var key = nodes[i].getAttribute('data-instant-copy');
      if (key && LANDING_COPY[key]) nodes[i].textContent = LANDING_COPY[key];
    }
    return true;
  }

  function applyInstantHelpCopy(doc, options) {
    doc = doc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !isInstantSignupUiEnabled(options)) return false;
    var setup = doc.getElementById('help-setup-step-copy');
    if (setup) setup.textContent = HELP_SETUP_TEXT;
    return true;
  }

  function withInstantHelpFaqs(faqs, options) {
    if (!isInstantSignupUiEnabled(options) || !faqs) return faqs;
    return faqs.map(function (item) {
      if (item && item[0] === 'How do I get my club added to BoxLeague Pro?') {
        return [item[0], HELP_FAQ_ADDED];
      }
      return item;
    });
  }

  return {
    INSTANT_SIGNUP_UI: INSTANT_SIGNUP_UI,
    RECAPTCHA_ENTERPRISE_SITE_KEY: RECAPTCHA_ENTERPRISE_SITE_KEY,
    FIREBASE_CONFIG: FIREBASE_CONFIG,
    SPORTS: SPORTS,
    PRODUCTION_HOSTS: PRODUCTION_HOSTS,
    INSTANT_CREATE_ENDPOINT: INSTANT_CREATE_ENDPOINT,
    SELF_SERVICE_CREATE_ENDPOINT: SELF_SERVICE_CREATE_ENDPOINT,
    APPLY_FALLBACK_PATH: APPLY_FALLBACK_PATH,
    HELD_MESSAGE: HELD_MESSAGE,
    SLUG_TAKEN_MESSAGE: SLUG_TAKEN_MESSAGE,
    FALLBACK_MESSAGE: FALLBACK_MESSAGE,
    CRM_PRIVACY_NOTE: CRM_PRIVACY_NOTE,
    ONE_CLUB_NOTE: ONE_CLUB_NOTE,
    TOUR_CLUB_LINK_TEXT: TOUR_CLUB_LINK_TEXT,
    HELP_SETUP_TEXT: HELP_SETUP_TEXT,
    isInstantSignupUiEnabled: isInstantSignupUiEnabled,
    isFallbackRequested: isFallbackRequested,
    isPlaceholderSiteKey: isPlaceholderSiteKey,
    isEmulatorMode: isEmulatorMode,
    getInstantCreateEndpoint: getInstantCreateEndpoint,
    getSelfServiceCreateEndpoint: getSelfServiceCreateEndpoint,
    getClubCreateEndpoint: getClubCreateEndpoint,
    readInstantSignupErrorCode: readInstantSignupErrorCode,
    interpretInstantSignupResponse: interpretInstantSignupResponse,
    clubRedirectUrl: clubRedirectUrl,
    selfServiceSlugify: selfServiceSlugify,
    buildInstantClubRequest: buildInstantClubRequest,
    needsEmailVerification: needsEmailVerification,
    initialiseAppCheck: initialiseAppCheck,
    getAppCheckHeaders: getAppCheckHeaders,
    applyInstantLandingCopy: applyInstantLandingCopy,
    applyInstantHelpCopy: applyInstantHelpCopy,
    withInstantHelpFaqs: withInstantHelpFaqs,
    LANDING_COPY: LANDING_COPY
  };
});
