# ParkingPradha

## Catatan Integrasi Upload Bukti ke Google Drive + Google Sheets

Frontend sekarang mengirim metadata tambahan setiap kali upload bukti transfer:

- `uploader_name` → nama user/admin yang upload.
- `uploader_role` → peran uploader (`User` / `Admin`).
- `upload_timestamp` → waktu upload format ISO (`new Date().toISOString()`).
- `upload_source` → sumber upload (`booking`, `extend`, `investor_return`).
- `bukti_filename` → nama file yang diunggah.

### Yang perlu dipastikan di Google Apps Script

Di handler backend (`doPost`), setelah file berhasil dibuat di folder Drive (misalnya dengan `DRIVE_FOLDER_ID = '13bXPdfhUCsycid_svPfg2IQ-hpgp67Do'`), simpan URL file + metadata ke sheet log bukti.

Contoh alur (pseudo-code):

```javascript
function saveUploadLog_(payload, driveFile) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sh = ss.getSheetByName('LOG_UPLOAD_BUKTI');

  // Pastikan header ada sekali saja
  if (sh.getLastRow() === 0) {
    sh.appendRow([
      'timestamp_upload',
      'tanggal_upload',
      'uploader_name',
      'uploader_role',
      'upload_source',
      'nama_file',
      'file_url',
      'file_id'
    ]);
  }

  const uploadedAt = payload.upload_timestamp
    ? new Date(payload.upload_timestamp)
    : new Date();

  sh.appendRow([
    uploadedAt,
    Utilities.formatDate(uploadedAt, Session.getScriptTimeZone(), 'yyyy-MM-dd'),
    payload.uploader_name || '',
    payload.uploader_role || '',
    payload.upload_source || '',
    payload.bukti_filename || driveFile.getName(),
    driveFile.getUrl(),
    driveFile.getId()
  ]);
}
```

Panggil fungsi di atas **hanya setelah** upload Drive sukses. Dengan begitu, URL di Sheets selalu sinkron dengan file yang benar-benar terunggah.
