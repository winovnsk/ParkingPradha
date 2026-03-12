/**
 * Auth Module — Login, Register, Session
 */
const Auth = (() => {
  const SESSION_KEY = 'pradha_user';

  function getUser() {
    try {
      const data = localStorage.getItem(SESSION_KEY);
      return data ? JSON.parse(data) : null;
    } catch { return null; }
  }

  function setUser(user) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    updateUI();
  }

  function clearUser() {
    localStorage.removeItem(SESSION_KEY);
    updateUI();
  }

  function isLoggedIn() {
    return !!getUser();
  }

  function isAdmin() {
    const u = getUser();
    return u && u.role === 'Admin';
  }

  function updateUI() {
    const user = getUser();
    const loginBtn = document.getElementById('nav-login-btn');
    const userBtn = document.getElementById('nav-user-btn');
    const userName = document.getElementById('nav-user-name');

    if (user) {
      loginBtn.classList.add('hidden');
      userBtn.classList.remove('hidden');
      userName.textContent = user.nama.split(' ')[0];
    } else {
      loginBtn.classList.remove('hidden');
      userBtn.classList.add('hidden');
    }
  }

  function showLoginModal() {
    const html = `
      <div class="auth-modal">
        <div class="text-center">
          <h2><i class="fas fa-sign-in-alt" style="color:var(--primary)"></i> Masuk</h2>
          <p class="subtitle">Masuk dengan Nama atau Nomor HP</p>
        </div>

        <div id="authLoginForm">
          <div class="form-group">
            <label>Nama / Nomor HP</label>
            <input type="text" class="form-control" id="loginIdentifier" placeholder="Masukkan nama atau nomor HP" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" class="form-control" id="loginPassword" placeholder="Masukkan password" />
          </div>
          <button class="btn btn-primary btn-block btn-lg mt-2" id="btnLogin" onclick="Auth.doLogin()">
            <i class="fas fa-sign-in-alt"></i> Masuk
          </button>
          <div class="text-center mt-2">
            <a href="#" onclick="Auth.showForgotPassword()" style="font-size:0.85rem">
              <i class="fas fa-key"></i> Lupa Password?
            </a>
          </div>
          <div class="text-center mt-3" style="padding-top:1rem; border-top:1px solid var(--border-light)">
            <p style="font-size:0.85rem; color:var(--text-secondary)">Belum punya akun?</p>
            <button class="btn btn-outline btn-block mt-1" onclick="Auth.showRegisterForm()">
              <i class="fas fa-user-plus"></i> Daftar Sekarang
            </button>
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
    const btn = document.getElementById('btnLogin');

    if (!identifier || !password) {
      Utils.showToast('Harap isi Nama/No HP dan Password.', 'warning');
      return;
    }

    Utils.setLoading(btn, true);
    try {
      const res = await API.login(identifier, password);
      if (res.success) {
        setUser(res.data);
        App.closeModal();
        Utils.showToast(`Selamat datang, ${res.data.nama}!`, 'success');

        if (res.data.role === 'Admin') {
          App.navigate('admin');
        } else {
          App.navigate('dashboard');
        }
      } else {
        Utils.showToast(res.message, 'error');
      }
    } catch (err) {
      Utils.showToast('Gagal terhubung ke server.', 'error');
    } finally {
      Utils.setLoading(btn, false);
    }
  }

  function showRegisterForm() {
    const html = `
      <div class="auth-modal">
        <h2><i class="fas fa-user-plus" style="color:var(--primary)"></i> Daftar Akun</h2>
        <p class="subtitle">Buat akun untuk menyewa lahan parkir</p>

        <div class="form-group">
          <label>Nama Lengkap</label>
          <input type="text" class="form-control" id="regNama" placeholder="Nama lengkap Anda" />
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Nomor HP</label>
            <input type="tel" class="form-control" id="regHP" placeholder="628xxxxxxxxxx" />
          </div>
          <div class="form-group">
            <label>Blok Rumah</label>
            <input type="text" class="form-control" id="regBlok" placeholder="Contoh: A-01" />
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Merk Kendaraan</label>
            <input type="text" class="form-control" id="regMerk" placeholder="Contoh: Toyota Avanza" />
          </div>
          <div class="form-group">
            <label>Plat Nomor</label>
            <input type="text" class="form-control" id="regPlat" placeholder="Contoh: D 1234 AB" />
          </div>
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" class="form-control" id="regPassword" placeholder="Buat password" />
          <span class="form-hint">Minimal 4 karakter</span>
        </div>
        <button class="btn btn-primary btn-block btn-lg mt-2" id="btnRegister" onclick="Auth.doRegister()">
          <i class="fas fa-user-plus"></i> Daftar
        </button>
        <div class="text-center mt-2">
          <a href="#" onclick="Auth.showLoginModal()" style="font-size:0.85rem">
            <i class="fas fa-arrow-left"></i> Sudah punya akun? Masuk
          </a>
        </div>
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

    if (!data.nama || !data.no_hp || !data.blok_rumah || !data.merk_kendaraan || !data.plat_nomor || !data.password) {
      Utils.showToast('Semua field wajib diisi.', 'warning');
      return;
    }

    if (data.password.length < 4) {
      Utils.showToast('Password minimal 4 karakter.', 'warning');
      return;
    }

    const btn = document.getElementById('btnRegister');
    Utils.setLoading(btn, true);

    try {
      const res = await API.register(data);
      if (res.success) {
        setUser(res.data);
        App.closeModal();
        Utils.showToast('Registrasi berhasil! Selamat datang.', 'success');
        App.navigate('dashboard');
      } else {
        Utils.showToast(res.message, 'error');
      }
    } catch (err) {
      Utils.showToast('Gagal terhubung ke server.', 'error');
    } finally {
      Utils.setLoading(btn, false);
    }
  }

  function showForgotPassword() {
    App.closeModal();
    Utils.showToast('Anda akan diarahkan ke WhatsApp Admin untuk reset password.', 'info');
    setTimeout(() => {
      window.open(`https://wa.me/6281320912117?text=${encodeURIComponent('Halo admin, saya ingin mereset password akun saya di Pradha Ciganitri Parking System.')}`, '_blank');
    }, 1000);
  }

  function logout() {
    clearUser();
    App.navigate('home');
    Utils.showToast('Berhasil keluar.', 'success');
    document.getElementById('userDropdown')?.classList.remove('show');
  }

  return {
    getUser, setUser, clearUser, isLoggedIn, isAdmin,
    updateUI, showLoginModal, doLogin,
    showRegisterForm, doRegister,
    showForgotPassword, logout
  };
})();
