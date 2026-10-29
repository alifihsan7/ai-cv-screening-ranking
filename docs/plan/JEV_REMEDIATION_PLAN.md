# Tahap Perbaikan Integrasi Jev (TypeSafe)

Dokumen ini berisi langkah perbaikan integrasi Jev di pipeline CV screening, berdasarkan hasil audit kode pada commit `639df75`. Urutannya disusun dari dampak terbesar. Setiap tahap bisa dikerjakan dan di-commit terpisah.

| # | Tahap | Ukuran | Status |
|---|-------|--------|--------|
| 1 | Sensor teks sebelum dikirim ke Jev | Kecil | Selesai (disempurnakan di Tahap 2) |
| 2 | Perbaiki ekstraksi pengalaman | Sedang | Selesai (Opsi A) |
| 3 | Hubungkan kutipan dengan keputusan Jev | Sedang | Belum |
| 4 | Cache hasil Jev | Kecil | Belum (dikerjakan terakhir) |
| 5 | Ambang batas confidence | Kecil | Selesai |
| 6 | Bersih-bersih kode | Kecil | Belum |
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

**Perubahan.**
1. Hapus `cv_text` dari `state`, lalu kirim `candidate_chunks` saja.
2. Nilai tiap potongan sebagai pertanyaan terpisah dalam satu panggilan `system_one` (`questions={"chunk_0": ..., "chunk_1": ...}`).
3. Status akhir diambil dari potongan dengan nilai tertinggi. Kutipan diekstrak dari potongan yang sama itu.
4. `verify_grounding` tetap dijalankan sebagai pengaman.

**Selesai jika.**
- Ada test dengan dua potongan: satu relevan, satu tidak. Kutipan yang dihasilkan harus berasal dari potongan yang dinilai tinggi oleh Jev.

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

- Hapus pengecekan `unittest.mock.AsyncMock` dari kode produksi ([verifier.py:198](../../src/domain/verifier.py#L198), [verifier.py:323](../../src/domain/verifier.py#L323)). Test cukup me-mock `system_one`.
- Hapus monkeypatch `AsyncTypeSafeClient.evaluate_choice` ([verifier.py:239-258](../../src/domain/verifier.py#L239-L258)).
- Hapus `_calibrate_pointwise` yang tidak terpakai ([verifier.py:719](../../src/domain/verifier.py#L719)).
- Perbaiki pencocokan substring:
  - `normalize_role_family_choice`: `"AI"` cocok dengan "RETAIL". Ganti dengan pencocokan per token. Jika label tidak dikenal, beri flag, jangan langsung jadi `NON_TECHNICAL`.
  - `resolve_jev_primitive_params`: `"git"` cocok dengan "digital". Ganti dengan pencocokan kata utuh.
- Satukan pembacaan `TYPESAFE_API_KEY` / `BASE_URL` / `MODEL`, yang sekarang diduplikasi di 5 tempat, ke satu helper.

---

## Tahap 7 — Pengukuran

1. Pastikan seluruh test berjalan. `TEST_DATABASE_URL` sudah ada di `.env` tetapi tidak dimuat otomatis oleh `conftest.py`, jadi perlu diekspor dulu: `export TEST_DATABASE_URL="$(grep '^TEST_DATABASE_URL=' .env | cut -d= -f2-)" && pytest -q`.
2. Jalankan `python docs/spec/golden_dataset/evaluate.py` dalam tiga mode: `rules`, `llm_gateway`, dan `jev_typesafe`.
3. Bandingkan akurasi status per kriteria, false positive rate, latensi p50/p95, dan biaya token. Data latensi dan token diambil dari `jev_calls`.
4. Jalankan tiap mode dua kali untuk memastikan hasilnya identik.
5. Tulis hasilnya ke [BENCHMARK_JEV_VS_LLM.md](../eval/BENCHMARK_JEV_VS_LLM.md).

Tahap ini sebaiknya dijalankan setelah Tahap 1–5 selesai, karena sebelum itu angka perbandingannya belum mencerminkan perilaku akhir.
