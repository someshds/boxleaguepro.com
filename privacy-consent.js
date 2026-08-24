(function () {
  'use strict';

  const STORAGE_KEY = 'blp_cookies';
  const GA_ID = 'G-41R6M69CBW';
  const CHAT_WIDGET_ID = '69c2d44d510b6031cc38ed0e';
  let optionalServicesLoaded = false;

  function getChoice() {
    try {
      const value = localStorage.getItem(STORAGE_KEY);
      return value === 'accepted' || value === 'declined' ? value : '';
    } catch (_) {
      return '';
    }
  }

  function saveChoice(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (_) {}
  }

  function appendScript(attributes) {
    const script = document.createElement('script');
    Object.keys(attributes).forEach((key) => {
      if (key === 'src') script.src = attributes[key];
      else if (key === 'async') script.async = attributes[key];
      else script.setAttribute(key, attributes[key]);
    });
    document.head.appendChild(script);
  }

  function loadOptionalServices() {
    if (optionalServicesLoaded) return;
    optionalServicesLoaded = true;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    window.gtag('config', GA_ID, { anonymize_ip: true });
    appendScript({ src: `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`, async: true });

    appendScript({
      src: 'https://widgets.leadconnectorhq.com/loader.js',
      async: true,
      'data-resources-url': 'https://widgets.leadconnectorhq.com/chat-widget/loader.js',
      'data-widget-id': CHAT_WIDGET_ID
    });
  }

  function setBannerVisible(visible) {
    const banner = document.getElementById('cookie-consent');
    if (banner) banner.style.display = visible ? 'block' : 'none';
  }

  function choose(value) {
    saveChoice(value);
    setBannerVisible(false);
    if (value === 'accepted') loadOptionalServices();
  }

  window.BoxLeagueConsent = {
    accept: function () { choose('accepted'); },
    decline: function () { choose('declined'); },
    show: function () { setBannerVisible(true); },
    openSupport: function () {
      if (getChoice() !== 'accepted') {
        setBannerVisible(true);
        return;
      }
      let attempts = 0;
      const openWhenReady = function () {
        const button = document.querySelector('[data-widget-id] button, .lc_text-widget-open, .chat-widget-open-btn');
        if (button) button.click();
        else if (attempts++ < 20) setTimeout(openWhenReady, 150);
      };
      openWhenReady();
    },
    getChoice: getChoice
  };

  function initialize() {
    const choice = getChoice();
    if (choice === 'accepted') loadOptionalServices();
    else if (!choice) setBannerVisible(true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
