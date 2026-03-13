/**
 * Auth Module — Login, Register, Session (FIXED)
 */
const Auth = (() => {
  const SESSION_KEY = 'pradha_user';
  const REMEMBER_KEY = 'pradha_remember';

  function getUser() {
    try { const data = localStorage.getItem(SESSION_KEY); return data ? JSON.parse(data) : null; }
    catch { return null; }
  }
  function setUser(user) { localStorage.setItem(SESSION_KEY, JSON.stringify(user)); updateUI(); }
  function clearUser() { localStorage.removeItem(SESSION_KEY); updateUI(); }
  function isLoggedIn() { return !!getUser(); }
  function isAdmin() { const u = getUser(); return u && u.role === 'Admin'; }

  function updateUI() {
    const user = getUser();
    const loginBtn = document.getElementById('nav-login-btn');
    const userBtn = document.getElementById('nav-user-btn');
    const userName = document.getElementById('nav-user-name');
    const navAvatar = document.getElementById('nav-user-avatar');
    if (user) {
      loginBtn.classList.add('hidden'); userBtn.classList.remove('hidden');
      if (userName) userName.textContent = user.nama.split(' ')[0];
      if (navAvatar) navAvatar.textContent = Utils.getInitials(user.nama);
    } else {
      loginBtn.classList.remove('hidden'); userBtn.classList.add('hidden');
    }
  }

  function togglePassword(inputId, btnEl) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    const icon = btnEl.querySelector('i');
    if (icon) icon.className = isHidden ? 'fas fa-eye-slash' : 'fas fa-eye';
  }

  function showLoginModal() {
    let savedIdentifier = '';
    try { const r = localStorage.getItem(REMEMBER_KEY); if (r) savedIdentifier = JSON.parse(r).identifier || ''; } catch {}

    const html = `
      <div class="auth-modal">
        <div class="text-center">
          <h2><i class="fas fa-sign-in-alt" style="color:var(--primary)"></i> Masuk</h2>
          <p class="subtitle">Masuk dengan Nama atau Nomor HP</p>
        </div>
        <div id="authLoginForm">
          <div class="form-group">
            <label>Nama / Nomor HP</label>
            <input type="text" class="form-control" id="loginIdentifier" placeholder="Masukkan nama atau nomor HP" value="${savedIdentifier}" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <div class="input-password-wrapper">
              <input type="password" class="form-control" id="loginPassword" placeholder="Masukkan password" />
              <button type="button" class="btn-password-toggle" onclick="Auth.togglePassword('loginPassword', this)" title="Tampilkan/Sembunyikan"><i class="fas fa-eye"></i></button>
            </div>
          </div>
          <div class="form-check">
            <input type="checkbox" id="loginRemember" ${savedIdentifier ? 'checked' : ''} />
            <label for="loginRemember">Ingatkan Saya</label>
          </div>
          <button class="btn btn-primary btn-block btn-lg mt-2" id="btnLogin" onclick="Auth.doLogin()"><i class="fas fa-sign-in-alt"></i> Masuk</button>
          <div class="text-center mt-2"><a href="#" onclick="Auth.showForgotPassword()" style="font-size:0.85rem"><i class="fas fa-key"></i> Lupa Password?</a></div>
          <div class="text-center mt-3" style="padding-top:1rem;border-top:1px solid var(--border-light)">
            <p style="font-size:0.85rem;color:var(--text-secondary)">Belum punya akun?</p>
            <button class="btn btn-outline btn-block mt-1" onclick="Auth.showRegisterForm()"><i class="fas fa-user-plus"></i> Daftar Sekarang</button>
          </div>
        </div>
      </div>
    `;
    App.openModal(html);
    setTimeout(() => document.getElementById('loginIdentifier')?.focus(), 300);
  }

  async function doLogin() {
    const identifier = document.getElementById('loginIdentifier').value.trim();
    const password = document.getElementById('loginPassword').value;
    const rememberMe = document.getElementById('loginRemember')?.checked;
    const btn = document.getElementById('btnLogin');
    if (!identifier || !password) { Utils.showToast('Harap isi Nama/No HP dan Password.', 'warning'); return; }
    if (rememberMe) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ identifier }));
    else localStorage.removeItem(REMEMBER_KEY);

    Utils.setLoading(btn, true);
    try {
      const res = await API.login(identifier, password);
      if (res.success) {
        setUser(res.data); App.closeModal();
        Utils.showToast(`Selamat datang, ${res.data.nama}!`, 'success');
        AutoLogout.reset();
        if (res.data.role === 'Admin') App.navigate('admin');
        else App.navigate('dashboard');
      } else { Utils.showToast(res.message, 'error'); }
    } catch { Utils.showToast('Gagal terhubung ke server.', 'error'); }
    finally { Utils.setLoading(btn, false); }
  }

  function showRegisterForm() {
    const html = `
      <div class="auth-modal">
        <h2><i class="fas fa-user-plus" style="color:var(--primary)"></i> Daftar Akun</h2>
        <p class="subtitle">Buat akun untuk menyewa lahan parkir</p>
        <div class="form-group"><label>Nama Lengkap</label><input type="text" class="form-control" id="regNama" placeholder="Nama lengkap Anda" /></div>
        <div class="form-row">
          <div class="form-group"><label>Nomor HP</label><input type="tel" class="form-control" id="regHP" placeholder="628xxxxxxxxxx" /></div>
          <div class="form-group"><label>Blok Rumah</label><input type="text" class="form-control" id="regBlok" placeholder="Contoh: A-01" /></div>
        </div>
        <div class="form-row">
          <div class="form-group"><label>Merk Kendaraan</label><input type="text" class="form-control" id="regMerk" placeholder="Contoh: Toyota Avanza" /></div>
          <div class="form-group"><label>Plat Nomor</label><input type="text" class="form-control" id="regPlat" placeholder="Contoh: D 1234 AB" /></div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <div class="input-password-wrapper">
            <input type="password" class="form-control" id="regPassword" placeholder="Buat password (min. 4 karakter)" />
            <button type="button" class="btn-password-toggle" onclick="Auth.togglePassword('regPassword', this)"><i class="fas fa-eye"></i></button>
          </div>
          <span class="form-hint">Minimal 4 karakter</span>
        </div>
        <div class="form-check"><input type="checkbox" id="regRemember" /><label for="regRemember">Ingatkan Saya pada login berikutnya</label></div>
        <button class="btn btn-primary btn-block btn-lg mt-2" id="btnRegister" onclick="Auth.doRegister()"><i class="fas fa-user-plus"></i> Daftar</button>
        <div class="text-center mt-2"><a href="#" onclick="Auth.showLoginModal()" style="font-size:0.85rem"><i class="fas fa-arrow-left"></i> Sudah punya akun? Masuk</a></div>
      </div>
    `;
    App.openModal(html);
  }

  async function doRegister() {
    const data = {
      nama: document.getElementById('regNama').value.trim(),
      no_hp: document.getElementById('regHP').value.trim(),
      blok_rumah: document.getElementById('regBlok').value.trim(),
      merk_kendaraan: document.getElementById('regMerk').value.trim(),
      plat_nomor: document.getElementById('regPlat').value.trim(),
      password: document.getElementById('regPassword').value
    };
    const rememberMe = document.getElementById('regRemember')?.checked;
    if (!data.nama || !data.no_hp || !data.blok_rumah || !data.merk_kendaraan || !data.plat_nomor || !data.password) { Utils.showToast('Semua kolom wajib diisi.', 'warning'); return; }
    if (data.password.length < 4) { Utils.showToast('Password minimal 4 karakter.', 'warning'); return; }
    const btn = document.getElementById('btnRegister');
    Utils.setLoading(btn, true);
    try {
      const res = await API.register(data);
      if (res.success) {
        setUser(res.data);
        if (rememberMe) localStorage.setItem(REMEMBER_KEY, JSON.stringify({ identifier: data.nama }));
        App.closeModal(); Utils.showToast('Pendaftaran berhasil!', 'success');
        AutoLogout.reset(); App.navigate('dashboard');
      } else { Utils.showToast(res.message, 'error'); }
    } catch { Utils.showToast('Gagal terhubung ke server.', 'error'); }
    finally { Utils.setLoading(btn, false); }
  }

  // ✅ FIXED: Syntax error diperbaiki
  function showForgotPassword() {
    App.closeModal();
    Utils.showToast('Anda akan diarahkan ke WhatsApp Admin untuk reset password.', 'info');
    setTimeout(() => {
      const message = encodeURIComponent('Halo admin, saya ingin mereset password akun saya di Pradha Ciganitri Parking System.');
      window.open('https://wa.me/6281320912117?text=' + message, '_blank');
    }, 1000);
  }

  function logout() {
    AutoLogout.stop(); clearUser(); App.navigate('home');
    Utils.showToast('Berhasil keluar. Sampai jumpa!', 'success');
    document.getElementById('userDropdown')?.classList.remove('show');
  }

  return {
    getUser, setUser, clearUser, isLoggedIn, isAdmin,
    updateUI, togglePassword,
    showLoginModal, doLogin,
    showRegisterForm, doRegister,
    showForgotPassword, logout
  };
})();
