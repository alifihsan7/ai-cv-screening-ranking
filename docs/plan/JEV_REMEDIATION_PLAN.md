# Tahap Perbaikan Integrasi Jev (TypeSafe)

Dokumen ini berisi langkah perbaikan integrasi Jev di pipeline CV screening, berdasarkan hasil audit kode pada commit `639df75`. Urutannya disusun dari dampak terbesar. Setiap tahap bisa dikerjakan dan di-commit terpisah.

| # | Tahap | Ukuran | Status |
|---|-------|--------|--------|
| 1 | Sensor teks sebelum dikirim ke Jev | Kecil | Selesai (disempurnakan di Tahap 2) |
| 2 | Perbaiki ekstraksi pengalaman | Sedang | Selesai (Opsi A) |
| 3 | Hubungkan kutipan dengan keputusan Jev | Sedang | Selesai |
| 4 | Cache hasil Jev | Kecil | Belum (dikerjakan terakhir) |
| 5 | Ambang batas confidence | Kecil | Selesai |
| 6 | Bersih-bersih kode | Kecil | Selesai |
| 7 | Pengukuran (Jev vs LLM) | Sedang | Belum |

Urutan pengerjaan: 1 → 5 → 2 → 3 → 6 → 7 → 4. Cache dikerjakan paling akhir supaya yang dibekukan adalah jawaban dari pipeline yang sudah diperbaiki dan diukur.

---

## Tahap 1 — Sensor teks sebelum dikirim ke Jev

