/* Public display preferences only; no results, scoring, analytics or database access. */
(function () {
  'use strict';
  var mode = 'nr', theme = null;
  var welcomeKey = 'nr-rs-welcome-until', welcomeDuration = 7 * 24 * 60 * 60 * 1000, welcomeUntil = 0;
  try { mode = localStorage.getItem('nr-competition') === 'rs' ? 'rs' : 'nr'; theme = localStorage.getItem('nr-theme'); } catch (e) { console.warn('Display preferences could not be read; URL preferences remain available.', e); }
  var explicit = new URLSearchParams(location.search).get('competition');
  if (explicit === 'nr' || explicit === 'rs') mode = explicit;
  function setCompetition(value) {
    mode = value === 'rs' ? 'rs' : 'nr';
    document.documentElement.setAttribute('data-competition', mode);
    try { localStorage.setItem('nr-competition', mode); } catch (e) { console.warn('Competition preference could not be saved; the URL retains this choice.', e); }
  }
  function toggleTheme() {
    var dark = theme ? theme === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    theme = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('nr-theme', theme); } catch (e) { console.warn('Theme preference could not be saved; the current page still uses this theme.', e); }
  }
  function controls() {
    return '<div class="display-controls"><button class="competition-switch" type="button" role="switch" id="competitionBtn" aria-checked="' + (mode === 'rs') +
      '" aria-label="RallyeSport competition"><span class="competition-switch-track" aria-hidden="true"><span class="competition-switch-segment">NR</span>' +
      '<span class="competition-switch-segment">RS</span><span class="competition-switch-thumb"></span></span></button>' +
      '<button class="theme-btn" type="button" id="themeBtn" aria-label="Switch light or dark theme"><svg viewBox="0 0 24 24" aria-hidden="true">' +
      '<path fill="currentColor" d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg></button></div>';
  }
  function mount(onSwitch) {
    document.getElementById('competitionBtn').addEventListener('click', onSwitch);
    document.getElementById('themeBtn').addEventListener('click', toggleTheme);
  }
  function closeWelcome() {
    var dialog = document.querySelector('.competition-welcome');
    if (!dialog) return;
    dialog.close(); dialog.remove();
    document.body.classList.remove('competition-welcome-open');
    var toggle = document.getElementById('competitionBtn');
    if (toggle) toggle.focus({ preventScroll: true });
  }
  function welcomeDismissed() {
    var now = Date.now(), until = welcomeUntil;
    try { until = Math.max(until, Number(localStorage.getItem(welcomeKey)) || 0); }
    catch (e) { console.warn('RallyeSport welcome preference could not be read; only this page can remember dismissal.', e); }
    return Number.isFinite(until) && until > now && until <= now + welcomeDuration;
  }
  function dismissWelcome() {
    welcomeUntil = Date.now() + welcomeDuration;
    try { localStorage.setItem(welcomeKey, String(welcomeUntil)); }
    catch (e) { console.warn('RallyeSport welcome dismissal could not be saved; it lasts only on this page.', e); }
    closeWelcome();
  }
  function welcome(infoHref, automatic) {
    if (automatic && welcomeDismissed()) return;
    closeWelcome();
    var dialog = document.createElement('dialog');
    dialog.className = 'competition-welcome';
    dialog.setAttribute('aria-labelledby', 'rsWelcomeTitle');
    dialog.setAttribute('aria-describedby', 'rsWelcomeText');
    dialog.innerHTML = '<h2 id="rsWelcomeTitle">Welcome to RallyeSport</h2>' +
      '<p id="rsWelcomeText">Welcome to RallyeSport - a Northern Regions Club League. Stats, Results, and Calendar are different to Northern Regions - ' +
      '<a>click here to find out more</a>.</p><button class="btn primary" type="button" autofocus>Continue</button>';
    dialog.querySelector('a').setAttribute('href', infoHref);
    document.body.appendChild(dialog);
    document.body.classList.add('competition-welcome-open');
    dialog.querySelector('button').addEventListener('click', dismissWelcome);
    dialog.querySelector('a').addEventListener('click', dismissWelcome);
    dialog.addEventListener('cancel', function (event) { event.preventDefault(); dismissWelcome(); });
    dialog.addEventListener('keydown', function (event) {
      if (event.key !== 'Tab') return;
      var first = dialog.querySelector('a'), last = dialog.querySelector('button');
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });
    dialog.showModal();
  }
  setCompetition(mode);
  if (theme === 'light' || theme === 'dark') document.documentElement.setAttribute('data-theme', theme);
  window.NRDisplay = { competition: function () { return mode; }, setCompetition: setCompetition,
    controls: controls, mount: mount, welcome: welcome, closeWelcome: closeWelcome };
  window.addEventListener('DOMContentLoaded', function () {
    if (!document.body.hasAttribute('data-disclaimer')) return;
    var header = document.querySelector('.header-inner');
    header.insertAdjacentHTML('beforeend', controls());
    function updateLinks() {
      Array.prototype.forEach.call(document.querySelectorAll('a[href^="index.html#"]'), function (link) {
        var href = link.getAttribute('href').split('?')[0];
        link.setAttribute('href', href + '?competition=' + mode);
      });
    }
    updateLinks();
    mount(function () {
      setCompetition(mode === 'nr' ? 'rs' : 'nr');
      document.getElementById('competitionBtn').setAttribute('aria-checked', String(mode === 'rs'));
      history.replaceState(null, '', location.pathname + '?competition=' + mode + location.hash);
      updateLinks();
      if (mode === 'rs') welcome('index.html#/info?competition=rs', true);
    });
  });
})();
