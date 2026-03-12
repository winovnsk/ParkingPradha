/**
 * Financial Module — Transparansi Keuangan & PDF Export
 */
const Financial = (() => {

  async function render() {
    const el = document.getElementById('financialContent');
    const months = Utils.getMonthOptions();
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const startDefault = `${now.getFullYear()}-01`;

    const monthOpts = months.map(m =>
      `<option value="${m.value}">${m.label}</option>`
    ).join('');

    el.innerHTML = `
      <div class="finance-filters">
        <div class="form-group">
          <label>Dari Bulan</label>
          <select class="form-control" id="finStartMonth">${monthOpts}</select>
        </div>
        <div class="form-group">
          <label>Sampai Bulan</label>
          <select class="form-control" id="finEndMonth">${monthOpts}</select>
        </div>
        <button class="btn btn-primary" onclick="Financial.load()"><i class="fas fa-search"></i> Tampilkan</button>
        <button class="btn btn-outline" id="btnExportPdf" onclick="Financial.exportPDF()"><i class="fas fa-file-pdf"></i> Download PDF</button>
      </div>
      <div id="finResults">
        <div class="empty-state"><i class="fas fa-chart-bar"></i><h3>Pilih Rentang Bulan</h3><p>Klik "Tampilkan" untuk melihat laporan</p></div>
      </div>
    `;

    document.getElementById('finStartMonth').value = startDefault;
    document.getElementById('finEndMonth').value = currentMonth;

    // Also load investor progress
    await loadInvestorPublic();
  }

  async function loadInvestorPublic() {
    try {
      const res = await API.getInvestorReturns();
      if (!res.success) return;

      const data = res.data;
      const resultsEl = document.getElementById('finResults');

      resultsEl.innerHTML = `
        <div class="investor-progress">
          <h3><i class="fas fa-hand-holding-usd"></i> Progres Pengembalian Investasi</h3>
          <div class="investor-detail">
            <span>Terbayar: ${Utils.formatCurrency(data.total_dibayar)}</span>
            <span>Target: ${Utils.formatCurrency(data.target)}</span>
          </div>
          <div class="progress-bar" style="height:12px">
            <div class="progress-fill" style="width:${data.progress_percent}%"></div>
          </div>
          <p style="text-align:center;margin-top:0.5rem;font-size:0.85rem;font-weight:700">${data.progress_percent}%</p>
        </div>
        <div class="empty-state"><i class="fas fa-chart-bar"></i><h3>Pilih Rentang Bulan</h3><p>Klik "Tampilkan" untuk melihat detail pemasukan & pengeluaran</p></div>
      `;
    } catch { /* silent */ }
  }

  let _lastReport = null;

  async function load() {
    const startMonth = document.getElementById('finStartMonth').value;
    const endMonth = document.getElementById('finEndMonth').value;
    const resultsEl = document.getElementById('finResults');

    resultsEl.innerHTML = `<div class="text-center" style="padding:2rem"><span class="spinner" style="width:24px;height:24px;display:inline-block;border:3px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite"></span></div>`;

    try {
      const [finRes, invRes] = await Promise.all([
        API.getFinancialReport(startMonth, endMonth),
        API.getInvestorReturns()
      ]);

      if (!finRes.success) {
        resultsEl.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><h3>Gagal memuat data</h3></div>`;
        return;
      }

      _lastReport = { finance: finRes.data, investor: invRes.success ? invRes.data : null, startMonth, endMonth };

      const fin = finRes.data;
      const inv = invRes.success ? invRes.data : {};

      // Income rows
      const incomeRows = (fin.pemasukan?.detail || []).map(r => `
        <tr>
          <td><code style="font-size:0.75rem">${r.trx_id}</code></td>
          <td>${r.spot_id}</td>
          <td>${r.bulan_sewa} bln</td>
          <td><strong>${Utils.formatCurrency(r.total_bayar)}</strong></td>
          <td>${Utils.formatShortDate(r.tanggal)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary)">Tidak ada data</td></tr>';

      const expenseRows = (fin.pengeluaran?.detail || []).map(r => `
        <tr>
          <td><code style="font-size:0.75rem">${r.return_id}</code></td>
          <td>${Utils.formatShortDate(r.tanggal)}</td>
          <td><strong>${Utils.formatCurrency(r.nominal)}</strong></td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary)">Tidak ada data</td></tr>';

      resultsEl.innerHTML = `
        <div class="investor-progress">
          <h3><i class="fas fa-hand-holding-usd"></i> Progres Pengembalian Investasi</h3>
          <div class="investor-detail">
            <span>Terbayar: ${Utils.formatCurrency(inv.total_dibayar || 0)}</span>
            <span>Target: ${Utils.formatCurrency(inv.target || 41300000)}</span>
          </div>
          <div class="progress-bar" style="height:12px">
            <div class="progress-fill" style="width:${inv.progress_percent || 0}%"></div>
          </div>
          <p style="text-align:center;margin-top:0.5rem;font-size:0.85rem;font-weight:700">${inv.progress_percent || 0}%</p>
        </div>

        <div class="finance-summary">
          <div class="finance-card">
            <div class="label">Total Pemasukan</div>
            <div class="value income">${Utils.formatCurrency(fin.pemasukan?.total || 0)}</div>
          </div>
          <div class="finance-card">
            <div class="label">Total Pengeluaran (Investor)</div>
            <div class="value expense">${Utils.formatCurrency(fin.pengeluaran?.total || 0)}</div>
          </div>
          <div class="finance-card">
            <div class="label">Saldo</div>
            <div class="value balance">${Utils.formatCurrency(fin.saldo || 0)}</div>
          </div>
        </div>

        <h3 style="margin-bottom:1rem"><i class="fas fa-arrow-down" style="color:var(--success)"></i> Detail Pemasukan</h3>
        <div class="data-table" style="margin-bottom:2rem">
          <table>
            <thead><tr><th>ID</th><th>Slot</th><th>Durasi</th><th>Nominal</th><th>Tanggal</th></tr></thead>
            <tbody>${incomeRows}</tbody>
          </table>
        </div>

        <h3 style="margin-bottom:1rem"><i class="fas fa-arrow-up" style="color:var(--danger)"></i> Detail Pengeluaran (Cicilan Investor)</h3>
        <div class="data-table">
          <table>
            <thead><tr><th>ID</th><th>Tanggal</th><th>Nominal</th></tr></thead>
            <tbody>${expenseRows}</tbody>
          </table>
        </div>
      `;

    } catch {
      resultsEl.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal terhubung</h3></div>`;
    }
  }

  function exportPDF() {
    if (!_lastReport) {
      Utils.showToast('Tampilkan laporan terlebih dahulu.', 'warning');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const fin = _lastReport.finance;
    const inv = _lastReport.investor;

    // Header
    doc.setFontSize(18);
    doc.setFont(undefined, 'bold');
    doc.text('Laporan Keuangan', 14, 20);
    doc.setFontSize(11);
    doc.setFont(undefined, 'normal');
    doc.text('Pradha Ciganitri Parking System', 14, 28);
    doc.text(`Periode: ${_lastReport.startMonth} s/d ${_lastReport.endMonth}`, 14, 35);
    doc.text(`Dicetak: ${new Date().toLocaleDateString('id-ID')}`, 14, 42);

    // Summary
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Ringkasan', 14, 55);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total Pemasukan   : ${Utils.formatCurrency(fin.pemasukan?.total || 0)}`, 14, 63);
    doc.text(`Total Pengeluaran : ${Utils.formatCurrency(fin.pengeluaran?.total || 0)}`, 14, 70);
    doc.text(`Saldo             : ${Utils.formatCurrency(fin.saldo || 0)}`, 14, 77);

    if (inv) {
      doc.text(`Investor Terbayar : ${Utils.formatCurrency(inv.total_dibayar || 0)} / ${Utils.formatCurrency(inv.target || 0)} (${inv.progress_percent || 0}%)`, 14, 84);
    }

    // Income Table
    let startY = 96;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Detail Pemasukan', 14, startY);

    const incomeData = (fin.pemasukan?.detail || []).map(r => [
      r.trx_id, r.spot_id, `${r.bulan_sewa} bln`,
      Utils.formatCurrency(r.total_bayar), r.tanggal || '-'
    ]);

    doc.autoTable({
      startY: startY + 4,
      head: [['ID', 'Slot', 'Durasi', 'Nominal', 'Tanggal']],
      body: incomeData.length ? incomeData : [['Tidak ada data', '', '', '', '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });

    // Expense Table
    const expStartY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Detail Pengeluaran (Cicilan Investor)', 14, expStartY);

    const expenseData = (fin.pengeluaran?.detail || []).map(r => [
      r.return_id, r.tanggal || '-', Utils.formatCurrency(r.nominal)
    ]);

    doc.autoTable({
      startY: expStartY + 4,
      head: [['ID', 'Tanggal', 'Nominal']],
      body: expenseData.length ? expenseData : [['Tidak ada data', '', '']],
      styles: { fontSize: 8 },
      headStyles: { fillColor: [239, 68, 68] }
    });

    doc.save(`Laporan_Keuangan_${_lastReport.startMonth}_${_lastReport.endMonth}.pdf`);
    Utils.showToast('PDF berhasil diunduh!', 'success');
  }

  return { render, load, exportPDF };
})();
