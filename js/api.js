/**
 * API Module — Semua komunikasi ke Google Apps Script
 */
const API = (() => {
  // ⚠️ GANTI URL INI dengan URL deploy Google Apps Script Anda
  const BASE_URL = 'https://script.google.com/macros/s/AKfycbxGTniq1Jq8sQM_eAaayjHpwtvmhV6MVpQbVT6Piv2vPF5DLB0IFfrgP42uQIO3dzT_/exec';

  async function get(action, params = {}) {
    const url = new URL(BASE_URL);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== null) url.searchParams.set(k, v);
    });

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.error(`API GET [${action}] Error:`, err);
      throw err;
    }
  }

  async function post(action, data = {}) {
    try {
      const res = await fetch(BASE_URL, {
        method: 'POST',
        // Gunakan text/plain agar request tetap "simple request"
        // (menghindari preflight CORS yang sering gagal pada Google Apps Script)
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, ...data })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const text = await res.text();
      try {
        return JSON.parse(text);
      } catch {
        throw new Error('Respons server bukan JSON yang valid.');
      }
    } catch (err) {
      console.error(`API POST [${action}] Error:`, err);
      throw err;
    }
  }

  return {
    // Auth
    login: (identifier, password) => post('login', { identifier, password }),
    register: (data) => post('register', data),

    // Public
    getAvailability: () => get('getAvailability'),
    getSettings: () => get('getSettings'),
    getAdminContacts: () => get('getAdminContacts'),
    getReviews: () => get('getReviews'),
    getParkingSpots: (type) => get('getParkingSpots', { type }),
    getFinancialReport: (startMonth, endMonth) => get('getFinancialReport', { startMonth, endMonth }),

    // User
    getUserDashboard: (userId) => get('getUserDashboard', { user_id: userId }),
    getTransactionHistory: (userId) => get('getTransactionHistory', { user_id: userId }),

    // Booking
    createBooking: (data) => post('createBooking', data),
    extendBooking: (data) => post('extendBooking', data),

    // Reviews
    addReview: (data) => post('addReview', data),

    // Admin
    getPendingTransactions: () => get('getPendingTransactions'),
    getAllUsers: () => get('getAllUsers'),
    getInvestorReturns: () => get('getInvestorReturns'),
    verifyTransaction: (trxId) => post('verifyTransaction', { trx_id: trxId }),
    rejectTransaction: (trxId) => post('rejectTransaction', { trx_id: trxId }),
    addInvestorReturn: (data) => post('addInvestorReturn', data),
    updateSetting: (data) => post('updateSetting', data),
    resetPassword: (userId, newPassword) => post('resetPassword', { user_id: userId, new_password: newPassword }),
    updateAdminContact: (data) => post('updateAdminContact', data),
  };
})();
