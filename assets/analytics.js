/* Public-only GA4. No automatic routing, titles, referrers or search parameters. */
(function () {
  'use strict';
  var E = window.NREngine, key = 'nr-analytics-choice';
  var button = document.getElementById('analyticsToggle'), status = document.getElementById('analyticsStatus');
  var settings, current = '', currentKey = '', lastKey = '', script, configured = false, ready = false, loaded = false, failed = false, storageOK = true, choice;
  var publicPage = /\/(?:index\.html|disclaimer\.html|privacy\.html)?$/.test(location.pathname) && !/\/admin(?:\/|$)/i.test(location.pathname);
  var categories = { home: 'Home', standings: 'Standings', rounds: 'Rounds', round: 'Round',
    crews: 'Crews', person: 'Crew profile', about: 'Sources', info: 'Info', 'getting-started': 'Getting started',
    disclaimer: 'Disclaimer', privacy: 'Privacy' };
  function warning(message) { console.warn(message); }
  function readChoice() {
    try { choice = localStorage.getItem(key); storageOK = true; }
    catch (e) { choice = 'off'; storageOK = false; warning('Analytics preference storage is unavailable; analytics stays off.'); }
    // Unknown preferences fail closed too.
    if (choice !== null && choice !== 'on' && choice !== 'off') choice = 'off';
  }
  function allowed() { return publicPage && storageOK && choice !== 'off' && settings && settings.enabled && current && !failed; }
  function cookiesOff() {
    try {
      var names = document.cookie.split(';').map(function (c) { return c.trim().split('=')[0]; })
        .filter(function (n) { return /^_ga(?:_|$)/.test(n); });
      var domains = location.hostname.split('.');
      names.forEach(function (name) {
        document.cookie = name + '=; Max-Age=0; path=/; SameSite=Lax';
        for (var i = 0; i < domains.length - 1; i++) {
          document.cookie = name + '=; Max-Age=0; path=/; domain=.' + domains.slice(i).join('.') + '; SameSite=Lax';
        }
      });
    } catch (e) { warning('Analytics cookies could not be cleared; analytics remains disabled. Clear site cookies in browser settings.'); }
  }
  function stop() {
    if (settings) window['ga-disable-' + settings.measurementId] = true;
    // Retain queued suppression/config while disabled: removing it lets a pending container
    // auto-configure with the document URL when the visitor returns to a public route.
    cookiesOff();
  }
  function updateControl() {
    if (!button || !status) return;
    button.disabled = false;
    button.textContent = choice === 'off' ? 'Allow analytics' : 'Turn off analytics';
    status.textContent = !storageOK ? 'Analytics is off on this page: this browser cannot save your preference. Check it again after reloading.' :
      choice === 'off' ? 'Analytics is off in this browser.' : failed ? 'Analytics is unavailable; results are unaffected.' :
      !settings || !settings.enabled ? 'Analytics is not enabled on this site.' : 'Background analytics is enabled. You can turn it off.';
  }
  function gtag() { window.dataLayer.push(arguments); }
  function pageFields() {
    return { page_location: location.origin + '/#/' + current, page_referrer: '',
      page_title: categories[current.split('/')[0]] + ' - Northern Regions Rally' };
  }
  function setDefaults() {
    var defaults = pageFields();
    defaults.send_page_view = false;
    defaults.allow_google_signals = false;
    defaults.allow_ad_personalization_signals = false;
    gtag('set', defaults);
  }
  function send() {
    if (!allowed() || !loaded || currentKey === lastKey) return;
    window['ga-disable-' + settings.measurementId] = false;
    setDefaults();
    var fields = pageFields(); fields.send_to = settings.measurementId;
    gtag('event', 'page_view', fields);
    lastKey = currentKey;
  }
  function activate() {
    if (!allowed() || !ready) return;
    window['ga-disable-' + settings.measurementId] = false;
    if (!loaded) {
      configure();
      loaded = true;
    }
    send();
  }
  function configure() {
    if (!configured) {
      // Queue before script insertion: real containers can auto-configure during execution.
      gtag('consent', 'default', { ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
      setDefaults();
      gtag('js', new Date());
      gtag('config', settings.measurementId, {
        send_page_view: false, allow_google_signals: false, allow_ad_personalization_signals: false,
        cookie_path: '/', cookie_expires: 31536000
      });
      configured = true;
    }
  }
  function start() {
    if (!allowed()) { stop(); updateControl(); return; }
    if (script) { activate(); return; }
    window.dataLayer = [];
    window.gtag = gtag;
    window['ga-disable-' + settings.measurementId] = false;
    configure();
    script = document.createElement('script');
    script.async = true;
    script.referrerPolicy = 'no-referrer';
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(settings.measurementId);
    script.onload = function () { ready = true; if (allowed()) activate(); else stop(); };
    script.onerror = function () {
      failed = true; stop(); updateControl();
      warning('Google Analytics could not load; results are unaffected.');
    };
    document.head.appendChild(script);
    updateControl();
  }
  function page(parts, year) {
    var name = parts[0] || 'home', next = '';
    if (Object.prototype.hasOwnProperty.call(categories, name) && name !== 'disclaimer' && name !== 'privacy') {
      next = name;
      if (name === 'standings') next += parts[1] === 'codrivers' ? '/codrivers' : '/drivers';
      if (name === 'round') next += '/' + (['graph', 'classification', 'stages'].indexOf(parts[2]) >= 0 ? parts[2] : 'graph');
    }
    current = next;
    currentKey = next ? JSON.stringify([year, parts]) : '';
    if (!next) lastKey = '';
    start();
  }
  readChoice();
  updateControl();
  if (button) button.addEventListener('click', function () {
    var next = choice === 'off' ? 'on' : 'off';
    try { localStorage.setItem(key, next); choice = next; storageOK = true; }
    catch (e) { choice = 'off'; storageOK = false; warning('Analytics preference could not be saved; analytics stays off on this page.'); }
    stop(); updateControl();
    // Unload the Google runtime as well as disabling it. A failed save must not lose the in-page opt-out.
    if (storageOK) location.reload();
  });
  window.addEventListener('storage', function (event) {
    if (event.key !== key && event.key !== null) return;
    readChoice(); stop(); updateControl();
    if (script) location.reload(); else start();
  });
  window.NRAnalytics = { page: page };
  if (!publicPage) { stop(); return; }
  if (!E || E.analyticsContractVersion !== 1 || typeof E.validateAnalytics !== 'function' || !window.NRRallyNotice) {
    failed = true; stop(); updateControl(); warning('Analytics scripts are out of date; analytics stays off.'); return;
  }
  window.NRRallyNotice.sitePromise.then(function (site) {
    var cfg = site && site.analytics;
    if (E.validateAnalytics(cfg).length) {
      failed = true; warning('Published analytics settings are invalid; analytics stays off.');
    } else settings = cfg;
    if (document.body.hasAttribute('data-disclaimer')) {
      current = document.body.hasAttribute('data-privacy') ? 'privacy' : 'disclaimer';
      currentKey = current;
    }
    start();
  }).catch(function () {
    failed = true; stop(); updateControl(); warning('Analytics settings could not be checked; analytics stays off.');
  });
})();