**Masalah.** [processor.py:376](../../src/worker/processor.py#L376) mengirim teks CV asli (`cv_core_text` atau `san.extracted_text`) ke API Jev. Padahal versi yang sudah disensor sudah dibuat lebih awal, di baris 294. Akibatnya:

- Nama, email, dan telepon kandidat terkirim ke API eksternal.
- Hasil ekstraksi dari teks asli dipakai untuk menyusun ulang potongan teks `EXPERIENCE` ([processor.py:422-435](../../src/worker/processor.py#L422-L435)). Potongan itu lalu disimpan ke `profile_chunks` dan dijadikan embedding.

**Perubahan.**

```python
cv_core_text = redact_text(
    raw_profile.get("cv_core_text") or san.extracted_text,
    identity_rec["full_name"],
    [email_val] if email_val else [],
    [phone_val] if phone_val else [],
)
```

- Gunakan `cv_core_text` yang sudah disensor, bukan `full_text_redacted`. Dengan begitu lampiran (ijazah, sertifikat) tetap tidak ikut terkirim.
- Periksa isi `redact_text` di [redaction.py](../../src/worker/redaction.py). Pastikan alamat, tanggal lahir, dan URL profil sosial juga ikut tersensor, bukan hanya nama, email, dan telepon.

**Selesai jika.**
- Ada test yang memastikan payload `state` ke `system_one` tidak memuat nama, email, atau telepon dari fixture.
- Ada test yang memastikan potongan `EXPERIENCE` hasil susun ulang tidak memuat identitas kandidat.

**Catatan setelah Tahap 2.** Pengiriman teks CV ke Jev dihapus sama sekali. Jev sekarang hanya menerima entri pengalaman yang sudah disensor, dan penyusunan ulang potongan `EXPERIENCE` juga dihapus. Parameter `links` di `redact_text` tetap dipakai untuk `full_text_redacted`.

---

## Tahap 2 — Perbaiki ekstraksi pengalaman

**Masalah.** [experience_extractor.py:285-375](../../src/domain/experience_extractor.py#L285-L375) hanya mengajukan satu pertanyaan Choice (`EXTRACTED` / `NO_EXPERIENCE`) ke Jev. Jawaban Choice tidak membawa daftar pengalaman, jadi kode selalu jatuh ke `parse_experiences()` (regex). Akibatnya:

- Ekstraksi sebenarnya dikerjakan regex, bukan Jev.
- Jawaban `NO_EXPERIENCE`, dengan confidence berapa pun, menghapus seluruh riwayat kerja.
- Client di baris 278 dibuat tanpa `async with`, jadi koneksinya tidak pernah ditutup.

**Keputusan: Opsi A.** Regex mengekstrak entri, lalu Jev memvalidasi tiap entri. Opsi B, yaitu menghapus Jev dari extractor, tidak dipilih.

**Yang dikerjakan.**
1. Pertanyaan Choice `EXTRACTED` / `NO_EXPERIENCE` untuk seluruh CV dihapus.
2. **Berbeda dari rencana awal:** processor tidak lagi mem-parsing ulang teks CV. Jev langsung memvalidasi `matching_profile["experiences"]` dari adapter, yang sudah di-parse per bagian dan sudah disensor. Alasannya:
   - parsing ulang teks penuh berhenti di judul bagian pertama, misalnya "PENDIDIKAN", sehingga CV yang mencantumkan pendidikan lebih dulu kehilangan semua pengalaman;
   - yang keluar ke Jev hanya entri pengalaman, bukan seluruh CV;
   - profil dengan Jev sama dengan profil tanpa Jev, hanya ditambah anotasi.
3. Fungsi baru `validate_work_experiences_jev` di [experience_extractor.py](../../src/domain/experience_extractor.py) memvalidasi semua entri dalam satu panggilan `system_one`, dengan satu pertanyaan Noul per entri (`exp_0`, `exp_1`, …). Data entri dikirim di `state`, bukan di instruksi.
4. Setiap entri mendapat `jev_validity` (probabilitas "ya" dari Noul). Entri diberi flag `JEV_NOT_WORK_EXPERIENCE` hanya jika Jev **yakin** jawabannya "tidak": `1 − validity ≥ VERIFIER_MIN_CONFIDENCE`, yaitu validity ≤ 0.40 pada nilai default. Jawaban ragu (sekitar 0.5) tidak mengubah apa pun. **Entri tidak pernah dihapus.**
5. Di [kind_rules.py](../../src/domain/kind_rules.py), `split_jev_rejected_experiences` mengecualikan entri yang punya flag tersebut dari hitungan durasi, di jalur async maupun sync, dan menambahkan flag `JEV_EXCLUDED_NON_WORK_ENTRY` ke hasil kriteria supaya terlihat oleh recruiter.
6. Satu baris `jev_calls` per entri (`criterion_id="EXPERIENCE_VALIDATION"`, `primitive_type="NOUL"`). Pemakaian token dari satu panggilan gabungan hanya dicatat di baris pertama supaya tidak terhitung ganda.
7. Client yang dibuat sendiri dibuka dengan `async with`.
8. `extract_work_experiences_jev(text, …)` tetap ada sebagai pembungkus (regex, lalu validasi), dan `as_of` diteruskan apa adanya tanpa default `date.today()`.
9. Pesan gagal di processor diubah menjadi "Validasi pengalaman kerja via Jev gagal dieksekusi…". Flag `FAILED_JEV_EXTRACTION` dipertahankan.
10. Perbaikan kecil yang ikut masuk: `TypeSafeAPITimeoutError` sekarang menerima nilai timeout sesuai tipe SDK, bukan teks.

**Test** (dijalankan terhadap `cv_screening_test` lokal; seluruh suite: 302 passed, 2 skipped):
- Jev menolak satu dari tiga entri. Ketiganya tetap ada, hanya yang ditolak mendapat flag, dan jawaban ragu tidak mengubah apa pun.
- Durasi tidak menghitung entri yang ditolak, dan flag `JEV_EXCLUDED_NON_WORK_ENTRY` muncul.
- Daftar entri kosong: Jev tidak dipanggil.
- Jawaban Jev untuk salah satu entri hilang: langsung gagal.
- Processor: entri tersimpan dengan anotasi, dan `state` yang dikirim ke Jev tidak memuat nama, email, atau telepon walaupun ada di bullet.
- API Jev gagal atau belum dikonfigurasi: dokumen menjadi `NEEDS_REVIEW`.

---

## Tahap 3 — Hubungkan kutipan dengan keputusan Jev

**Masalah.**
- [verifier.py:762-766](../../src/domain/verifier.py#L762-L766) mengirim seluruh `cv_text`, jadi Jev menilai berdasarkan keseluruhan CV.
- Di [verifier.py:1010](../../src/domain/verifier.py#L1010), kutipan dipilih terpisah berdasarkan kepadatan kata kunci.

Akibatnya, kutipan yang ditampilkan ke recruiter belum tentu menjadi dasar keputusan Jev.

**Yang dikerjakan** ([verifier.py](../../src/domain/verifier.py), `JevTypeSafeVerifierProvider`):
1. `cv_text` dihapus dari `state`. Yang dikirim hanya kriteria, nama bagian CV asal potongan (`evidence_section`, misalnya `WORK_EXPERIENCE`), dan potongan bukti (`evidence_chunks`).
   - Nama bagian ditambahkan karena tanpa teks CV lengkap, Jev kehilangan konteks bahwa potongan berasal dari pengalaman kerja. Pada uji coba dengan API asli, confidence turun dari ≥ 0.80 ke 0.69 sebelum nama bagian ditambahkan.
2. Setiap potongan dinilai sebagai pertanyaan terpisah dalam satu panggilan `system_one` (`chunk_0`, `chunk_1`, …). Potongan kosong dibuang lebih dulu.
3. Pemilihan potongan penentu: di antara jawaban dengan confidence ≥ `VERIFIER_MIN_CONFIDENCE`, ambil status terkuat, lalu confidence tertinggi, lalu indeks terkecil agar deterministik. Kalau tidak ada yang memenuhi ambang, ambil jawaban dengan confidence tertinggi. Jawaban itu lalu diperlakukan sebagai confidence rendah oleh jalur di Tahap 5.
4. Kutipan diambil dari potongan penentu itu (`_quote_from_chunk`). Kalau tidak ada kata kunci yang cocok, dipakai awal potongan itu sendiri (≤ 119 karakter, dipotong di batas kata), supaya keputusan positif selalu punya kutipan.
5. `verify_grounding` tetap dijalankan sebagai pengaman.
6. Pembangunan pertanyaan dan penafsiran jawaban dipisah ke `_build_question` dan `_interpret_answer`.

**Test tidak lagi memanggil API sungguhan.**
- Ditemukan bahwa `.env` berisi `TYPESAFE_API_KEY` asli, dan beberapa test (verifier di `test_fase2_agent_and_verifier.py`, serta alur agent di `test_fase2…` dan `test_fase3_worker_and_persistence.py`) diam-diam memanggil API TypeSafe asli setiap kali suite dijalankan.
- [conftest.py](../../tests/conftest.py) sekarang mengosongkan `TYPESAFE_API_KEY` saat test berjalan, kecuali `RUN_LIVE_JEV=1`. Jalur Jev yang tidak di-mock akan langsung gagal, bukan memanggil API berbayar.
- Helper `mock_jev_client()` di `conftest.py` menjawab pertanyaan role family dan penilaian potongan.
- Satu test live opsional, `test_jev_typesafe_live_api_strong_decision`, hanya jalan dengan `RUN_LIVE_JEV=1`.

**Test.**
- Dua potongan (webinar dan pengalaman kerja nyata), keduanya cocok dengan kata kunci. Kutipan harus dari potongan yang dinilai STRONG oleh Jev. Dengan cara lama, kutipan yang terambil adalah webinar.
- Payload ke Jev tidak memuat teks CV lengkap dan memuat `evidence_section`.
- Seluruh suite: 303 passed, 3 skipped, tanpa panggilan ke API asli.

---

## Tahap 4 — Cache hasil Jev

**Masalah.** `LLMGatewayVerifierProvider` sudah memakai `llm_cache`, sedangkan Jev belum. Menjalankan ulang input yang sama bisa menghasilkan status yang berbeda, dan setiap run tetap memakan biaya API.

**Risiko.** Cache membekukan jawaban pertama. Kalau jawaban itu salah, kesalahannya ikut tersimpan.

**Perubahan.**
- Gunakan kunci cache `sha256(versi prompt + model + primitive + instruksi + kriteria + isi potongan)` di `JevTypeSafeVerifierProvider.verify`, `classify_role_family_jev`, dan extractor.
- Kunci versi model di config, misalnya `TYPESAFE_MODEL=jev-2026-09`, bukan `jev-latest`.
- Pakai ulang `_get_db_cache` / `_save_db_cache` dengan `task='jev'`.

**Pengaman.**
1. Hanya jawaban dengan confidence ≥ `VERIFIER_MIN_CONFIDENCE` yang lolos grounding yang disimpan.
2. Mengubah prompt atau model otomatis membatalkan cache lama, karena keduanya masuk ke kunci.
3. Parameter `refresh=True` memanggil Jev lagi dan menimpa jawaban lama.
4. Jawaban dari cache diberi flag `JEV_CACHED` dan dicatat di `jev_calls` dengan penanda `cached=true`. Ini perlu migrasi kolom.

**Selesai jika.**
- Ada test yang memanggil verifikasi dua kali dengan input sama. `system_one` hanya terpanggil sekali dan hasilnya identik.
- Ada test di mana jawaban dengan confidence rendah tidak tersimpan, sehingga panggilan berikutnya tetap ke Jev.

---

## Tahap 5 — Ambang batas confidence

**Masalah.** Di [screening_service.py:423-445](../../src/domain/screening_service.py#L423-L445), hasil Jev selalu menggantikan status dari aturan, berapa pun confidence-nya.

**Yang dikerjakan.**
- Setting baru `VERIFIER_MIN_CONFIDENCE` (default `0.60`) di [config.py](../../src/infrastructure/config.py) dan `.env.example`.
- **Jalur non-agent** ([screening_service.py](../../src/domain/screening_service.py)): jika confidence Jev di bawah ambang, status dan bukti dari aturan dipertahankan, `method` tetap `rule`, dan ditambahkan flag `JEV_LOW_CONFIDENCE`. Flag ini tidak ditambahkan pada kasus `GROUNDING_FAIL`, karena kasus itu sudah punya flag sendiri.
- **Klasifikasi role family** ([kind_rules.py](../../src/domain/kind_rules.py)): jika confidence Jev rendah, role family ditentukan oleh `classify_role_family` (aturan), dan ditambahkan flag `JEV_ROLE_FAMILY_LOW_CONFIDENCE` (sekali per kriteria).
- **Jalur agent** ([agent.py](../../src/domain/agent.py)): sebelumnya sudah memakai ambang `0.60` yang ditulis langsung di kode, lalu mencoba ulang dan kembali ke status aturan dengan flag `LOW_CONFIDENCE`. Sekarang memakai setting yang sama, jadi ketiga jalur tidak bisa memakai angka yang berbeda.

**Test.**
- [test_jev_choice_role_family.py](../../tests/test_jev_choice_role_family.py): role family dengan confidence 0.30 kembali ke aturan dan diberi flag. Role family dengan confidence 0.95 tetap dipakai tanpa flag.
- Jalur non-agent di `screening_service.py` belum punya test khusus, karena butuh database tes.

---

## Tahap 6 — Bersih-bersih kode

**Yang dikerjakan** (hampir semuanya di [verifier.py](../../src/domain/verifier.py), yang menyusut dari 1450 ke 1273 baris):
- Pengecekan `unittest.mock.AsyncMock` dihapus dari kode produksi. Kode produksi tidak lagi mengenal mock sama sekali.
- `evaluate_choice` dan monkeypatch `AsyncTypeSafeClient.evaluate_choice` pada class SDK dihapus. `classify_role_family_jev` sekarang memanggil `client.system_one(...)` langsung dan membaca `res.choices["role_family"]`. Test `test_evaluate_choice_method_dispatch_native_method` dihapus karena menguji fitur yang sudah tidak ada.
- `_calibrate_pointwise` (kode mati berlabel "Local Emulation") dihapus.
- Pencocokan label dan konsep sekarang per kata utuh:
  - `normalize_role_family_choice`: "RETAIL", "MAINTAINER", dan "AIRFLOW_ADMIN" tidak lagi terbaca sebagai `DATA_AI`. Label yang tidak dikenal tetap menjadi `NON_TECHNICAL`, tetapi sekarang dicatat sebagai peringatan di log. **Berbeda dari rencana awal:** tidak ada flag di hasil, karena Jev dibatasi pada 7 label standar lewat `criteria` sehingga jalur ini praktis tidak tercapai.
  - `resolve_jev_primitive_params`: "digital" tidak lagi terbaca sebagai `git`. "github" dan "gitlab" ditambahkan secara eksplisit ke daftar alat biner supaya tetap diperlakukan sebagai alat.
- Pembacaan `TYPESAFE_API_KEY` / `BASE_URL` / `MODEL` / `TIMEOUT` yang tadinya diduplikasi di 5 tempat dipusatkan di [typesafe.py](../../src/infrastructure/typesafe.py) (`load_typesafe_config`). Urutan prioritasnya satu: argumen > variabel lingkungan > `settings`. Kunci kosong di lingkungan dianggap sengaja "tidak dikonfigurasi", yang dipakai pengaman test di Tahap 3.

**Test.** Test baru untuk kecocokan per kata (label dan konsep) dan untuk helper konfigurasi ([test_typesafe_config.py](../../tests/test_typesafe_config.py)). Seluruh suite: 307 passed, 3 skipped.

---

## Tahap 7 — Pengukuran

1. Pastikan seluruh test berjalan. `TEST_DATABASE_URL` sudah ada di `.env` tetapi tidak dimuat otomatis oleh `conftest.py`, jadi perlu diekspor dulu: `export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)" && pytest -q`.
2. Jalankan `python docs/spec/golden_dataset/evaluate.py` dalam tiga mode: `rules`, `llm_gateway`, dan `jev_typesafe`.
3. Bandingkan akurasi status per kriteria, false positive rate, latensi p50/p95, dan biaya token. Data latensi dan token diambil dari `jev_calls`.
4. Jalankan tiap mode dua kali untuk memastikan hasilnya identik.
5. Tulis hasilnya ke [BENCHMARK_JEV_VS_LLM.md](../eval/BENCHMARK_JEV_VS_LLM.md).

Tahap ini sebaiknya dijalankan setelah Tahap 1–5 selesai, karena sebelum itu angka perbandingannya belum mencerminkan perilaku akhir.
