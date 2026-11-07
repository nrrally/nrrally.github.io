/* Shared public notice: independent of results, never loaded by the admin. */
(function () {
  'use strict';
  var E = window.NREngine, FB = window.NR_FIREBASE || {};
  var key = 'nr-active-rally-bypass', memoryBypass = '', current = '', reminder, dialog;
  var disclaimer = document.body.hasAttribute('data-disclaimer');
  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }
  function storageWarning(e) {
    console.warn('Active-rally visit storage is unavailable; bypass lasts only on this page.', e);
  }
  function bypassed(token) {
    if (memoryBypass === token) return true;
    try { return sessionStorage.getItem(key) === token; } catch (e) { storageWarning(e); return false; }
  }
  function dismiss() {
    memoryBypass = current;
    try { sessionStorage.setItem(key, current); } catch (e) { storageWarning(e); }
    if (dialog.open) dialog.close();
    document.body.classList.remove('rally-notice-open');
    reminder.querySelector('button').focus();
  }
  function show() {
    if (dialog.open) return;
    document.body.classList.add('rally-notice-open');
    dialog.showModal();
    dialog.querySelector('.rally-official').focus();
  }
  function clear() {
    if (dialog) { dialog.close(); dialog.remove(); dialog = null; }
    if (reminder) { reminder.remove(); reminder = null; }
    document.body.classList.remove('rally-notice-open');
  }
  function unavailable(err) {
    clear();
    console.warn('The active-rally notice could not be checked.', err);
    // The standalone disclaimer must remain readable even without its optional database read.
    if (disclaimer) {
      reminder = document.createElement('aside');
      reminder.className = 'rally-reminder';
      reminder.setAttribute('aria-label', 'Official rally information');
      reminder.innerHTML = '<p>Active-rally information could not be checked. For entries and SSRs, use <a href="https://nrcsa.co.za/">NRC South Africa</a>.</p>';
      document.body.prepend(reminder);
    }
  }
  function setSite(site) {
    clear();
    var n = site ? site.activeRally : undefined;
    if (!E || E.rallyNoticeContractVersion !== 1) {
      unavailable(new Error('Rally-notice scripts are out of date. Refresh with Ctrl+Shift+R.')); return;
    }
    var errors = E.validateActiveRally(n);
    if (errors.length) { unavailable(new Error(errors.join(' '))); return; }
    if (!n || !n.enabled) {
      memoryBypass = '';
      try { sessionStorage.removeItem(key); } catch (e) { storageWarning(e); }
      return;
    }
    current = JSON.stringify([n.activationId, n.name, E.nrcDestination(n.url)]);
    var title = esc(n.name) + ' is currently active.';
    var official = '<a class="rally-official" href="' + esc(E.nrcDestination(n.url)) + '">Go to nrcsa.co.za</a>';
    reminder = document.createElement('aside');
    reminder.className = 'rally-reminder';
    reminder.setAttribute('aria-label', 'Rally in progress');
    reminder.innerHTML = '<p><strong>' + title + '</strong> Entries, SSRs and active-event information are on the official NRC site.</p>' +
      '<div class="rally-reminder-actions">' + official + '<button type="button" class="rally-small">Show rally notice</button></div>';
    document.body.prepend(reminder);
    dialog = document.createElement('dialog');
    dialog.className = 'rally-notice';
    dialog.setAttribute('aria-labelledby', 'rallyNoticeTitle');
    dialog.setAttribute('aria-describedby', 'rallyNoticeText');
    dialog.innerHTML = '<div class="rally-notice-inner"><p class="rally-kicker">Rally in progress</p>' +
      '<h1 id="rallyNoticeTitle">' + title + '</h1><p id="rallyNoticeText">Go to nrcsa.co.za for entries, SSRs and more information about the active rally. This independent site is an archive of past results, not the active event portal.</p>' +
      '<div class="rally-notice-actions">' + official + '<button type="button" class="rally-small">View past results</button></div>' +
      '<p class="rally-disclosure"><strong>Independent rally archive.</strong> Official NRC South Africa and Motorsport South Africa publications and decisions take precedence. ' +
      '<a href="disclaimer.html">Full disclaimer</a> &middot; <a href="admin/">Admin sign-in</a></p></div>';
    document.body.appendChild(dialog);
    reminder.querySelector('button').addEventListener('click', show);
    dialog.querySelector('button').addEventListener('click', dismiss);
    dialog.addEventListener('cancel', function (e) { e.preventDefault(); dismiss(); });
    if (!disclaimer && !bypassed(current)) show();
  }
  var sitePromise = FB.projectId ? fetch('https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(FB.projectId) +
    '/databases/(default)/documents/public/site', { cache: 'no-store' }).then(function (r) {
    if (r.status === 404) return null;
    if (!r.ok) throw new Error('The results database returned ' + r.status + '.');
    return r.json();
  }).then(function (d) {
    if (!d) return null;
    if (!d.fields || !d.fields.json || typeof d.fields.json.stringValue !== 'string') throw new Error('The published site settings are invalid.');
    return JSON.parse(d.fields.json.stringValue);
  }) : Promise.resolve(null);
  sitePromise.then(setSite).catch(unavailable);
  window.NRRallyNotice = { sitePromise: sitePromise };
})();
