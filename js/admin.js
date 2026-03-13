/**
 * Admin Module — Admin Dashboard & Tools
 */
const Admin = (() => {
  let currentTab = 'pending';

  async function render() {
    switchTab('pending', document.querySelector('.admin-tab.active'));
    loadPendingCount();
  }

  async function loadPendingCount() {
    try {
      const res = await API.getPendingTransactions();
      const count = res.success ? res.data.length : 0;
      document.getElementById('pendingCount').textContent = count;
    } catch { /* silent */ }
  }

  async function switchTab(tab, btnEl) {
    currentTab = tab;

    document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');

    const content = document.getElementById('adminContent');
    content.innerHTML = `<div class="text-center" style="padding:2rem"><span class="spinner" style="width:24px;height:24px;display:inline-block;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite"></span></div>`;

    switch (tab) {
      case 'pending': await renderPending(content); break;
      case 'users': await renderUsers(content); break;
      case 'investor': await renderInvestor(content); break;
      case 'settings': await renderSettings(content); break;
    }
  }

  async function renderPending(el) {
    try {
      const res = await API.getPendingTransactions();
      const data = res.success ? res.data : [];

      if (data.length === 0) {
        el.innerHTML = `<div class="empty-state"><i class="fas fa-check-circle"></i><h3>Tidak ada transaksi pending</h3><p>Semua transaksi sudah diverifikasi</p></div>`;
        return;
      }

      const rows = data.map(t => `
        <tr>
          <td><code style="font-size:0.75rem">${t.trx_id}</code></td>
          <td>${t.user_id}</td>
          <td><strong>${t.spot_id}</strong></td>
          <td>${t.plat_nomor}</td>
          <td>${t.bulan_sewa} bln</td>
          <td><strong>${Utils.formatCurrency(t.total_final)}</strong></td>
          <td>
            ${t.bukti_transfer_url && t.bukti_transfer_url !== 'UPLOAD_FAILED'
              ? `<a href="${t.bukti_transfer_url}" target="_blank" class="btn btn-ghost btn-sm"><i class="fas fa-image"></i> Lihat</a>`
              : '<span style="color:var(--text-tertiary)">-</span>'}
          </td>
          <td>
            <div style="display:flex;gap:0.25rem">
              <button class="btn btn-success btn-sm" onclick="Admin.verify('${t.trx_id}')"><i class="fas fa-check"></i></button>
              <button class="btn btn-danger btn-sm" onclick="Admin.reject('${t.trx_id}')"><i class="fas fa-times"></i></button>
            </div>
          </td>
        </tr>
      `).join('');

      el.innerHTML = `
        <div class="data-table">
          <table>
            <thead>
              <tr><th>ID Transaksi</th><th>User</th><th>Slot</th><th>Plat</th><th>Durasi</th><th>Total</th><th>Bukti</th><th>Aksi</th></tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch {
      el.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal memuat data</h3></div>`;
    }
  }

  async function verify(trxId) {
    if (!confirm(`Verifikasi transaksi ${trxId}?`)) return;
    try {
      const res = await API.verifyTransaction(trxId);
      Utils.showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) { switchTab('pending', document.querySelector('.admin-tab.active')); loadPendingCount(); }
    } catch { Utils.showToast('Gagal memverifikasi.', 'error'); }
  }

  async function reject(trxId) {
    if (!confirm(`Tolak transaksi ${trxId}? Slot akan dikembalikan.`)) return;
    try {
      const res = await API.rejectTransaction(trxId);
      Utils.showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) { switchTab('pending', document.querySelector('.admin-tab.active')); loadPendingCount(); }
    } catch { Utils.showToast('Gagal menolak.', 'error'); }
  }

  async function renderUsers(el) {
    try {
      const res = await API.getAllUsers();
      const users = res.success ? res.data : [];

      const rows = users.map(u => `
        <tr>
          <td><code style="font-size:0.75rem">${u.id}</code></td>
          <td><strong>${u.nama}</strong></td>
          <td>${u.no_hp}</td>
          <td>${u.blok_rumah}</td>
          <td>${u.plat_nomor}</td>
          <td><span class="status-badge ${u.role === 'Admin' ? 'active' : 'pending'}">${u.role}</span></td>
          <td>
            <button class="btn btn-ghost btn-sm" onclick="Admin.showResetPassword('${u.id}', '${u.nama}')">
              <i class="fas fa-key"></i> Reset
            </button>
          </td>
        </tr>
      `).join('');

      el.innerHTML = `
        <div class="data-table">
          <table>
            <thead><tr><th>ID</th><th>Nama</th><th>HP</th><th>Blok</th><th>Plat</th><th>Role</th><th>Aksi</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch {
      el.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal memuat data</h3></div>`;
    }
  }

  function showResetPassword(userId, userName) {
    const html = `
      <h2><i class="fas fa-key" style="color:var(--warning)"></i> Reset Password</h2>
      <p class="subtitle">Reset password untuk <strong>${userName}</strong></p>
      <div class="form-group">
        <label>Password Baru</label>
        <input type="text" class="form-control" id="newPasswordInput" placeholder="Masukkan password baru" />
      </div>
      <button class="btn btn-warning btn-block" id="btnResetPw" onclick="Admin._doResetPw('${userId}')">
        <i class="fas fa-save"></i> Simpan Password Baru
      </button>
    `;
    App.openModal(html);
  }

  async function _doResetPw(userId) {
    const pw = document.getElementById('newPasswordInput').value.trim();
    if (!pw) { Utils.showToast('Password tidak boleh kosong.', 'warning'); return; }

    const btn = document.getElementById('btnResetPw');
    Utils.setLoading(btn, true);
    try {
      const res = await API.resetPassword(userId, pw);
      Utils.showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) App.closeModal();
    } catch { Utils.showToast('Gagal mereset password.', 'error'); }
    finally { Utils.setLoading(btn, false); }
  }

  async function renderInvestor(el) {
    try {
      const res = await API.getInvestorReturns();
      const data = res.success ? res.data : {};

      const progressPct = data.progress_percent || 0;

      const rows = (data.records || []).map(r => `
        <tr>
          <td><code style="font-size:0.75rem">${r.return_id}</code></td>
          <td>${Utils.formatShortDate(r.tanggal_bayar)}</td>
          <td><strong>${Utils.formatCurrency(r.nominal_dibayar)}</strong></td>
          <td>${r.bukti_transfer_url ? `<a href="${r.bukti_transfer_url}" target="_blank" class="btn btn-ghost btn-sm"><i class="fas fa-image"></i></a>` : '-'}</td>
        </tr>
      `).join('');

      el.innerHTML = `
        <div class="investor-progress">
          <h3><i class="fas fa-hand-holding-usd"></i> Pengembalian Dana Investor</h3>
          <div class="investor-detail">
            <span>Terbayar: ${Utils.formatCurrency(data.total_dibayar || 0)}</span>
            <span>Target: ${Utils.formatCurrency(data.target || 41300000)}</span>
          </div>
          <div class="progress-bar" style="height:12px">
            <div class="progress-fill" style="width:${progressPct}%"></div>
          </div>
          <p style="text-align:center;margin-top:0.5rem;font-size:0.85rem;font-weight:700">${progressPct}% — Sisa: ${Utils.formatCurrency(data.sisa || 0)}</p>
        </div>

        <button class="btn btn-primary btn-sm" onclick="Admin.showAddInvestor()" style="margin-bottom:1rem">
          <i class="fas fa-plus"></i> Catat Cicilan Baru
        </button>

        <div class="data-table">
          <table>
            <thead><tr><th>ID</th><th>Tanggal</th><th>Nominal</th><th>Bukti</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      `;
    } catch {
      el.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal memuat data</h3></div>`;
    }
  }

  function showAddInvestor() {
    const html = `
      <h2><i class="fas fa-plus-circle" style="color:var(--primary)"></i> Catat Cicilan Investor</h2>
      <div class="form-group">
        <label>Tanggal Bayar</label>
        <input type="date" class="form-control" id="invDate" value="${new Date().toISOString().split('T')[0]}" />
      </div>
      <div class="form-group">
        <label>Nominal</label>
        <input type="number" class="form-control" id="invNominal" placeholder="Contoh: 5000000" />
      </div>
      <div class="form-group">
        <label>Bukti Transfer</label>
        <div class="file-upload" onclick="document.getElementById('invFileInput').click()">
          <i class="fas fa-cloud-upload-alt"></i>
          <p>Klik untuk upload bukti</p>
          <div class="file-name" id="invFileName"></div>
          <input type="file" id="invFileInput" accept="image/*,.pdf" onchange="Admin._handleInvFile(this)" />
        </div>
      </div>
      <button class="btn btn-success btn-block" id="btnAddInv" onclick="Admin._submitInvestor()" disabled>
        <i class="fas fa-save"></i> Simpan
      </button>
    `;
    App.openModal(html);
  }

  let _invBase64 = null, _invFileName = '';

  async function _handleInvFile(input) {
    const file = input.files[0];
    if (!file) return;
    const validation = Utils.validateUploadFile(file);
    if (!validation.ok) {
      Utils.showToast(validation.message, 'warning');
      return;
    }

    _invFileName = file.name;
    document.getElementById('invFileName').textContent = file.name;
    try {
      _invBase64 = await Utils.compressImage(file);
      document.getElementById('btnAddInv').disabled = false;
    } catch { Utils.showToast('Gagal proses file.', 'error'); }
  }

  async function _submitInvestor() {
    const date = document.getElementById('invDate').value;
    const nominal = document.getElementById('invNominal').value;
    if (!date || !nominal || !_invBase64) {
      Utils.showToast('Lengkapi semua data.', 'warning');
      return;
    }

    const btn = document.getElementById('btnAddInv');
    Utils.setLoading(btn, true);

    try {
      const res = await API.addInvestorReturn({
        tanggal_bayar: date,
        nominal_dibayar: Number(nominal),
        bukti_transfer_base64: _invBase64,
        bukti_filename: _invFileName
      });
      if (res.success && res.data?.bukti_url === 'UPLOAD_FAILED') {
        Utils.showToast('Upload bukti ke server gagal. Silakan coba ulang dengan file lain.', 'error');
        return;
      }

      Utils.showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        App.closeModal();
        _invBase64 = null;
        switchTab('investor', document.querySelectorAll('.admin-tab')[2]);
      }
    } catch { Utils.showToast('Gagal menyimpan.', 'error'); }
    finally { Utils.setLoading(btn, false); }
  }

  async function renderSettings(el) {
    try {
      const [settingsRes, contactsRes] = await Promise.all([
        API.getSettings(),
        API.getAdminContacts()
      ]);

      const settings = settingsRes.success ? settingsRes.data : {};
      const contacts = contactsRes.success ? contactsRes.data : [];

      const settingsHtml = Object.entries(settings).map(([key, val]) => `
        <div class="setting-card">
          <div class="setting-key">${key}</div>
          <div class="setting-desc">${val.description || '-'}</div>
          <div class="setting-input">
            <input type="text" class="form-control" value="${val.value}" id="setting_${key}" />
            <button class="btn btn-primary btn-sm" onclick="Admin._saveSetting('${key}')"><i class="fas fa-save"></i></button>
          </div>
        </div>
      `).join('');

      const contactsHtml = contacts.map(c => `
        <div class="setting-card">
          <div class="setting-key">Kontak ${c.blok}</div>
          <div class="setting-desc">${c.nama_admin}</div>
          <div class="setting-input">
            <input type="text" class="form-control" value="${c.no_whatsapp}" id="contact_${c.blok}" placeholder="No WA" />
            <button class="btn btn-primary btn-sm" onclick="Admin._saveContact('${c.blok}', '${c.nama_admin}')"><i class="fas fa-save"></i></button>
          </div>
        </div>
      `).join('');

      el.innerHTML = `
        <h3 style="margin-bottom:1rem"><i class="fas fa-cog"></i> Pengaturan Sistem</h3>
        <div class="settings-grid">${settingsHtml}</div>

        <h3 style="margin:2rem 0 1rem"><i class="fas fa-address-book"></i> Kontak Admin</h3>
        <div class="settings-grid">${contactsHtml}</div>
      `;
    } catch {
      el.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal memuat pengaturan</h3></div>`;
    }
  }

  async function _saveSetting(key) {
    const val = document.getElementById(`setting_${key}`).value;
    try {
      const res = await API.updateSetting({ key, value: val });
      Utils.showToast(res.message, res.success ? 'success' : 'error');
    } catch { Utils.showToast('Gagal menyimpan.', 'error'); }
  }

  async function _saveContact(blok, nama) {
    const no = document.getElementById(`contact_${blok}`).value;
    try {
      const res = await API.updateAdminContact({ blok, nama_admin: nama, no_whatsapp: no });
      Utils.showToast(res.message, res.success ? 'success' : 'error');
    } catch { Utils.showToast('Gagal menyimpan.', 'error'); }
  }

  return {
    render, switchTab, verify, reject,
    showResetPassword, _doResetPw,
    showAddInvestor, _handleInvFile, _submitInvestor,
    _saveSetting, _saveContact
  };
})();
