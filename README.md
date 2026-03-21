# Pradha Ciganitri Parking System

Website untuk **booking parkir bulanan** warga Komplek Pradha Ciganitri dengan alur digital dari registrasi, pengajuan sewa, upload bukti transfer, sampai verifikasi admin.

---

## 1) Ringkasan Aplikasi

Aplikasi ini terdiri dari 2 bagian:
- **Frontend Website (HTML/CSS/JS murni)** di repo ini.
- **Backend Google Apps Script + Google Spreadsheet + Google Drive** sebagai API, database, dan penyimpanan bukti transfer.

Website dipakai oleh:
- **Warga/User**: daftar, login, booking slot, lihat dashboard sewa, ajukan perpanjangan.
- **Admin**: verifikasi transaksi, kelola pengguna, atur setting, input cicilan investor.
- **Publik**: lihat ketersediaan slot, ringkasan keuangan, ulasan.

---

## 2) Fitur Utama

### A. Fitur Publik (tanpa login)
- Halaman beranda dengan informasi fasilitas parkir dan paket harga (Premium & Regular).
- Lihat **ketersediaan slot parkir** secara realtime.
- Lihat **transparansi keuangan** (pemasukan, pengeluaran investor, saldo).
- Export laporan keuangan ke **PDF**.
- Lihat dan kirim **ulasan pengguna**.
- Kontak admin/CS via WhatsApp.

### B. Fitur User (wajib login)
- Registrasi akun warga (nama, no HP, blok rumah, data kendaraan).
- Login dengan nama/no HP + password.
- Wizard booking 5 langkah:
  1. Pilih lahan (maks. 4 slot per transaksi)
  2. Pilih durasi (1/3/6/12 bulan)
  3. Lihat tagihan + diskon
  4. Upload bukti transfer
  5. Submit booking
- Dashboard user:
  - Lihat sewa aktif + sisa hari
  - Riwayat transaksi
  - Ajukan perpanjangan sewa (upload bukti transfer)

### C. Fitur Admin
- Verifikasi / tolak transaksi **pending**.
- Kelola data user + reset password.
- Kelola pengembalian dana investor (progress + input cicilan baru).
- Kelola setting aplikasi (rekening bank, diskon, harga, target investasi, kontak).

### D. Fitur Keamanan & UX
- Auto logout ketika idle 2 menit.
- Session di `localStorage` untuk user login.
- Upload file bukti transfer mendukung gambar/PDF (dengan batas ukuran).

---

## 3) Struktur Project

```bash
ParkingPradha/
├── index.html              # Halaman utama (single-page sections)
├── css/style.css           # Styling aplikasi
├── js/
│   ├── api.js              # Semua request ke Apps Script
│   ├── app.js              # Inisialisasi app, navigasi, halaman publik
│   ├── auth.js             # Login, register, logout
│   ├── booking.js          # Wizard booking
│   ├── dashboard.js        # Dashboard user + perpanjangan
│   ├── admin.js            # Dashboard dan tools admin
│   ├── financial.js        # Halaman keuangan + export PDF
│   ├── auto-logout.js      # Auto logout saat idle
│   └── utils.js            # Helper (toast, format, kompres file, dll)
└── Code.gs.txt             # Contoh backend Google Apps Script
```

---

## 4) Cara Menjalankan (Operasional Harian)

### Opsi 1 — Jalankan Lokal untuk Testing UI
Karena ini static website, bisa dijalankan dengan server lokal sederhana.

Contoh (pilih salah satu):

```bash
# Python 3
python3 -m http.server 8080

# Node (jika ada)
npx serve .
```

Lalu buka browser:
- `http://localhost:8080`

> Catatan: fitur data hanya berfungsi jika `BASE_URL` API sudah valid ke Google Apps Script.

### Opsi 2 — Deploy ke Hosting Static
Bisa diunggah ke hosting static apa pun (Netlify, Vercel, GitHub Pages, cPanel, dll).

Langkah umum:
1. Upload semua file repo.
2. Pastikan path file tetap sama (`css/`, `js/`).
3. Pastikan endpoint API di `js/api.js` sudah benar.
4. Uji login, booking, dan verifikasi admin.

---

## 5) Setup Backend (Google Apps Script) Singkat

