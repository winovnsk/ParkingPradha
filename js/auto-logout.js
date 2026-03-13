/**
 * AutoLogout Module — Logout otomatis saat idle atau meninggalkan tab
 * Idle timeout: 60 detik
 */
const AutoLogout = (() => {
  const IDLE_TIMEOUT = 60 * 1000; // 60 detik
  const WARN_BEFORE = 15 * 1000;  // Tampilkan peringatan 15 detik sebelum logout

  let idleTimer = null;
  let warnTimer = null;
  let warnBanner = null;
  let _active = false;

  const EVENTS = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click'];

  function init() {
    // Mulai jika sudah login
    if (Auth.isLoggedIn()) {
      start();
    }

    // Auto-logout saat meninggalkan tab / window
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && Auth.isLoggedIn()) {
        // Simpan waktu meninggalkan tab
        sessionStorage.setItem('pradha_tab_hidden', Date.now().toString());
      } else if (document.visibilitystate === 'visible') {
        const hiddenAt = sessionStorage.getItem('pradha_tab_hidden');
        if (hiddenAt && Auth.isLoggedIn()) {
          const elapsed = Date.now() - parseInt(hiddenAt, 10);
          if (elapsed >= IDLE_TIMEOUT) {
            _doLogout();
          }
        }
        sessionStorage.removeItem('pradha_tab_hidden');
      }
    });

    // Pagehide (menutup tab / navigasi keluar)
    window.addEventListener('pagehide', () => {
      if (Auth.isLoggedIn()) {
        sessionStorage.setItem('pradha_tab_hidden', Date.now().toString());
      }
    });
  }

  function start() {
    if (_active) return;
    _active = true;
    EVENTS.forEach(ev => document.addEventListener(ev, reset, { passive: true }));
    _setTimers();
  }

  function stop() {
    _active = false;
    EVENTS.forEach(ev => document.removeEventListener(ev, reset));
    _clearTimers();
    _removeWarning();
  }

  function reset() {
    if (!Auth.isLoggedIn()) { stop(); return; }
    _clearTimers();
    _removeWarning();
    _setTimers();
  }

  function _setTimers() {
    // Peringatan 15 detik sebelum logout
    warnTimer = setTimeout(() => {
      _showWarning();
    }, IDLE_TIMEOUT - WARN_BEFORE);

    // Logout setelah idle penuh
    idleTimer = setTimeout(() => {
      _doLogout();
    }, IDLE_TIMEOUT);
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
      Sesi Anda akan berakhir dalam 15 detik karena tidak ada aktivitas.
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
    Utils.showToast('Anda telah keluar secara otomatis karena tidak ada aktivitas.', 'warning');
  }

  return { init, start, stop, reset };
})();
