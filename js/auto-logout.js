/**
 * AutoLogout Module — Logout otomatis saat idle atau menutup tab
 * Idle timeout: 2 menit
 */
const AutoLogout = (() => {
  const IDLE_TIMEOUT = 2 * 60 * 1000; // 2 menit

  let idleTimer = null;
  let active = false;

  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

  function init() {
    if (Auth.isLoggedIn()) start();

    const closeSession = () => {
      if (Auth.isLoggedIn()) {
        Auth.clearUser();
      }
    };

    window.addEventListener('beforeunload', closeSession);
    window.addEventListener('pagehide', closeSession);
  }

  function start() {
    if (active) return;
    active = true;
    EVENTS.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    _setTimers();
  }

  function stop() {
    if (!active) return;
    active = false;
    EVENTS.forEach(ev => document.removeEventListener(ev, reset));
    _clearTimers();
  }

  function reset() {
    if (!Auth.isLoggedIn()) {
      stop();
      return;
    }
    _clearTimers();
    _setTimers();
  }

  function _setTimers() {
    idleTimer = setTimeout(_doLogout, IDLE_TIMEOUT);
  }

  function _clearTimers() {
    clearTimeout(idleTimer);
    idleTimer = null;
  }

  function _doLogout() {
    stop();
    if (!Auth.isLoggedIn()) return;
    Auth.clearUser();
    App.navigate('home');
    Utils.showToast('Anda telah keluar otomatis karena tidak ada aktivitas selama 2 menit.', 'warning');
  }

  return { init, start, stop, reset };
})();
