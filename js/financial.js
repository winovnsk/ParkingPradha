/**
 * Financial Module — Transparansi Keuangan, Chart Profesional & PDF Export
 */
const Financial = (() => {
  let _lastReport = null;
  let _financeChart = null; // Menyimpan instance grafik

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
        <div class="form-group" style="flex: 1; min-width: 160px;">
          <label><i class="fas fa-calendar-alt"></i> Dari Bulan</label>
          <select class="form-control" id="finStartMonth">${monthOpts}</select>
        </div>
        <div class="form-group" style="flex: 1; min-width: 160px;">
          <label><i class="fas fa-calendar-check"></i> Sampai Bulan</label>
          <select class="form-control" id="finEndMonth">${monthOpts}</select>
        </div>
        <div style="display: flex; gap: 0.5rem; align-items: flex-end; flex-wrap: wrap;">
          <button class="btn btn-primary" onclick="Financial.load()"><i class="fas fa-search"></i> Tampilkan Laporan</button>
          <button class="btn btn-outline" id="btnExportPdf" onclick="Financial.exportPDF()"><i class="fas fa-file-pdf"></i> Ekspor PDF</button>
        </div>
      </div>
      <div id="finResults">
        <div class="empty-state"><i class="fas fa-chart-line"></i><h3>Laporan Keuangan</h3><p>Klik "Tampilkan Laporan" untuk melihat grafik dan detail.</p></div>
      </div>
    `;

    document.getElementById('finStartMonth').value = startDefault;
    document.getElementById('finEndMonth').value = currentMonth;

    // Load public investor progress as default state
    await loadInvestorPublic();
  }

  async function loadInvestorPublic() {
    try {
      const res = await API.getInvestorReturns();
      if (!res.success) return;
      const data = res.data;
      const resultsEl = document.getElementById('finResults');
      
      // Initial state before clicking 'Tampilkan'
      resultsEl.innerHTML = `
        <div class="investor-progress mb-4">
          <h3><i class="fas fa-hand-holding-usd"></i> Progres Pengembalian Investasi</h3>
          <div class="investor-detail">
            <span>Terbayar: <strong>${Utils.formatCurrency(data.total_dibayar)}</strong></span>
            <span>Target: <strong>${Utils.formatCurrency(data.target)}</strong></span>
          </div>
          <div class="progress-bar" style="height:12px">
            <div class="progress-fill" style="width:${data.progress_percent}%"></div>
          </div>
          <p style="text-align:center;margin-top:0.5rem;font-size:0.85rem;font-weight:700">${data.progress_percent}% Tercapai</p>
        </div>
        <div class="empty-state mt-4"><i class="fas fa-chart-line"></i><h3>Data Tersedia</h3><p>Tentukan rentang bulan untuk melihat analisis grafik mendalam.</p></div>
      `;
    } catch { /* silent */ }
  }

  async function load() {
    const startMonth = document.getElementById('finStartMonth').value;
    const endMonth = document.getElementById('finEndMonth').value;
    const resultsEl = document.getElementById('finResults');

    resultsEl.innerHTML = `<div class="text-center" style="padding:4rem"><span class="spinner" style="width:36px;height:36px;display:inline-block;border:4px solid var(--border);border-top-color:var(--primary);border-radius:50%;animation:spin .6s linear infinite"></span><p class="mt-2 text-secondary">Menganalisis data...</p></div>`;

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

      // Prepare Table Rows
      const incomeRows = (fin.pemasukan?.detail || []).map(r => `
        <tr>
          <td><code style="font-size:0.75rem">${r.trx_id}</code></td>
          <td>${r.spot_id}</td>
          <td>${r.bulan_sewa} bln</td>
          <td><strong>${Utils.formatCurrency(r.total_bayar)}</strong></td>
          <td>${Utils.formatShortDate(r.tanggal)}</td>
        </tr>
      `).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--text-tertiary)">Tidak ada data pemasukan pada periode ini</td></tr>';

      const expenseRows = (fin.pengeluaran?.detail || []).map(r => `
        <tr>
          <td><code style="font-size:0.75rem">${r.return_id}</code></td>
          <td>${Utils.formatShortDate(r.tanggal)}</td>
          <td><strong>${Utils.formatCurrency(r.nominal)}</strong></td>
        </tr>
      `).join('') || '<tr><td colspan="3" style="text-align:center;color:var(--text-tertiary)">Tidak ada data pengeluaran pada periode ini</td></tr>';

      // Build Dashboard Layout
      resultsEl.innerHTML = `
        <div class="finance-dashboard-grid">
          <!-- Kiri: Ringkasan & Progress -->
          <div class="finance-left-panel">
            <div class="finance-summary-vertical">
              <div class="finance-card">
                <div class="finance-card-icon income"><i class="fas fa-arrow-down"></i></div>
                <div class="finance-card-info">
                  <div class="label">Total Pemasukan</div>
                  <div class="value income">${Utils.formatCurrency(fin.pemasukan?.total || 0)}</div>
                </div>
              </div>
              <div class="finance-card">
                <div class="finance-card-icon expense"><i class="fas fa-arrow-up"></i></div>
                <div class="finance-card-info">
                  <div class="label">Total Pengeluaran</div>
                  <div class="value expense">${Utils.formatCurrency(fin.pengeluaran?.total || 0)}</div>
                </div>
              </div>
              <div class="finance-card">
                <div class="finance-card-icon balance"><i class="fas fa-wallet"></i></div>
                <div class="finance-card-info">
                  <div class="label">Saldo Berjalan</div>
                  <div class="value balance">${Utils.formatCurrency(fin.saldo || 0)}</div>
                </div>
              </div>
            </div>

            <div class="investor-progress mt-4">
              <h3><i class="fas fa-hand-holding-usd"></i> Progress Investor</h3>
              <div class="investor-detail">
                <span>Terbayar: ${Utils.formatCurrency(inv.total_dibayar || 0)}</span>
                <span>Target: ${Utils.formatCurrency(inv.target || 0)}</span>
              </div>
              <div class="progress-bar" style="height:10px">
                <div class="progress-fill" style="width:${inv.progress_percent || 0}%"></div>
              </div>
              <p style="text-align:center;margin-top:0.5rem;font-size:0.8rem;font-weight:700">${inv.progress_percent || 0}% Terselesaikan</p>
            </div>
          </div>

          <!-- Kanan: Grafik -->
          <div class="finance-right-panel">
             <div class="chart-container">
                <h3 style="margin-bottom: 1rem; font-size:1.1rem; color: var(--text-primary)"><i class="fas fa-chart-bar"></i> Analisis Arus Kas Bulanan</h3>
                <div style="position: relative; height: 300px; width: 100%;">
                  <canvas id="financeChart"></canvas>
                </div>
             </div>
          </div>
        </div>

        <!-- Tabel Detail dengan Sistem Tab -->
        <div class="admin-tabs mt-4" style="margin-bottom: 0;">
          <button class="admin-tab active fin-tab" data-tab="income" onclick="Financial.switchTab('income')"><i class="fas fa-arrow-down"></i> Pemasukan</button>
          <button class="admin-tab fin-tab" data-tab="expense" onclick="Financial.switchTab('expense')"><i class="fas fa-arrow-up"></i> Pengeluaran</button>
        </div>

        <div id="pane-income" class="fin-pane">
          <div class="data-table">
            <table>
              <thead><tr><th>ID Transaksi</th><th>Slot</th><th>Durasi</th><th>Nominal</th><th>Tanggal</th></tr></thead>
              <tbody>${incomeRows}</tbody>
            </table>
          </div>
        </div>
        
        <div id="pane-expense" class="fin-pane hidden">
          <div class="data-table">
            <table>
              <thead><tr><th>ID Cicilan</th><th>Tanggal Bayar</th><th>Nominal</th></tr></thead>
              <tbody>${expenseRows}</tbody>
            </table>
          </div>
        </div>
      `;

      // Render the chart
      renderChart(fin.pemasukan?.detail || [], fin.pengeluaran?.detail || []);

    } catch (err) {
      console.error(err);
      resultsEl.innerHTML = `<div class="empty-state"><i class="fas fa-wifi"></i><h3>Gagal terhubung ke server</h3></div>`;
    }
  }

  function renderChart(dataIncome, dataExpense) {
    const ctx = document.getElementById('financeChart');
    if (!ctx) return;

    if (_financeChart) {
      _financeChart.destroy();
    }

    // Mengelompokkan data per bulan ("YYYY-MM")
    const monthlyData = {};

    dataIncome.forEach(item => {
      if (!item.tanggal) return;
      const d = new Date(item.tanggal);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { inc: 0, exp: 0 };
      monthlyData[key].inc += Number(item.total_bayar || 0);
    });

    dataExpense.forEach(item => {
      if (!item.tanggal) return;
      const d = new Date(item.tanggal);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!monthlyData[key]) monthlyData[key] = { inc: 0, exp: 0 };
      monthlyData[key].exp += Number(item.nominal || 0);
    });

    const labels = Object.keys(monthlyData).sort();
    
    // Jika tidak ada data pada rentang ini
    if (labels.length === 0) {
      const chartContainer = ctx.parentElement;
      chartContainer.innerHTML = `<div class="empty-state" style="padding: 3rem 0;"><i class="fas fa-chart-pie" style="color:var(--border);"></i><p style="margin-top:0.5rem;font-size:0.9rem;">Tidak ada data grafik untuk ditampilkan.</p></div>`;
      return;
    }

    const arrInc = labels.map(k => monthlyData[k].inc);
    const arrExp = labels.map(k => monthlyData[k].exp);
    const displayLabels = labels.map(k => {
      const [y, m] = k.split('-');
      const date = new Date(y, m - 1, 1);
      return date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
    });

    _financeChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: displayLabels,
        datasets: [
          {
            label: 'Pemasukan',
            data: arrInc,
            backgroundColor: 'rgba(16, 185, 129, 0.85)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6
          },
          {
            label: 'Pengeluaran',
            data: arrExp,
            backgroundColor: 'rgba(239, 68, 68, 0.85)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 6,
            barPercentage: 0.6
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
          mode: 'index',
          intersect: false,
        },
        plugins: {
          legend: { 
            position: 'top',
            labels: { usePointStyle: true, boxWidth: 8, font: { family: 'Inter', size: 12 } }
          },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.9)',
            titleFont: { family: 'Inter', size: 13 },
            bodyFont: { family: 'Inter', size: 13 },
            padding: 12,
            callbacks: {
              label: function(context) {
                let label = context.dataset.label || '';
                if (label) { label += ': '; }
                if (context.parsed.y !== null) {
                  label += Utils.formatCurrency(context.parsed.y);
                }
                return label;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false }
          },
          y: {
            beginAtZero: true,
            grid: { borderDash: [4, 4] },
            ticks: {
              callback: function(value) {
                if (value === 0) return 0;
                // Format angka disingkat, contoh 1.000.000 -> 1M, 1.000 -> 1K
                if (value >= 1000000) return 'Rp ' + (value / 1000000) + 'jt';
                if (value >= 1000) return 'Rp ' + (value / 1000) + 'k';
                return 'Rp ' + value;
              }
            }
          }
        }
      }
    });
  }

  function switchTab(tabId) {
    document.querySelectorAll('.fin-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.fin-pane').forEach(el => el.classList.add('hidden'));
    
    document.querySelector(`.fin-tab[data-tab="${tabId}"]`).classList.add('active');
    document.getElementById(`pane-${tabId}`).classList.remove('hidden');
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

    // Summary Box
    doc.setDrawColor(200);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(14, 50, 182, 38, 3, 3, 'FD');

    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Ringkasan Arus Kas', 18, 58);
    doc.setFont(undefined, 'normal');
    doc.setFontSize(10);
    doc.text(`Total Pemasukan   : ${Utils.formatCurrency(fin.pemasukan?.total || 0)}`, 18, 66);
    doc.text(`Total Pengeluaran : ${Utils.formatCurrency(fin.pengeluaran?.total || 0)}`, 18, 73);
    doc.text(`Saldo Berjalan    : ${Utils.formatCurrency(fin.saldo || 0)}`, 18, 80);

    if (inv) {
      doc.text(`Investor Terbayar : ${Utils.formatCurrency(inv.total_dibayar || 0)} dari Target ${Utils.formatCurrency(inv.target || 0)} (${inv.progress_percent || 0}%)`, 18, 87);
    }

    // Income Table
    let startY = 100;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Rincian Pemasukan', 14, startY);

    const incomeData = (fin.pemasukan?.detail || []).map(r => [
      r.trx_id, r.spot_id, `${r.bulan_sewa} bln`,
      Utils.formatCurrency(r.total_bayar), r.tanggal || '-'
    ]);

    doc.autoTable({
      startY: startY + 4,
      head: [['ID Transaksi', 'Slot', 'Durasi', 'Nominal', 'Tanggal']],
      body: incomeData.length ? incomeData : [['Tidak ada data', '', '', '', '']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [16, 185, 129] } // Success color
    });

    // Expense Table
    const expStartY = doc.lastAutoTable.finalY + 12;
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text('Rincian Pengeluaran (Cicilan Investor)', 14, expStartY);

    const expenseData = (fin.pengeluaran?.detail || []).map(r => [
      r.return_id, r.tanggal || '-', Utils.formatCurrency(r.nominal)
    ]);

    doc.autoTable({
      startY: expStartY + 4,
      head: [['ID Cicilan', 'Tanggal Bayar', 'Nominal']],
      body: expenseData.length ? expenseData : [['Tidak ada data', '', '']],
      styles: { fontSize: 9 },
      headStyles: { fillColor: [239, 68, 68] } // Danger color
    });

    doc.save(`Laporan_Keuangan_Pradha_${_lastReport.startMonth}_${_lastReport.endMonth}.pdf`);
    Utils.showToast('PDF berhasil diunduh!', 'success');
  }

  return { render, load, exportPDF, switchTab };
})();
