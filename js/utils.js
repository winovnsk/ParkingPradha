/**
 * Utils Module — Helpers & Utilities
 */
const Utils = (() => {

  function formatCurrency(num) {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency', currency: 'IDR',
      minimumFractionDigits: 0, maximumFractionDigits: 0
    }).format(num);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').substring(0, 2).toUpperCase();
  }

  function renderStars(rating) {
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<i class="fas fa-star ${i <= rating ? '' : 'empty'}"></i>`;
    }
    return html;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const icons = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };

    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
      <i class="${icons[type] || icons.info} toast-icon"></i>
      <span class="toast-message">${message}</span>
      <button class="toast-close" onclick="this.parentElement.remove()"><i class="fas fa-times"></i></button>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      if (toast.parentElement) {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(100%)';
        toast.style.transition = '0.3s ease';
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }

  /**
   * Compress image to Base64 using Canvas
   * Returns Promise<string>
   */
  function compressImage(file, maxWidth = 1024, quality = 0.7) {
    return new Promise((resolve, reject) => {
      if (file.type === 'application/pdf') {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(file);
        return;
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let w = img.width, h = img.height;

          if (w > maxWidth) {
            h = (maxWidth / w) * h;
            w = maxWidth;
          }

          canvas.width = w;
          canvas.height = h;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);

          resolve(canvas.toDataURL('image/jpeg', quality));
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function sanitizeFilename(filename = '') {
    return filename
      .toString()
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .trim();
  }

  /**
   * Siapkan file upload agar konsisten untuk backend Apps Script.
   * - Gambar: coba dikompres, fallback ke file original bila gagal diproses canvas.
   * - PDF: kirim apa adanya sebagai Data URL.
   */
  async function prepareUploadFile(file) {
    if (!file) throw new Error('File tidak ditemukan.');

    const safeFilename = sanitizeFilename(file.name || `upload_${Date.now()}`);
    const isPdf = file.type === 'application/pdf' || safeFilename.toLowerCase().endsWith('.pdf');

    if (isPdf) {
      return {
        filename: safeFilename,
        base64: await readFileAsDataURL(file),
        mimeType: 'application/pdf'
      };
    }

    try {
      return {
        filename: safeFilename,
        base64: await compressImage(file),
        mimeType: 'image/jpeg'
      };
    } catch {
      return {
        filename: safeFilename,
        base64: await readFileAsDataURL(file),
        mimeType: file.type || 'application/octet-stream'
      };
    }
  }

  function setLoading(btn, loading) {
    if (loading) {
      btn.dataset.originalText = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = `<span class="spinner"></span> Memproses...`;
    } else {
      btn.disabled = false;
      btn.innerHTML = btn.dataset.originalText || btn.innerHTML;
    }
  }

  function getMonthOptions() {
    const months = [];
    const now = new Date();
    for (let i = -12; i <= 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      months.push({ value: val, label });
    }
    return months;
  }

  /**
   * Parse nilai diskon dari settings.
   * Mendukung format: "15%", "15", "0.15"
   */
  function parseDiscountValue(discVal, rawTotal = 0) {
    const discStr = discVal?.toString().trim() || '0';
    let discountAmount = 0;
    let discDisplayVal = '0%';

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

  return {
    formatCurrency, formatDate, formatShortDate,
    getInitials, renderStars, showToast,
    compressImage, readFileAsDataURL, sanitizeFilename, prepareUploadFile,
    setLoading, getMonthOptions,
    parseDiscountValue
  };
})();
