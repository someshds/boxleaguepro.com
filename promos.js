/**
 * Shared promo slot for BoxLeague Pro public pages and in-app views.
 *
 * Edit OFFERS below. Each item: id, headline, line, cta, url,
 * optional source, startsAt, expiresAt (ISO 8601).
 * An offer at or past expiresAt is hidden. If none are valid, nothing renders.
 */
(function (root) {
  'use strict';

  var DISMISS_KEY = 'blp_promo_dismissed';
  var ROTATE_KEY = 'blp_promo_rotate';
  var STYLE_ID = 'blp-promo-styles';
  var LABEL = 'From the team behind BoxLeague Pro';

  var OFFERS = [
    {
      id: 'email-reimagined-webinar',
      headline: 'Missed a payment warning or customer reply?',
      line: 'Free live webinar, Fri 16 Oct, 5pm UK. See a priority inbox sort a Gmail inbox.',
      cta: 'Save my free seat',
      url: 'https://email-reimagined.com/founder-priority-inbox-16th-october?utm_source=boxleaguepro&utm_medium=in-app&utm_campaign=email-reimagined-webinar',
      source: 'Email Re-imagined',
      expiresAt: '2026-10-16T17:00:00+01:00'
    },
    {
      id: 'ripplekeep-health-check',
      headline: 'Get more genuine Google reviews',
      line: 'A 30-minute Google review health check for local businesses. No obligation, no new software.',
      cta: 'Book a health check',
      url: 'https://ripplekeep.com/health-check-call?utm_source=boxleaguepro&utm_medium=in-app&utm_campaign=rk-health-check',
      source: 'RippleKeep'
    },
    {
      id: 'ripplekeep-free-website',
      headline: 'Get a free website, built in 24 hours',
      line: 'A simple, mobile-friendly site for your local business. Fill in the form, no obligation.',
      cta: 'Get my free website',
      url: 'https://ripplekeep.com/free-website?utm_source=boxleaguepro&utm_medium=in-app&utm_campaign=rk-free-website',
      source: 'RippleKeep'
    }
  ];

  var selectedOffer = null;
  var hasSelected = false;
  var didInit = false;

  function getStorage() {
    try {
      if (root.sessionStorage) return root.sessionStorage;
    } catch (e) {}
    return null;
  }

  function storageGet(key) {
    var store = getStorage();
    if (!store) return null;
    try {
      return store.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function storageSet(key, value) {
    var store = getStorage();
    if (!store) return;
    try {
      store.setItem(key, value);
    } catch (e) {}
  }

  function isDismissed() {
    return storageGet(DISMISS_KEY) === '1';
  }

  function dismiss() {
    storageSet(DISMISS_KEY, '1');
    var doc = root.document;
    if (!doc || !doc.querySelectorAll) return;
    var hosts = doc.querySelectorAll('[data-blp-promo]');
    for (var i = 0; i < hosts.length; i++) {
      hosts[i].innerHTML = '';
      hosts[i].hidden = true;
    }
  }

  function parseDate(value) {
    if (!value) return null;
    var date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }

  function isOfferActive(offer, now) {
    if (!offer || !offer.id) return false;
    now = now instanceof Date ? now : new Date(now || Date.now());
    var start = parseDate(offer.startsAt);
    if (start && now < start) return false;
    var end = parseDate(offer.expiresAt);
    if (end && now >= end) return false;
    return true;
  }

  function getValidOffers(now, list) {
    var source = list || OFFERS;
    var when = now instanceof Date ? now : new Date(now || Date.now());
    var valid = [];
    for (var i = 0; i < source.length; i++) {
      if (isOfferActive(source[i], when)) valid.push(source[i]);
    }
    return valid;
  }

  function pickOffer(offers, storage) {
    if (!offers || !offers.length) return null;
    var store = storage || getStorage();
    var raw = '0';
    if (store && store.getItem) {
      try {
        raw = store.getItem(ROTATE_KEY) || '0';
      } catch (e) {
        raw = '0';
      }
    }
    var idx = parseInt(raw, 10);
    if (!isFinite(idx) || idx < 0) idx = 0;
    var offer = offers[idx % offers.length];
    if (store && store.setItem) {
      try {
        store.setItem(ROTATE_KEY, String(idx + 1));
      } catch (e) {}
    }
    return offer;
  }

  function selectOffer(now, list) {
    if (hasSelected) return selectedOffer;
    hasSelected = true;
    selectedOffer = pickOffer(getValidOffers(now, list));
    return selectedOffer;
  }

  function sanitiseView(viewName) {
    var view = String(viewName || 'page').toLowerCase();
    view = view.replace(/[^a-z0-9._-]+/g, '-').replace(/^-+|-+$/g, '');
    return view || 'page';
  }

  function buildUrl(url, viewName) {
    var href = String(url || '');
    var view = sanitiseView(viewName);
    if (/[?&]utm_content=/.test(href)) {
      return href.replace(/([?&]utm_content=)[^&]*/g, '$1' + encodeURIComponent(view));
    }
    var sep = href.indexOf('?') >= 0 ? '&' : '?';
    return href + sep + 'utm_content=' + encodeURIComponent(view);
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function slotMarkup(offer, viewName) {
    if (!offer) return '';
    var href = escapeHtml(buildUrl(offer.url, viewName));
    var source = offer.source
      ? '<p class="blp-promo-source">' + escapeHtml(offer.source) + '</p>'
      : '';
    return (
      '<aside class="blp-promo" role="complementary" aria-label="' + escapeHtml(LABEL) + '">' +
        '<div class="blp-promo-card">' +
          '<p class="blp-promo-kicker">' + escapeHtml(LABEL) + '</p>' +
          source +
          '<p class="blp-promo-headline">' + escapeHtml(offer.headline) + '</p>' +
          '<p class="blp-promo-line">' + escapeHtml(offer.line) + '</p>' +
          '<a class="blp-promo-cta" href="' + href + '" target="_blank" rel="noopener sponsored">' +
            escapeHtml(offer.cta) +
          '</a>' +
          '<button type="button" class="blp-promo-dismiss" aria-label="Dismiss this message">&#215;</button>' +
        '</div>' +
      '</aside>'
    );
  }

  function ensureStyles() {
    var doc = root.document;
    if (!doc || !doc.head || doc.getElementById(STYLE_ID)) return;
    var style = doc.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.blp-promo{margin:16px 16px 20px;max-width:720px;margin-left:auto;margin-right:auto}',
      '.blp-promo-card{position:relative;background:#f8fafc;border:1px solid #e2e8f0;border-radius:14px;padding:14px 44px 14px 16px;color:#0f172a;box-shadow:0 1px 3px rgba(15,23,42,0.06)}',
      '.blp-promo-kicker{margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:0.04em;text-transform:uppercase;color:#64748b}',
      '.blp-promo-source{margin:0 0 4px;font-size:12px;font-weight:600;color:#475569}',
      '.blp-promo-headline{margin:0 0 4px;font-size:15px;font-weight:700;color:#0f172a;line-height:1.35}',
      '.blp-promo-line{margin:0 0 10px;font-size:13px;color:#334155;line-height:1.45}',
      '.blp-promo-cta{display:inline-flex;align-items:center;background:#2563eb;color:#fff;font-size:13px;font-weight:700;text-decoration:none;padding:8px 14px;border-radius:8px}',
      '.blp-promo-cta:hover{background:#1d4ed8}',
      '.blp-promo-cta:focus-visible,.blp-promo-dismiss:focus-visible{outline:3px solid #93c5fd;outline-offset:2px}',
      '.blp-promo-dismiss{position:absolute;top:6px;right:6px;width:36px;height:36px;border:0;border-radius:8px;background:transparent;color:#475569;font-size:22px;line-height:1;cursor:pointer}',
      '.blp-promo-dismiss:hover{background:#e2e8f0;color:#0f172a}',
      '@media (max-width:480px){.blp-promo{margin:12px}.blp-promo-headline{font-size:14px}.blp-promo-line{font-size:12px}}'
    ].join('');
    doc.head.appendChild(style);
  }

  function bindDismiss(host) {
    if (!host || !host.querySelector) return;
    var button = host.querySelector('.blp-promo-dismiss');
    if (!button) return;
    button.addEventListener('click', function () {
      dismiss();
    });
    button.addEventListener('keydown', function (event) {
      if (event && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        dismiss();
      }
    });
  }

  function fillHost(host, offer) {
    if (!host) return '';
    if (isDismissed() || !offer) {
      host.innerHTML = '';
      host.hidden = true;
      return '';
    }
    var view = host.getAttribute && host.getAttribute('data-blp-promo-view');
    var html = slotMarkup(offer, view || defaultViewName());
    host.hidden = false;
    host.innerHTML = html;
    bindDismiss(host);
    return html;
  }

  function defaultViewName() {
    try {
      var path = (root.location && root.location.pathname) || '';
      var file = path.split('/').pop() || 'index.html';
      var base = file.replace(/\.html$/i, '');
      if (!base || base === 'index') {
        var hash = (root.location && root.location.hash) || '';
        if (hash === '#pricing') return 'pricing';
        return 'index';
      }
      return base;
    } catch (e) {
      return 'page';
    }
  }

  function mountHosts(offer) {
    var doc = root.document;
    if (!doc || !doc.querySelectorAll) return [];
    var hosts = doc.querySelectorAll('[data-blp-promo]');
    var rendered = [];
    for (var i = 0; i < hosts.length; i++) {
      rendered.push(fillHost(hosts[i], offer));
    }
    return rendered;
  }

  function mount(options) {
    options = options || {};
    ensureStyles();
    var offer = selectOffer(options.now, options.offers);
    if (isDismissed()) {
      mountHosts(null);
      return null;
    }
    if (!offer) {
      mountHosts(null);
      return null;
    }
    mountHosts(offer);
    return offer;
  }

  function setView(viewName) {
    var doc = root.document;
    if (!doc || !doc.querySelectorAll) return;
    var view = sanitiseView(viewName);
    var hosts = doc.querySelectorAll('[data-blp-promo-sync="tab"]');
    var offer = isDismissed() ? null : selectOffer();
    for (var i = 0; i < hosts.length; i++) {
      hosts[i].setAttribute('data-blp-promo-view', view);
      fillHost(hosts[i], offer);
    }
  }

  function syncHashView() {
    var doc = root.document;
    if (!doc || !doc.querySelectorAll) return;
    var view = defaultViewName();
    var hosts = doc.querySelectorAll('[data-blp-promo-sync="hash"]');
    var offer = isDismissed() ? null : selectOffer();
    for (var i = 0; i < hosts.length; i++) {
      hosts[i].setAttribute('data-blp-promo-view', view);
      fillHost(hosts[i], offer);
    }
  }

  function init() {
    if (didInit) return;
    didInit = true;
    mount();
    if (root.addEventListener) {
      root.addEventListener('hashchange', syncHashView);
    }
  }

  function resetForTests(opts) {
    opts = opts || {};
    selectedOffer = null;
    hasSelected = false;
    didInit = false;
    if (!opts.keepStorage) {
      var store = getStorage();
      if (store && store.removeItem) {
        try {
          store.removeItem(DISMISS_KEY);
          store.removeItem(ROTATE_KEY);
        } catch (e) {}
      }
    }
  }

  var api = {
    OFFERS: OFFERS,
    LABEL: LABEL,
    DISMISS_KEY: DISMISS_KEY,
    isOfferActive: isOfferActive,
    getValidOffers: getValidOffers,
    pickOffer: pickOffer,
    selectOffer: selectOffer,
    buildUrl: buildUrl,
    slotMarkup: slotMarkup,
    isDismissed: isDismissed,
    dismiss: dismiss,
    mount: mount,
    fillHost: fillHost,
    setView: setView,
    defaultViewName: defaultViewName,
    resetForTests: resetForTests,
    init: init
  };

  root.BoxLeaguePromos = api;

  var doc = root.document;
  if (doc) {
    if (doc.readyState === 'loading' && doc.addEventListener) {
      doc.addEventListener('DOMContentLoaded', init);
    } else {
      init();
    }
  }
})(typeof window !== 'undefined' ? window : this);
