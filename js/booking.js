/**
 * Booking Module — Wizard Step-by-Step (FIXED)
 */
const Booking = (() => {
  let state = {
    step: 1, type: null, selectedSpots: [], duration: 1,
    totalPrice: 0, discount: 0, finalTotal: 0,
    file: null, fileBase64: null, spots: [], settings: {}
  };

  function parseDiscount(discVal, rawTotal) {
    const discStr = discVal?.toString().trim() || '0';
    let discountAmount = 0;
    let discDisplayVal = '0';

    if (discStr.endsWith('%')) {
      const pct = parseFloat(discStr.replace('%', ''));
      if (!isNaN(pct) && pct > 0) {
        discountAmount = rawTotal * (pct / 100);
        discDisplayVal = `${pct}%`;
      }
    } else {
      const numVal = parseFloat(discStr);
      if (!isNaN(numVal) && numVal > 0) {
        if (numVal >= 1) {
          discountAmount = rawTotal * (numVal / 100);
          discDisplayVal = `${numVal}%`;
        } else {
          discountAmount = rawTotal * numVal;
          discDisplayVal = `${Math.round(numVal * 100)}%`;
        }
      }
    }
    return { discountAmount, discDisplayVal };
  }

  function start(preferredType) {
    state = { step: 1, type: preferredType || null, selectedSpots: [], duration: 1, totalPrice: 0, discount: 0, finalTotal: 0, file: null, fileBase64: null, spots: [], settings: {} };
    if (!Auth.isLoggedIn()) { Auth.showLoginModal(); return; }
    renderWizard();
  }

  function startFromSpot(spotId, type) {
    state = { step: 1, type: type, selectedSpots: [], duration: 1, totalPrice: 0, discount: 0, finalTotal: 0, file: null, fileBase64: null, spots: [], settings: {} };
    if (!Auth.isLoggedIn()) { Auth.showLoginModal(); return; }
    _startAndPreselect(spotId, type);
  }

  async function _startAndPreselect(spotId, type) {
    try {
      const [spotsRes, settingsRes] = await Promise.all([API.getParkingSpots(), API.getSettings()]);
      state.spots = spotsRes.success ? spotsRes.data : [];
      state.settings = settingsRes.success ? settingsRes.data : {};
      const spot = state.spots.find(s => s.spot_id === spotId);
      if (spot && spot.status === 'Available') {
        const user = Auth.getUser();
        state.selectedSpots.push({ spot_id: spot.spot_id, type: spot.type, price: spot.price, plat_nomor: user.plat_nomor, merk_kendaraan: user.merk_kendaraan });
      }
    } catch { /* fallback */ }
    renderWizard();
  }

  async function renderWizard() {
    const steps = ['Pilih Lahan', 'Durasi', 'Tagihan', 'Upload', 'Selesai'];
    const stepsHtml = steps.map((s, i) => {
      const num = i + 1;
      let cls = '';
      if (num < state.step) cls = 'done';
      else if (num === state.step) cls = 'active';
      return `<div class="wizard-step ${cls}"><span class="step-num">${num}</span><span>${s}</span></div>`;
    }).join('');

    let bodyHtml = '';
    switch (state.step) {
      case 1: bodyHtml = await renderStep1(); break;
      case 2: bodyHtml = renderStep2(); break;
      case 3: bodyHtml = await renderStep3(); break;
      case 4: bodyHtml = renderStep4(); break;
      case 5: bodyHtml = renderStep5(); break;
    }

    const html = `
      <div class="booking-wizard">
        <h2><i class="fas fa-car-side" style="color:var(--primary)"></i> Sewa Parkir</h2>
        <p class="subtitle">Ikuti langkah berikut untuk menyewa lahan parkir</p>
        <div class="wizard-steps">${stepsHtml}</div>
        <div class="wizard-body">${bodyHtml}</div>
      </div>
    `;
    App.openModal(html);
  }

  async function renderStep1() {
    try {
      const [spotsRes, settingsRes] = await Promise.all([API.getParkingSpots(), API.getSettings()]);
      state.spots = spotsRes.success ? spotsRes.data : [];
      state.settings = settingsRes.success ? settingsRes.data : {};
    } catch { /* fallback */ }

    const typeBtns = ['Premium', 'Regular'].map(t => {
      const active = state.type === t ? 'btn-primary' : 'btn-outline';
      return `<button class="btn ${active} btn-sm" onclick="Booking.selectType('${t}')">${t}</button>`;
    }).join('');

    const filteredSpots = state.type ? state.spots.filter(s => s.type === state.type) : state.spots;
    const available = filteredSpots.filter(s => s.status === 'Available');

    const spotsHtml = available.length === 0
      ? `<div class="empty-state mt-2"><i class="fas fa-parking"></i><h3>Tidak ada slot tersedia</h3></div>`
      : available.map(s => {
        const selected = state.selectedSpots.find(ss => ss.spot_id === s.spot_id);
        const cls = selected ? 'btn-primary' : 'btn-outline';
        return `<button class="btn ${cls} btn-sm" onclick="Booking.toggleSpot('${s.spot_id}', '${s.type}', ${s.price})" style="margin:0.25rem">${s.spot_id}</button>`;
      }).join('');

    return `
      <h3>Pilih Area & Lahan</h3>
      <div style="display:flex;gap:0.5rem;margin-bottom:1rem">${typeBtns}</div>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem">Pilih maksimal <strong>4 lahan</strong>. Terpilih: <strong>${state.selectedSpots.length}/4</strong></p>
      <div style="display:flex;flex-wrap:wrap;gap:0">${spotsHtml}</div>
      <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:flex-end">
        <button class="btn btn-primary" onclick="Booking.nextStep()" ${state.selectedSpots.length === 0 ? 'disabled' : ''}>Lanjut <i class="fas fa-arrow-right"></i></button>
      </div>
    `;
  }

  function selectType(type) { state.type = type; state.selectedSpots = []; renderWizard(); }

  function toggleSpot(spotId, type, price) {
    const user = Auth.getUser();
    const idx = state.selectedSpots.findIndex(s => s.spot_id === spotId);
    if (idx >= 0) { state.selectedSpots.splice(idx, 1); }
    else {
      if (state.selectedSpots.length >= 4) { Utils.showToast('Maksimal 4 lahan per transaksi.', 'warning'); return; }
      state.selectedSpots.push({ spot_id: spotId, type, price, plat_nomor: user.plat_nomor, merk_kendaraan: user.merk_kendaraan });
    }
    renderWizard();
  }

  function renderStep2() {
    const durHtml = [1, 3, 6, 12].map(d => {
      const active = state.duration === d ? 'btn-primary' : 'btn-outline';
      const discKey = `DISKON_${d}`;
      const discVal = state.settings[discKey]?.value || '0';
      const { discDisplayVal } = parseDiscount(discVal, 0);
      const discLabel = discDisplayVal !== '0' ? ` <span style="color:var(--danger);font-weight:700">-${discDisplayVal}</span>` : '';
      return `<button class="btn ${active}" onclick="Booking.setDuration(${d})" style="flex:1;min-width:100px">${d} Bulan${discLabel}</button>`;
    }).join('');

    return `
      <h3>Pilih Durasi Sewa</h3>
      <div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-bottom:1.5rem">${durHtml}</div>
      <div style="display:flex;gap:0.5rem;justify-content:space-between">
        <button class="btn btn-ghost" onclick="Booking.prevStep()"><i class="fas fa-arrow-left"></i> Kembali</button>
        <button class="btn btn-primary" onclick="Booking.nextStep()">Lanjut <i class="fas fa-arrow-right"></i></button>
      </div>
    `;
  }

  function setDuration(d) { state.duration = d; renderWizard(); }

  async function renderStep3() {
    let rawTotal = 0;
    state.selectedSpots.forEach(s => { rawTotal += s.price * state.duration; });
    const discKey = `DISKON_${state.duration}`;
    const discVal = state.settings[discKey]?.value || '0';
    const { discountAmount, discDisplayVal } = parseDiscount(discVal, rawTotal);
    state.totalPrice = rawTotal;
    state.discount = discountAmount;
    state.finalTotal = Math.max(0, rawTotal - discountAmount);

    const spotsDetail = state.selectedSpots.map(s =>
      `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;border-bottom:1px solid var(--border-light)">
        <span><strong>${s.spot_id}</strong> (${s.type})</span>
        <span>${Utils.formatCurrency(s.price * state.duration)}</span>
      </div>`
    ).join('');

    let bankHtml = '<p style="font-size:0.85rem;color:var(--text-secondary)">Hubungi admin untuk informasi rekening.</p>';
    try {
      const banks = [];
      if (state.settings['BANK_BCA_NO']?.value) banks.push({ name: 'BCA', no: state.settings['BANK_BCA_NO'].value, holder: state.settings['BANK_BCA_NAME']?.value || '' });
      if (state.settings['BANK_BRI_NO']?.value) banks.push({ name: 'BRI', no: state.settings['BANK_BRI_NO'].value, holder: state.settings['BANK_BRI_NAME']?.value || '' });
      if (state.settings['BANK_DANA_NO']?.value) banks.push({ name: 'DANA', no: state.settings['BANK_DANA_NO'].value, holder: state.settings['BANK_DANA_NAME']?.value || '' });
      if (banks.length > 0) {
        bankHtml = banks.map((b, idx) => `
          <div class="bank-row">
            <div class="bank-row-info"><strong>${b.name}</strong><div class="bank-holder">${b.holder}</div></div>
            <div class="bank-row-number">
              <code id="bankNo_${idx}">${b.no}</code>
              <button class="btn-copy" id="copyBtn_${idx}" onclick="Booking._copyBankNo('bankNo_${idx}', 'copyBtn_${idx}')"><i class="fas fa-copy"></i> Salin</button>
            </div>
          </div>
        `).join('');
      }
    } catch { /* fallback */ }

    return `
      <h3>Ringkasan Tagihan</h3>
      ${spotsDetail}
      ${state.discount > 0 ? `<div style="display:flex;justify-content:space-between;padding:0.5rem 0;color:var(--success)"><span><i class="fas fa-tag"></i> Diskon (${discDisplayVal})</span><span>-${Utils.formatCurrency(state.discount)}</span></div>` : ''}
      <div style="display:flex;justify-content:space-between;padding:0.75rem 0;font-size:1.2rem;font-weight:800;border-top:2px solid var(--text-primary)">
        <span>TOTAL</span><span style="color:var(--primary)">${Utils.formatCurrency(state.finalTotal)}</span>
      </div>
      <div style="margin-top:1.5rem">
        <h3 style="font-size:0.95rem;margin-bottom:0.75rem"><i class="fas fa-university"></i> Transfer ke salah satu rekening berikut:</h3>
        <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:0.75rem">Klik <strong>Salin</strong> untuk menyalin nomor rekening.</p>
        ${bankHtml}
      </div>
      <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:space-between">
        <button class="btn btn-ghost" onclick="Booking.prevStep()"><i class="fas fa-arrow-left"></i> Kembali</button>
        <button class="btn btn-primary" onclick="Booking.nextStep()">Upload Bukti <i class="fas fa-arrow-right"></i></button>
      </div>
    `;
  }

  function _copyBankNo(codeId, btnId) {
    const code = document.getElementById(codeId);
    const btn = document.getElementById(btnId);
    if (!code || !btn) return;
    navigator.clipboard.writeText(code.textContent.trim()).then(() => {
      btn.classList.add('copied'); btn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fas fa-copy"></i> Salin'; }, 2000);
    }).catch(() => {
      const range = document.createRange(); range.selectNode(code);
      window.getSelection().removeAllRanges(); window.getSelection().addRange(range);
      document.execCommand('copy'); window.getSelection().removeAllRanges();
      btn.classList.add('copied'); btn.innerHTML = '<i class="fas fa-check"></i> Tersalin!';
      setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '<i class="fas fa-copy"></i> Salin'; }, 2000);
    });
  }

  function renderStep4() {
    return `
      <h3>Upload Bukti Transfer</h3>
      <p style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:1rem">Unggah foto atau PDF bukti transfer pembayaran Anda.</p>
      <div class="file-upload" id="fileUploadZone" onclick="document.getElementById('fileInput').click()">
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Klik untuk memilih file</p>
        <p class="form-hint">Format: JPG, PNG, PDF (Maks. 5MB)</p>
        <div class="file-name" id="fileName"></div>
        <input type="file" id="fileInput" accept="image/*,.pdf" onchange="Booking.handleFile(this)" />
      </div>
      <div style="margin-top:1.5rem;display:flex;gap:0.5rem;justify-content:space-between">
        <button class="btn btn-ghost" onclick="Booking.prevStep()"><i class="fas fa-arrow-left"></i> Kembali</button>
        <button class="btn btn-success btn-lg" id="btnSubmitBooking" onclick="Booking.submit()" disabled><i class="fas fa-paper-plane"></i> Kirim Booking</button>
      </div>
    `;
  }

  async function handleFile(input) {
    const file = input.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { Utils.showToast('Ukuran file maksimal 5MB.', 'warning'); return; }
    state.file = file;
    document.getElementById('fileName').textContent = file.name;
    document.getElementById('fileUploadZone').classList.add('has-file');
    document.getElementById('btnSubmitBooking').disabled = false;
    try { state.fileBase64 = await Utils.compressImage(file); }
    catch { Utils.showToast('Gagal memproses file.', 'error'); }
  }

  async function submit() {
    if (!state.fileBase64) { Utils.showToast('Silakan upload bukti transfer.', 'warning'); return; }
    const user = Auth.getUser();
    const btn = document.getElementById('btnSubmitBooking');
    Utils.setLoading(btn, true);
    try {
      const payload = {
        user_id: user.id,
        spots: state.selectedSpots.map(s => ({ spot_id: s.spot_id, plat_nomor: s.plat_nomor, merk_kendaraan: s.merk_kendaraan })),
        bulan_sewa: state.duration,
        bukti_transfer_base64: state.fileBase64,
        bukti_filename: state.file.name
      };
      const res = await API.createBooking(payload);
      if (res.success) { state.step = 5; state.result = res.data; renderWizard(); }
      else { Utils.showToast(res.message, 'error'); }
    } catch { Utils.showToast('Gagal mengirim booking. Coba lagi.', 'error'); }
    finally { Utils.setLoading(btn, false); }
  }

  function renderStep5() {
    const data = state.result || {};
    return `
      <div class="text-center" style="padding:1rem 0">
        <div style="width:80px;height:80px;margin:0 auto 1rem;background:#dcfce7;border-radius:50%;display:flex;align-items:center;justify-content:center">
          <i class="fas fa-check" style="font-size:2rem;color:var(--success)"></i>
        </div>
        <h2 style="color:var(--success)">Booking Berhasil!</h2>
        <p style="color:var(--text-secondary);margin-top:0.5rem">Transaksi Anda sedang menunggu verifikasi admin.</p>
        <div style="background:var(--bg-secondary);border-radius:var(--radius);padding:1rem;margin:1.5rem 0;text-align:left">
          <p style="font-size:0.85rem"><strong>ID Transaksi:</strong> ${(data.trx_ids || []).join(', ')}</p>
          <p style="font-size:0.85rem"><strong>Total Bayar:</strong> ${Utils.formatCurrency(data.total_bayar || 0)}</p>
          <p style="font-size:0.85rem"><strong>Periode:</strong> ${Utils.formatDate(data.start_date)} — ${Utils.formatDate(data.end_date)}</p>
        </div>
        <button class="btn btn-primary btn-lg" onclick="App.closeModal(); App.navigate('dashboard');"><i class="fas fa-tachometer-alt"></i> Lihat Dashboard</button>
      </div>
    `;
  }

  function nextStep() { if (state.step < 5) { state.step++; renderWizard(); } }
  function prevStep() { if (state.step > 1) { state.step--; renderWizard(); } }

  // ✅ SATU return statement saja
  return {
    start, startFromSpot, renderWizard, selectType, toggleSpot,
    setDuration, handleFile, submit, nextStep, prevStep, _copyBankNo
  };
})();
