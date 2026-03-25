/**
 * App Module — Main Controller, Navigation, Init
 */
const App = (() => {
  let _allSpots = [];

  async function init() {
    // Update auth UI
    Auth.updateUI();

    // Load initial data
    await Promise.allSettled([
      loadHeroStats(),
      loadReviewsPreview(),
      loadFooterContacts(),
      loadWAContacts(),
      loadDiscounts()
    ]);

    // Bind events
    bindEvents();

    // Session security
    if (window.AutoLogout) AutoLogout.init();

    // Hide loader
    setTimeout(() => {
      document.getElementById('app-loader').classList.add('hide');
    }, 600);
  }

  function bindEvents() {
    // Navbar toggle
    document.getElementById('navToggle').addEventListener('click', () => {
      document.getElementById('navToggle').classList.toggle('active');
      document.getElementById('navMenu').classList.toggle('show');
    });

    // Navbar scroll
    window.addEventListener('scroll', () => {
      document.getElementById('navbar').classList.toggle('scrolled', window.scrollY > 20);
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('userDropdown');
      if (dropdown && !e.target.closest('.nav-user-dropdown')) {
        dropdown.classList.remove('show');
      }
      const waPopup = document.getElementById('waPopup');
      if (waPopup && !e.target.closest('.wa-float')) {
        waPopup.classList.remove('show');
      }
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  }

  // ── Navigation ──
  function navigate(page) {
    // Close mobile nav
    document.getElementById('navMenu').classList.remove('show');
    document.getElementById('navToggle').classList.remove('active');

    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

    // Update nav active
    document.querySelectorAll('[data-nav]').forEach(a => a.classList.remove('active'));
    document.querySelector(`[data-nav="${page}"]`)?.classList.add('active');

    // Show target page
    const el = document.getElementById(`page-${page}`);
    if (el) {
      el.classList.add('active');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    // Load page data
    switch (page) {
      case 'availability': loadAvailability(); break;
      case 'financial': Financial.render(); break;
      case 'reviews': loadReviewsPage(); break;
      case 'dashboard':
        if (!Auth.isLoggedIn()) { Auth.showLoginModal(); navigate('home'); return; }
        if (Auth.isAdmin()) { navigate('admin'); return; }
        Dashboard.render();
        break;
      case 'admin':
        if (!Auth.isAdmin()) { navigate('home'); return; }
        Admin.render();
        break;
    }
  }

  // ── Modal ──
  function openModal(html) {
    document.getElementById('modalBody').innerHTML = html;
    document.getElementById('modalOverlay').classList.add('show');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modalOverlay').classList.remove('show');
    document.body.style.overflow = '';
  }

  // ── User Menu ──
  function toggleUserMenu() {
    document.getElementById('userDropdown').classList.toggle('show');
  }

  // ── WhatsApp ──
  function toggleWA() {
    document.getElementById('waPopup').classList.toggle('show');
  }

  // ── Data Loaders ──
  async function loadHeroStats() {
    try {
      const res = await API.getAvailability();
      if (res.success) {
        document.getElementById('statPremium').textContent = `${res.data.premium.available}/${res.data.premium.total}`;
        document.getElementById('statRegular').textContent = `${res.data.regular.available}/${res.data.regular.total}`;
        document.getElementById('statPrice').textContent = '50K';
      }
    } catch { /* silent */ }
  }

  async function loadDiscounts() {
    try {
      const res = await API.getSettings();
      if (!res.success) return;

      const discounts = [];
      [1, 3, 6, 12].forEach(d => {
        const key = `DISKON_${d}`;
        if (res.data[key] && res.data[key].value && res.data[key].value !== '0') {
          discounts.push({ months: d, value: res.data[key].value });
        }
      });

      if (discounts.length > 0) {
        const chips = discounts.map(d => {
          const discountDisplay = Utils.formatDiscountPercent(d.value);
          return `<div class="discount-chip"><i class="fas fa-tag"></i> ${d.months} Bulan: Diskon ${discountDisplay}</div>`;
        }).join('');

        document.getElementById('discountBanner').innerHTML = `
          <h3 style="font-size:1.1rem;font-weight:700;margin-bottom:0.25rem"><i class="fas fa-gift" style="color:var(--warning)"></i> Promo Diskon Langganan!</h3>
          <p style="font-size:0.9rem;color:var(--text-secondary)">Hemat lebih banyak dengan durasi sewa lebih panjang</p>
          <div class="discount-chips">${chips}</div>
        `;
      }
    } catch { /* silent */ }
  }

  async function loadReviewsPreview() {
    try {
      const res = await API.getReviews();
      if (!res.success || !res.data.length) return;

      const track = document.getElementById('reviewsTrack');
      track.innerHTML = res.data.slice(0, 8).map(r => `
        <div class="review-card">
          <div class="review-stars">${Utils.renderStars(r.rating)}</div>
          <p class="review-text">"${r.komentar}"</p>
          <div class="review-author">
            <div class="review-avatar">${Utils.getInitials(r.nama_user)}</div>
            <div class="review-author-info">
              <h4>${r.nama_user}</h4>
              <p>${Utils.formatShortDate(r.timestamp)}</p>
            </div>
          </div>
        </div>
      `).join('');
    } catch { /* silent */ }
  }

  async function loadReviewsPage() {
    const list = document.getElementById('reviewsList');
    list.innerHTML = `<div class="text-center" style="padding:2rem;grid-column:1/-1"><span class="spinner" style="width:24px;height:24px;display:inline-block;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite"></span></div>`;

    try {
      const res = await API.getReviews();
      if (!res.success || !res.data.length) {
        list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-comments"></i><h3>Belum ada ulasan</h3></div>`;
        return;
      }

      list.innerHTML = res.data.map(r => `
        <div class="review-card">
          <div class="review-stars">${Utils.renderStars(r.rating)}</div>
          <p class="review-text" style="-webkit-line-clamp:none">"${r.komentar}"</p>
          <div class="review-author">
            <div class="review-avatar">${Utils.getInitials(r.nama_user)}</div>
            <div class="review-author-info">
              <h4>${r.nama_user}</h4>
              <p>${Utils.formatShortDate(r.timestamp)}</p>
            </div>
          </div>
        </div>
      `).join('');
    } catch {
      list.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><i class="fas fa-wifi"></i><h3>Gagal memuat ulasan</h3></div>`;
    }
  }

  function showReviewForm() {
    const html = `
      <h2><i class="fas fa-pen" style="color:var(--warning)"></i> Tulis Ulasan</h2>
      <p class="subtitle">Bagikan pengalaman Anda tentang layanan parkir kami</p>
      <div class="form-group">
        <label>Nama Anda</label>
        <input type="text" class="form-control" id="reviewName" placeholder="Nama Anda" value="${Auth.getUser()?.nama || ''}" />
      </div>
      <div class="form-group">
        <label>Rating</label>
        <div id="ratingStars" style="display:flex;gap:0.5rem;font-size:1.75rem;cursor:pointer">
          ${[1,2,3,4,5].map(i => `<i class="fas fa-star" data-rate="${i}" style="color:var(--border)" onclick="App._setRating(${i})"></i>`).join('')}
        </div>
      </div>
      <div class="form-group">
        <label>Komentar</label>
        <textarea class="form-control" id="reviewComment" rows="3" placeholder="Ceritakan pengalaman Anda..."></textarea>
      </div>
      <button class="btn btn-primary btn-block btn-lg" id="btnSubmitReview" onclick="App._submitReview()">
        <i class="fas fa-paper-plane"></i> Kirim Ulasan
      </button>
    `;
    App.openModal(html);
    App._currentRating = 0;
  }

  function _setRating(r) {
    App._currentRating = r;
    document.querySelectorAll('#ratingStars i').forEach((star, i) => {
      star.style.color = i < r ? 'var(--warning)' : 'var(--border)';
    });
  }

  async function _submitReview() {
    const name = document.getElementById('reviewName').value.trim();
    const comment = document.getElementById('reviewComment').value.trim();
    const rating = App._currentRating;

    if (!name || !comment || !rating) {
      Utils.showToast('Lengkapi nama, rating, dan komentar.', 'warning');
      return;
    }

    const btn = document.getElementById('btnSubmitReview');
    Utils.setLoading(btn, true);

    try {
      const res = await API.addReview({ nama_user: name, rating, komentar: comment });
      Utils.showToast(res.message, res.success ? 'success' : 'error');
      if (res.success) {
        closeModal();
        loadReviewsPage();
        loadReviewsPreview();
      }
    } catch {
      Utils.showToast('Gagal mengirim ulasan.', 'error');
    } finally {
      Utils.setLoading(btn, false);
    }
  }

  async function loadAvailability() {
    const summary = document.getElementById('availSummary');
    const grid = document.getElementById('spotsGrid');

    try {
      const [availRes, spotsRes] = await Promise.all([
        API.getAvailability(),
        API.getParkingSpots()
      ]);

      if (availRes.success) {
        const d = availRes.data;
        summary.innerHTML = `
          <div class="avail-card">
            <div class="avail-card-icon premium"><i class="fas fa-crown"></i></div>
            <div class="avail-card-content">
              <h3>${d.premium.available} <span style="font-size:0.9rem;font-weight:400;color:var(--text-tertiary)">/ ${d.premium.total}</span></h3>
              <p>Slot Premium Tersedia • ${Utils.formatCurrency(d.premium.price)}/bln</p>
            </div>
          </div>
          <div class="avail-card">
            <div class="avail-card-icon regular"><i class="fas fa-bolt"></i></div>
            <div class="avail-card-content">
              <h3>${d.regular.available} <span style="font-size:0.9rem;font-weight:400;color:var(--text-tertiary)">/ ${d.regular.total}</span></h3>
              <p>Slot Regular Tersedia • ${Utils.formatCurrency(d.regular.price)}/bln</p>
            </div>
          </div>
        `;
      }

      if (spotsRes.success) {
        _allSpots = spotsRes.data;
        renderSpots(_allSpots);
      }
    } catch {
      summary.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal memuat data</h3></div>`;
    }
  }

  function renderSpots(spots) {
    const grid = document.getElementById('spotsGrid');
    grid.innerHTML = spots.map(s => {
      const isAvail = s.status === 'Available';
      const cls = isAvail ? 'available' : 'booked';
      const icon = isAvail ? '<i class="fas fa-parking"></i>' : '<i class="fas fa-car-side"></i>';
      // Tambahkan event onclick memanggil handleSpotClick
      const action = `onclick="App.handleSpotClick('${s.spot_id}', '${s.type}', ${s.price}, '${s.status}', '${s.end_date || ''}')"`;

      return `
        <div class="spot-card ${cls}" ${action} title="${isAvail ? 'Klik untuk Sewa Lahan' : 'Lihat Info Durasi'}">
          <div class="spot-icon">${icon}</div>
          <div class="spot-id">${s.spot_id}</div>
          <div class="spot-type">${s.type}</div>
          <div class="spot-status">${isAvail ? 'Tersedia' : 'Terisi'}</div>
        </div>
      `;
    }).join('');
  }

  function filterSpots(type, btn) {
    document.querySelectorAll('.spots-filter .btn').forEach(b => {
      b.className = 'btn btn-sm btn-ghost';
    });
    btn.className = 'btn btn-sm btn-primary active';

    const filtered = type === 'all' ? _allSpots : _allSpots.filter(s => s.type === type);
    renderSpots(filtered);
  }

  function handleSpotClick(spotId, type, price, status, endDateStr) {
    if (status === 'Available') {
      // 1. Jika Lahan Tersedia (Klik untuk Sewa)
      if (!Auth.isLoggedIn()) {
        Utils.showToast('Silakan masuk/login terlebih dahulu untuk menyewa lahan.', 'info');
        Auth.showLoginModal();
        return;
      }
      
      // Buka wizard booking dan atur tipe area
      Booking.start(type);
      
      // Berikan jeda sebentar agar modal form selesai di-render
      // Kemudian otomatis tandai spot tersebut
      setTimeout(() => {
        Booking.toggleSpot(spotId, type, price);
        Utils.showToast(`Lahan ${spotId} berhasil dipilih!`, 'success');
      }, 350);
      
    } else {
      // 2. Jika Lahan Terisi (Tampilkan Popup Sisa Waktu)
      let endDate;
      let isMock = false;
      
      // Cek apakah API backend mengembalikan data tanggal akhir sewa
      if (endDateStr && endDateStr !== 'undefined' && endDateStr !== '') {
        endDate = new Date(endDateStr);
      } else {
        // Fallback UI: Jika backend belum mengirimkan data end_date,
        // Buat tanggal dummy / perkiraan untuk UI interaktif.
        const randomDays = Math.floor(Math.random() * 25) + 5;
        endDate = new Date();
        endDate.setDate(endDate.getDate() + randomDays);
        isMock = true;
      }
      
      const now = new Date();
      const diffTime = endDate - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const html = `
        <div class="text-center" style="padding: 1rem 0">
          <div style="width:72px;height:72px;background:#fee2e2;color:#ef4444;border-radius:50%;display:flex;align-items:center;justify-content:center;margin:0 auto 1rem;font-size:2.2rem;box-shadow:0 10px 15px -3px rgba(239,68,68,0.2)">
            <i class="fas fa-car-side"></i>
          </div>
          <h2 style="margin-bottom: 0.25rem;">Lahan ${spotId}</h2>
          <span class="status-badge expired" style="margin-bottom: 1.5rem; display: inline-block; background: var(--danger); color: #fff;">Sedang Disewa</span>
          
          <div style="background:var(--bg-secondary); border-radius:var(--radius-lg); padding:1.5rem; margin-bottom:1.5rem; border: 1px solid var(--border)">
            <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:0.5rem">Estimasi Sisa Durasi:</p>
            <h3 style="font-size:2.8rem; font-weight:900; color:var(--text-primary); margin:0; line-height:1">${diffDays > 0 ? diffDays : 0} <span style="font-size:1.1rem;font-weight:600;color:var(--text-secondary)">Hari</span></h3>
            <p style="font-size:0.9rem; color:var(--text-tertiary); margin-top:0.75rem"><i class="fas fa-calendar-alt"></i> Berakhir: <strong>${Utils.formatDate(endDate.toISOString())}</strong></p>
          </div>
          
          ${isMock ? '<p style="font-size:0.75rem;color:var(--warning);margin-bottom:1.25rem;text-align:left;background:#fef3c7;padding:0.75rem;border-radius:var(--radius-sm)"><i class="fas fa-info-circle"></i> <strong>Mode Pratinjau:</strong> Sisa hari ini adalah simulasi UI karena pengaturan data API backend belum disinkronisasi sepenuhnya.</p>' : ''}
          
          <button class="btn btn-outline btn-block btn-lg" onclick="App.closeModal()">Tutup Info</button>
        </div>
      `;
      App.openModal(html);
    }
  }

  async function loadFooterContacts() {
    try {
      const res = await API.getAdminContacts();
      if (res.success) {
        const el = document.getElementById('footerContacts');
        el.innerHTML = res.data.map(c =>
          `<p style="margin-bottom:0.35rem"><strong>${c.blok}:</strong> ${c.nama_admin}<br/><small>${c.no_whatsapp}</small></p>`
        ).join('');
      }
    } catch { /* silent */ }
  }

  async function loadWAContacts() {
    try {
      const res = await API.getAdminContacts();
      if (res.success) {
        const el = document.getElementById('waContacts');
        const waMsg = encodeURIComponent('Halo admin, saya ingin menanyakan informasi mengenai sewa parkir di Pradha Ciganitri.');
        el.innerHTML = res.data.map(c => `
          <a href="https://wa.me/${c.no_whatsapp}?text=${waMsg}" target="_blank" class="wa-contact">
            <div class="wa-contact-avatar">${Utils.getInitials(c.nama_admin)}</div>
            <div class="wa-contact-info">
              <h5>${c.nama_admin}</h5>
              <p>${c.blok} • ${c.no_whatsapp}</p>
            </div>
          </a>
        `).join('');
      }
    } catch { /* silent */ }
  }

  return {
    init, navigate,
    openModal, closeModal,
    toggleUserMenu, toggleWA,
    filterSpots, showReviewForm,
    _setRating, _submitReview,
    handleSpotClick,
    _currentRating: 0
  };
})();

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', App.init);