1. Buka [Google Apps Script](https://script.google.com).
2. Buat project baru, salin isi `Code.gs.txt` ke file `Code.gs`.
3. Sesuaikan:
   - `SPREADSHEET_ID`
   - `DRIVE_FOLDER_ID`
4. Jalankan fungsi inisialisasi awal (dari editor Apps Script):
   - `initializeSheets()`
   - `seedDummyData()` *(opsional, untuk data awal/testing)*
5. Deploy sebagai **Web App**:
   - Execute as: Me
   - Who has access: Anyone
6. Salin URL Web App, lalu tempel ke `BASE_URL` di `js/api.js`.

---

## 6) Alur Operasional yang Disarankan

### Untuk User/Warga
1. Registrasi akun.
2. Login.
3. Booking slot + upload bukti transfer.
4. Tunggu verifikasi admin.
5. Jika status aktif, pantau sisa masa sewa di dashboard.
6. Ajukan perpanjangan sebelum jatuh tempo.

### Untuk Admin
1. Login sebagai admin.
2. Cek tab transaksi pending setiap hari.
3. Verifikasi bukti transfer (approve/reject).
4. Update pengaturan bila ada perubahan harga/diskon/rekening.
5. Catat cicilan investor secara berkala.
6. Monitor halaman keuangan untuk transparansi.

---

## 7) Hal-Hal yang Harus Diperhatikan (Penting)

### A. Keamanan
- **Jangan simpan password admin default** pada environment produksi.
- Data password pada skema saat ini masih sederhana; disarankan hash password di backend.
- Jangan expose ID sensitif (Spreadsheet/Drive) ke publik di dokumentasi eksternal.
- Batasi akses edit ke Google Sheet hanya untuk admin tepercaya.

### B. Data & Konsistensi
- Pastikan format kolom Sheet tidak diubah sembarangan (karena dipakai API by header).
- Hindari edit manual status transaksi tanpa prosedur (bisa bikin status slot tidak sinkron).
- Lakukan backup rutin Google Sheet.

### C. Upload Bukti Transfer
- Batas file perlu diawasi (frontend membatasi, tapi backend tetap harus validasi).
- Jika bukti transfer gagal upload, admin perlu SOP tindak lanjut (minta kirim ulang via WA).

### D. Konfigurasi Bisnis
- Pastikan nilai diskon `DISKON_1/3/6/12` konsisten formatnya (contoh: `10%`, `10`, atau `0.1`).
- Jika ubah harga Premium/Regular, pastikan data spot dan setting harga sesuai.

### E. Operasional Harian
- Cek transaksi pending minimal 1–2 kali sehari.
- Pantau sewa yang hampir habis agar user diingatkan perpanjangan.
- Pantau progres pembayaran investor agar sesuai target.

### F. Browser & UX
- Gunakan browser modern (Chrome/Edge/Firefox terbaru).
- Untuk admin, disarankan desktop/laptop agar tabel data lebih nyaman.

---

## 8) Akun Dummy (jika pakai seed data)

Silakan lihat `seedDummyData()` di `Code.gs.txt` untuk akun admin dan user contoh. **Sangat disarankan mengganti password setelah implementasi.**

---

## 9) Troubleshooting Cepat

- **Website tampil, tapi data kosong**
  - Cek `BASE_URL` di `js/api.js`.
  - Pastikan Apps Script sudah deploy sebagai Web App dan bisa diakses.

- **Gagal login/register**
  - Cek response API di browser DevTools (Network/Console).
  - Pastikan sheet `USERS` ada dan header benar.

- **Upload bukti gagal**
  - Cek ukuran file (maksimal).
  - Cek `DRIVE_FOLDER_ID` dan permission folder Google Drive.

- **Laporan keuangan tidak keluar**
  - Cek sheet `TRANSACTIONS` dan `INVESTOR_RETURNS` apakah ada data.

---

## 10) Rekomendasi Pengembangan Lanjutan

- Implement hash password (bcrypt/argon2 via service layer).
- Tambahkan role & audit log (siapa verifikasi transaksi, kapan).
- Tambahkan notifikasi WA otomatis untuk status booking/perpanjangan.
- Tambahkan pagination/filter advanced di admin table.
- Tambahkan reminder H-7 dan H-3 masa sewa berakhir.

---

## 11) Lisensi & Kepemilikan

Tambahkan informasi lisensi proyek dan PIC teknis di bagian ini sesuai kebutuhan tim.
