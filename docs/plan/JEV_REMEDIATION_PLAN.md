# Tahap Perbaikan Integrasi Jev (TypeSafe)

Dokumen ini berisi langkah perbaikan integrasi Jev di pipeline CV screening, berdasarkan hasil audit kode pada commit `639df75`. Urutannya disusun dari dampak terbesar. Setiap tahap bisa dikerjakan dan di-commit terpisah.

| # | Tahap | Ukuran | Status |
|---|-------|--------|--------|
| 1 | Sensor teks sebelum dikirim ke Jev | Kecil | Selesai (test DB belum dijalankan) |
| 2 | Perbaiki ekstraksi pengalaman | Sedang | Belum (Opsi A) |
| 3 | Hubungkan kutipan dengan keputusan Jev | Sedang | Belum |
| 4 | Cache hasil Jev | Kecil | Belum |
| 5 | Ambang batas confidence | Kecil | Belum |
| 6 | Bersih-bersih kode | Kecil | Belum |
| 7 | Pengukuran (Jev vs LLM) | Sedang | Belum |

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

---

## Tahap 2 — Perbaiki ekstraksi pengalaman

**Masalah.** [experience_extractor.py:285-375](../../src/domain/experience_extractor.py#L285-L375) hanya mengajukan satu pertanyaan Choice (`EXTRACTED` / `NO_EXPERIENCE`) ke Jev. Jawaban Choice tidak membawa daftar pengalaman, jadi kode selalu jatuh ke `parse_experiences()` (regex). Akibatnya:

- Ekstraksi sebenarnya dikerjakan regex, bukan Jev.
- Jawaban `NO_EXPERIENCE`, dengan confidence berapa pun, menghapus seluruh riwayat kerja.
- Client di baris 278 dibuat tanpa `async with`, jadi koneksinya tidak pernah ditutup.

**Keputusan: Opsi A.** Regex mengekstrak entri, lalu Jev memvalidasi tiap entri. Opsi B, yaitu menghapus Jev dari extractor, tidak dipilih.

**Perubahan.**
1. Hapus pertanyaan Choice `EXTRACTED` / `NO_EXPERIENCE` yang diajukan untuk seluruh CV.
2. Ekstrak entri dengan `parse_experiences()` dari teks yang sudah disensor (lihat Tahap 1).
3. Validasi semua entri dalam satu panggilan `system_one`. Setiap entri menjadi satu pertanyaan Noul (`questions={"exp_0": Noul(...), "exp_1": ...}`), dengan `state` per entri berisi judul, organisasi, rentang tanggal, dan bullet.
   - Pertanyaan: "Apakah entri ini pengalaman kerja profesional yang nyata (bukan pendidikan, proyek kuliah, organisasi, atau minat)?"
4. Simpan hasilnya di `WorkExperienceEntity`, dengan field baru `jev_validity: float | None` dan `flags: list[str]`.
   - Nilai Noul di bawah ambang (memakai `JEV_MIN_CONFIDENCE` dari Tahap 5): beri flag `JEV_NOT_WORK_EXPERIENCE`. **Entri tidak dihapus.**
   - Perhitungan durasi di `eval_experience_duration` mengecualikan entri yang punya flag tersebut, dan alasannya dicatat ke `reasons` supaya terlihat oleh recruiter.
5. Catat ke `jev_calls` satu baris per entri, dengan `criterion_id="EXPERIENCE_VALIDATION"` dan `primitive_type="NOUL"`.
6. Buka client dengan `async with`.
7. Terima `as_of` dari pemanggil, tanpa default `date.today()`.
8. Perbarui docstring supaya jujur: ekstraksi memakai regex, validasi memakai Jev.

**Selesai jika.**
- Ada test di mana Jev menolak satu dari tiga entri. Ketiga entri tetap tersimpan, entri yang ditolak memiliki flag, dan durasi hanya dihitung dari dua entri.
- Ada test di mana regex tidak menemukan entri apa pun. Jev tidak dipanggil.
- Ada test di mana API Jev gagal. Dokumen menjadi `NEEDS_REVIEW` seperti perilaku saat ini.

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

**Perubahan.**
- Gunakan kunci cache `sha256(model + primitive + instruksi + kriteria + isi potongan)` di `JevTypeSafeVerifierProvider.verify`, `classify_role_family_jev`, dan extractor.
- Pakai ulang `_get_db_cache` / `_save_db_cache` dengan `task='jev'`.
- Hasil cache tetap dicatat ke `jev_calls` dengan penanda `cached=true`. Ini perlu migrasi kolom.

**Selesai jika.**
- Ada test yang memanggil verifikasi dua kali dengan input sama. `system_one` hanya terpanggil sekali dan hasilnya identik.

---

## Tahap 5 — Ambang batas confidence

**Masalah.** Di [screening_service.py:423-445](../../src/domain/screening_service.py#L423-L445), hasil Jev selalu menggantikan status dari aturan, berapa pun confidence-nya.

**Perubahan.**
- Tambahkan setting `JEV_MIN_CONFIDENCE`, dengan default `0.6`, di [config.py](../../src/infrastructure/config.py).
- Jika confidence di bawah ambang, status dari aturan dipertahankan, lalu ditambahkan flag `JEV_LOW_CONFIDENCE`.
- Terapkan hal yang sama pada klasifikasi role family. Jika confidence rendah, gunakan hasil `classify_role_family` dan beri flag.

**Selesai jika.**
- Ada test di mana Jev menjawab `NOT_DEMONSTRATED` dengan confidence 0.4 dan aturan menghasilkan `STRONG`. Status akhirnya tetap `STRONG` dan membawa flag.

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

1. Siapkan `TEST_DATABASE_URL`, lalu pastikan seluruh test berjalan (`pytest -v`).
2. Jalankan `python docs/spec/golden_dataset/evaluate.py` dalam tiga mode: `rules`, `llm_gateway`, dan `jev_typesafe`.
3. Bandingkan akurasi status per kriteria, false positive rate, latensi p50/p95, dan biaya token. Data latensi dan token diambil dari `jev_calls`.
4. Jalankan tiap mode dua kali untuk memastikan hasilnya identik.
5. Tulis hasilnya ke [BENCHMARK_JEV_VS_LLM.md](../eval/BENCHMARK_JEV_VS_LLM.md).

Tahap ini sebaiknya dijalankan setelah Tahap 1–5 selesai, karena sebelum itu angka perbandingannya belum mencerminkan perilaku akhir.
