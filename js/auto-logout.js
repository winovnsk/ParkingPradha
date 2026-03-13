/**
 * AutoLogout Module — Logout otomatis saat idle atau menutup tab
 * Idle timeout: 5 menit
 */
const AutoLogout = (() => {
  const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 menit
  const WARN_BEFORE = 30 * 1000;      // Peringatan 30 detik sebelum logout

  let idleTimer = null;
  let warnTimer = null;
  let warnBanner = null;
  let active = false;

  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

  function init() {
    if (Auth.isLoggedIn()) start();

    document.addEventListener('visibilitychange', () => {
      if (!Auth.isLoggedIn()) return;
      if (document.visibilityState === 'hidden') {
        _setLastActivity();
      } else if (document.visibilityState === 'visible') {
        _checkIdleSinceHidden();
        reset();
      }
    });

    window.addEventListener('beforeunload', () => {
      if (Auth.isLoggedIn()) {
        Auth.clearUser();
      }
    });
  }

  function start() {
    if (active) return;
    active = true;
    EVENTS.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    _setTimers();
  }

  function stop() {
    active = false;
    EVENTS.forEach(ev => document.removeEventListener(ev, reset));
    _clearTimers();
    _removeWarning();
  }

  function reset() {
    if (!Auth.isLoggedIn()) {
      stop();
      return;
    }
    _setLastActivity();
    _clearTimers();
    _removeWarning();
    _setTimers();
  }

  function _setTimers() {
    warnTimer = setTimeout(_showWarning, IDLE_TIMEOUT - WARN_BEFORE);
    idleTimer = setTimeout(_doLogout, IDLE_TIMEOUT);
  }

  function _clearTimers() {
    clearTimeout(idleTimer);
    clearTimeout(warnTimer);
    idleTimer = null;
    warnTimer = null;
  }

  function _showWarning() {
    _removeWarning();
    warnBanner = document.createElement('div');
    warnBanner.className = 'idle-warning';
    warnBanner.id = 'idleWarningBanner';
    warnBanner.innerHTML = `
      <i class="fas fa-clock"></i>
      Sesi Anda akan berakhir dalam 30 detik karena tidak ada aktivitas.
      <button onclick="AutoLogout.reset()" style="background:rgba(255,255,255,0.25);border:none;color:#fff;padding:0.3rem 0.75rem;border-radius:20px;cursor:pointer;font-size:0.8rem;margin-left:0.5rem;font-weight:600">
        Tetap Masuk
      </button>
    `;
    document.body.appendChild(warnBanner);
  }

  function _removeWarning() {
    const existing = document.getElementById('idleWarningBanner');
    if (existing) existing.remove();
    warnBanner = null;
  }

  function _doLogout() {
    stop();
    if (!Auth.isLoggedIn()) return;
    Auth.clearUser();
    App.navigate('home');
    Utils.showToast('Anda telah keluar otomatis karena tidak ada aktivitas selama 5 menit.', 'warning');
  }

  function _setLastActivity() {
    sessionStorage.setItem('pradha_last_activity', String(Date.now()));
  }

  function _checkIdleSinceHidden() {
    const lastActivity = parseInt(sessionStorage.getItem('pradha_last_activity') || '0', 10);
    if (!lastActivity) return;
    const elapsed = Date.now() - lastActivity;
    if (elapsed >= IDLE_TIMEOUT) {
      _doLogout();
    }
  }

  return { init, start, stop, reset };
})();
