/**
 * Dashboard Module — User Dashboard
 */
const Dashboard = (() => {

  async function render() {
    const user = Auth.getUser();
    if (!user) {
      Auth.showLoginModal();
      return;
    }

    const header = document.getElementById('dashHeader');
    const content = document.getElementById('dashContent');

    header.innerHTML = `
      <div class="dash-welcome">
        <div class="dash-avatar">${Utils.getInitials(user.nama)}</div>
        <div>
          <h2>Halo, ${user.nama}!</h2>
          <p>${user.blok_rumah} &bull; ${user.plat_nomor} &bull; ${user.merk_kendaraan}</p>
        </div>
      </div>
    `;

    content.innerHTML = `
      <div style="text-align:center;padding:2rem"><span class="spinner" style="width:24px;height:24px;border-width:3px;display:inline-block;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite"></span><p style="margin-top:0.5rem;color:var(--text-secondary)">Memuat data...</p></div>
    `;

    try {
      const [dashRes, histRes] = await Promise.all([
        API.getUserDashboard(user.id),
        API.getTransactionHistory(user.id)
      ]);

      if (!dashRes.success) {
        content.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Gagal memuat data</h3><p>${dashRes.message}</p></div>`;
        return;
      }

      const rentals = dashRes.data.active_rentals || [];
      const history = histRes.success ? histRes.data : [];

      let rentalsHtml = '';
      if (rentals.length === 0) {
        rentalsHtml = `
          <div class="empty-state">
            <i class="fas fa-car"></i>
            <h3>Belum Ada Sewa Aktif</h3>
            <p>Mulai sewa lahan parkir sekarang</p>
            <button class="btn btn-primary mt-2" onclick="Booking.start()">
              <i class="fas fa-plus"></i> Sewa Parkir
            </button>
          </div>
        `;
      } else {
        rentalsHtml = rentals.map(r => {
          const progressClass = r.remaining_days <= 7 ? 'danger' : (r.progress_percent > 70 ? 'warning' : '');
          return `
            <div class="rental-card">
              <div class="rental-card-header">
                <span class="rental-spot"><i class="fas fa-square-parking"></i> ${r.spot_id}</span>
                <span class="rental-badge active">Aktif</span>
              </div>
              <div class="rental-info">
                <div class="rental-info-item"><label>Kendaraan</label><p>${r.merk_kendaraan}</p></div>
                <div class="rental-info-item"><label>Plat Nomor</label><p>${r.plat_nomor}</p></div>
                <div class="rental-info-item"><label>Mulai</label><p>${Utils.formatShortDate(r.start_date)}</p></div>
                <div class="rental-info-item"><label>Berakhir</label><p>${Utils.formatShortDate(r.end_date)}</p></div>
              </div>
              <div class="progress-container">
                <div class="progress-label">
                  <span>Sisa Masa Sewa</span>
                  <span style="color: ${r.remaining_days <= 7 ? 'var(--danger)' : 'var(--text-primary)'}">${r.remaining_days} hari</span>
                </div>
                <div class="progress-bar">
                  <div class="progress-fill ${progressClass}" style="width:${r.progress_percent}%"></div>
                </div>
              </div>
              ${r.is_expiring_soon ? `<p style="font-size:0.8rem;color:var(--danger);font-weight:600;margin-top:0.5rem"><i class="fas fa-exclamation-triangle"></i> Segera berakhir!</p>` : ''}
              <button class="btn btn-primary btn-block mt-2" onclick="Dashboard.showExtendModal('${r.trx_id}', '${r.spot_id}')">
                <i class="fas fa-calendar-plus"></i> Perpanjang Sewa
              </button>
            </div>
          `;
        }).join('');
      }

      // History table
      let historyHtml = '';
      if (history.length > 0) {
        const rows = history.map(h => `
          <tr>
            <td><code style="font-size:0.75rem">${h.trx_id}</code></td>
            <td>${h.spot_id}</td>
            <td>${h.bulan_sewa} bln</td>
            <td>${Utils.formatCurrency(h.total_bayar)}</td>
            <td><span class="status-badge ${h.status.toLowerCase()}">${h.status}</span></td>
            <td>${Utils.formatShortDate(h.created_at)}</td>
          </tr>
        `).join('');

        historyHtml = `
          <div style="margin-top:2rem">
            <h3 style="margin-bottom:1rem"><i class="fas fa-history"></i> Riwayat Transaksi</h3>
            <div class="data-table">
              <table>
                <thead>
                  <tr><th>ID</th><th>Slot</th><th>Durasi</th><th>Nominal</th><th>Status</th><th>Tanggal</th></tr>
                </thead>
                <tbody>${rows}</tbody>
              </table>
            </div>
          </div>
        `;
      }

      content.innerHTML = `
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.5rem">
            <h3><i class="fas fa-car"></i> Sewa Aktif</h3>
            <button class="btn btn-primary btn-sm" onclick="Booking.start()"><i class="fas fa-plus"></i> Sewa Baru</button>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill, minmax(340px, 1fr));gap:1.25rem">
            ${rentalsHtml}
          </div>
          ${historyHtml}
        </div>
      `;

    } catch (err) {
      content.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal Terhubung</h3><p>Periksa koneksi internet Anda</p></div>`;
    }
  }

  function showExtendModal(trxId, spotId) {
    let selectedDuration = 1;
    let fileBase64 = null;
    let fileName = '';
    let fileMimeType = '';

    function renderExtend() {
      const durations = [1, 3, 6, 12];
      const durHtml = durations.map(d => {
        const cls = selectedDuration === d ? 'btn-primary' : 'btn-outline';
        return `<button class="btn ${cls} btn-sm" onclick="document.querySelector('[data-dur=\\'${d}\\']').click()" data-dur="${d}" style="flex:1">${d} Bln</button>`;
      }).join('');

      const html = `
        <h2><i class="fas fa-calendar-plus" style="color:var(--primary)"></i> Perpanjang Sewa</h2>
        <p class="subtitle">Slot: <strong>${spotId}</strong></p>

        <div class="form-group">
          <label>Pilih Durasi Perpanjangan</label>
          <div style="display:flex;gap:0.5rem">${durHtml}</div>
        </div>

        <div class="form-group">
          <label>Upload Bukti Transfer</label>
          <div class="file-upload ${fileName ? 'has-file' : ''}" onclick="document.getElementById('extFileInput').click()">
            <i class="fas fa-cloud-upload-alt"></i>
            <p>${fileName || 'Klik untuk memilih file'}</p>
            <input type="file" id="extFileInput" accept="image/*,.pdf" onchange="Dashboard._handleExtFile(this)" />
          </div>
        </div>

        <button class="btn btn-success btn-block btn-lg" id="btnExtend" onclick="Dashboard._submitExtend('${trxId}')" ${!fileBase64 ? 'disabled' : ''}>
          <i class="fas fa-check"></i> Kirim Perpanjangan
        </button>
      `;
      App.openModal(html);

      // Re-bind duration buttons
      durations.forEach(d => {
        const btn = document.querySelector(`[data-dur="${d}"]`);
        if (btn) {
          btn.onclick = () => {
            selectedDuration = d;
            renderExtend();
          };
        }
      });
    }

    // Expose handlers to window scope via Dashboard
    Dashboard._handleExtFile = async (input) => {
      const file = input.files[0];
      if (!file) return;
      try {
        const prepared = await Utils.prepareUploadFile(file);
        fileBase64 = prepared.base64;
        fileName = prepared.filename;
        fileMimeType = prepared.mimeType;
        renderExtend();
      } catch (err) {
        Utils.showToast(err?.message || 'Gagal memproses file.', 'error');
      }
    };

    Dashboard._submitExtend = async (tId) => {
      if (!fileBase64) return;
      const btn = document.getElementById('btnExtend');
      Utils.setLoading(btn, true);

      try {
        const res = await API.extendBooking({
          trx_id: tId,
          bulan_tambah: selectedDuration,
          bukti_transfer_base64: fileBase64,
          bukti_filename: fileName,
          bukti_mime_type: fileMimeType
        });

        if (res.success) {
          App.closeModal();
          Utils.showToast('Perpanjangan berhasil diajukan!', 'success');
          render();
        } else {
          Utils.showToast(res.message, 'error');
        }
      } catch {
        Utils.showToast('Gagal mengirim perpanjangan.', 'error');
      } finally {
        Utils.setLoading(btn, false);
      }
    };

    renderExtend();
  }

  return { render, showExtendModal, _handleExtFile: null, _submitExtend: null };
})();
