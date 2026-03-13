# Perbaikan Tepat untuk Backend Anda: file masuk Drive tapi Sheet berisi `UPLOAD_FAILED`

Berdasarkan kode backend yang Anda kirim, akar masalah paling besar ada di helper ini:

```javascript
function _uploadToDrive(base64Data, filename) {
  try {
    ...
    return file.getUrl();
  } catch (err) {
    Logger.log('Upload error: ' + err.message);
    return 'UPLOAD_FAILED';
  }
}
```

Karena fungsi ini **mengembalikan string** (`file.getUrl()` atau `'UPLOAD_FAILED'`), maka saat ada error kecil setelah file sempat dibuat, nilai fallback jadi `'UPLOAD_FAILED'` dan ikut ditulis ke kolom `bukti_transfer_url`.

---

## 1) Ganti `_uploadToDrive` dengan versi yang lebih aman

> Versi ini:
> - support base64 normal + websafe,
> - tidak split string base64 secara berlebihan,
> - kembalikan object detail `{ ok, url, fileId, error }` agar mudah debug,
> - URL dibuat dari `fileId` agar konsisten.

```javascript
function _uploadToDrive(base64Data, filename, mimeTypeFromPayload) {
  try {
    if (!base64Data) {
      return { ok: false, url: '', fileId: '', error: 'EMPTY_BASE64' };
    }

    let cleanBase64 = String(base64Data).trim();
    let mimeType = mimeTypeFromPayload || 'application/octet-stream';

    // Jika data URI: data:image/png;base64,xxxx
    const commaIndex = cleanBase64.indexOf(',');
    if (commaIndex > -1) {
      const meta = cleanBase64.substring(0, commaIndex);
      const mimeMatch = meta.match(/data:(.*?);base64/i);
      if (mimeMatch && mimeMatch[1]) mimeType = mimeMatch[1];
      cleanBase64 = cleanBase64.substring(commaIndex + 1).trim();
    }

    if (!cleanBase64) {
      return { ok: false, url: '', fileId: '', error: 'EMPTY_BASE64_AFTER_PARSE' };
    }

    let bytes;
    try {
      bytes = Utilities.base64Decode(cleanBase64);
    } catch (_) {
      bytes = Utilities.base64DecodeWebSafe(cleanBase64);
    }

    const safeName = filename || ('upload-' + Date.now());
    const blob = Utilities.newBlob(bytes, mimeType, safeName);

    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);

    // Optional: publikkan jika memang dibutuhkan frontend
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

    const fileId = file.getId();
    const url = `https://drive.google.com/file/d/${fileId}/view`;

    return { ok: true, url, fileId, error: '' };
  } catch (err) {
    Logger.log('[UPLOAD] error: ' + err.message);
    return { ok: false, url: '', fileId: '', error: err.message };
  }
}
```

---

## 2) Patch `createBooking(payload)` (yang paling penting)

Di fungsi Anda sekarang:

```javascript
const buktiUrl = _uploadToDrive(bukti_transfer_base64, bukti_filename || 'bukti_transfer.jpg');
```

ganti jadi:

```javascript
const upload = _uploadToDrive(
  bukti_transfer_base64,
  bukti_filename || 'bukti_transfer.jpg',
  payload.bukti_mime_type
);

if (!upload.ok) {
  return {
    success: false,
    message: 'Upload bukti transfer gagal: ' + (upload.error || 'UNKNOWN_ERROR')
  };
}

const buktiUrl = upload.url;
```

Lalu saat `appendRow(...)`, isi kolom `bukti_transfer_url` dengan `buktiUrl` seperti biasa.

> Dengan cara ini, transaksi tidak akan lanjut tersimpan sebagai `'UPLOAD_FAILED'`. Kalau upload gagal, API langsung mengembalikan error jelas.

---

## 3) Patch `extendBooking(payload)`

Ubah bagian ini:

```javascript
const buktiUrl = _uploadToDrive(bukti_transfer_base64, bukti_filename || 'bukti_perpanjangan.jpg');
```

menjadi:

```javascript
const upload = _uploadToDrive(
  bukti_transfer_base64,
  bukti_filename || 'bukti_perpanjangan.jpg',
  payload.bukti_mime_type
);

if (!upload.ok) {
  return {
    success: false,
    message: 'Upload bukti perpanjangan gagal: ' + (upload.error || 'UNKNOWN_ERROR')
  };
}

const buktiUrl = upload.url;
```

---

## 4) Patch `addInvestorReturn(payload)`

Ubah:

```javascript
const buktiUrl = _uploadToDrive(bukti_transfer_base64, bukti_filename || 'bukti_investor.jpg');
```

menjadi:

```javascript
const upload = _uploadToDrive(
  bukti_transfer_base64,
  bukti_filename || 'bukti_investor.jpg',
  payload.bukti_mime_type
);

if (!upload.ok) {
  return {
    success: false,
    message: 'Upload bukti investor gagal: ' + (upload.error || 'UNKNOWN_ERROR')
  };
}

const buktiUrl = upload.url;
```

---

## 5) Tambah debug log (sementara) di `createBooking`

Sebelum panggil `_uploadToDrive`, tambahkan:

```javascript
Logger.log(JSON.stringify({
  tag: 'CREATE_BOOKING_UPLOAD',
  hasBase64: !!bukti_transfer_base64,
  base64Length: (bukti_transfer_base64 || '').length,
  filename: bukti_filename,
  mimeFromPayload: payload.bukti_mime_type || ''
}));
```

Dan sesudah upload:

```javascript
Logger.log(JSON.stringify({
  tag: 'CREATE_BOOKING_UPLOAD_RESULT',
  ok: upload.ok,
  fileId: upload.fileId,
  url: upload.url,
  error: upload.error
}));
```

Cek hasilnya di **Apps Script → Executions**.

---

## 6) Kenapa kasus Anda bisa terjadi sekarang?

Pada arsitektur sekarang, nilai hasil upload langsung dipakai sebagai string URL:

- sukses: `file.getUrl()`
- gagal: `'UPLOAD_FAILED'`

Karena tidak ada validasi `ok/error` yang eksplisit, string `'UPLOAD_FAILED'` ikut tersimpan ke kolom transaksi seolah itu URL biasa.

---

## 7) Checklist deploy

1. Simpan perubahan script.
2. **Deploy ulang Web App** (Edit deployment → Deploy).
3. Tes upload 1 file dari frontend.
4. Pastikan kolom `bukti_transfer_url` berisi `https://drive.google.com/file/d/.../view`.
5. Jika gagal, ambil pesan `upload.error` dari response API dan lihat log Executions.

---

## Catatan untuk frontend Anda

Frontend Anda (`js/booking.js` dan `js/dashboard.js`) sudah mengirim:

- `bukti_transfer_base64`
- `bukti_filename`
- `bukti_mime_type`

Jadi fokus perbaikan memang benar di backend Apps Script (`_uploadToDrive` + validasi hasil upload di function bisnis).
