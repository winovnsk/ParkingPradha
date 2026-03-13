/**
 * Auto-Logout Module — Otomatis logout jika user idle
 * Timeout default: 30 menit
 */
const AutoLogout = (() => {
  const IDLE_TIMEOUT = 3 * 60 * 1000; // 30 menit
  const WARNING_BEFORE = 60 * 1000;     // Warning 1 menit sebelum logout
  let idleTimer = null;
  let warningTimer = null;
  let warningEl = null;

  function init() {
    if (!Auth.isLoggedIn()) return;
    _bindActivity();
    reset();
  }

  function _bindActivity() {
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => {
      document.addEventListener(evt, _onActivity, { passive: true });
    });
  }

  function _onActivity() {
    if (!Auth.isLoggedIn()) return;
    _clearWarning();
    reset();
  }

  function reset() {
    _clearTimers();
    if (!Auth.isLoggedIn()) return;

    // Set warning timer
    warningTimer = setTimeout(() => {
      _showWarning();
    }, IDLE_TIMEOUT - WARNING_BEFORE);

    // Set logout timer
    idleTimer = setTimeout(() => {
      _doAutoLogout();
    }, IDLE_TIMEOUT);
  }

  function stop() {
    _clearTimers();
    _clearWarning();
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    events.forEach(evt => {
      document.removeEventListener(evt, _onActivity);
    });
  }

  function _clearTimers() {
    if (idleTimer) { clearTimeout(idleTimer); idleTimer = null; }
    if (warningTimer) { clearTimeout(warningTimer); warningTimer = null; }
  }

  function _showWarning() {
    _clearWarning();
    warningEl = document.createElement('div');
    warningEl.className = 'idle-warning';
    warningEl.innerHTML = `<i class="fas fa-clock"></i> Anda akan otomatis keluar dalam 1 menit karena tidak ada aktivitas.`;
    document.body.appendChild(warningEl);
  }

  function _clearWarning() {
    if (warningEl && warningEl.parentElement) {
      warningEl.remove();
      warningEl = null;
    }
  }

  function _doAutoLogout() {
    _clearWarning();
    _clearTimers();
    if (Auth.isLoggedIn()) {
      Auth.clearUser();
      App.navigate('home');
      Utils.showToast('Anda telah keluar otomatis karena tidak ada aktivitas.', 'warning');
    }
  }

  return { init, reset, stop };
})();
