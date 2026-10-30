# Checkpoint 30 Oktober 2026: profil peran lowongan

Lanjutan dari [CHECKPOINT_2026-10-29.md](CHECKPOINT_2026-10-29.md) (yang tetap berlaku untuk Jev, parser, dan privasi). Dokumen ini hanya mencatat pekerjaan **profil peran lowongan**. Rancangan, kriteria penerimaan, dan angka ada di [ROLE_PROFILE_DESIGN.md](ROLE_PROFILE_DESIGN.md).

## 1. Status

- **Branch kerja:** `fix/vacancy-role-profile` (lokal, **belum di-push, belum ada PR**; keputusan pemilik: push dan PR di akhir). Dicabangkan dari `main`.
- **Test:** 459 lulus, 3 dilewati; Playwright 10 lulus; `tsc -b` dan `oxlint` bersih; ruff bersih pada berkas yang disentuh.
- **Belum berubah:** PR #5 (`chore/repo-cleanup`) masih terbuka; `fix/jev-remediation` tidak boleh dihapus sampai pemilik bilang; Tahap 4 (cache Jev) tetap paling akhir; buku panduan (dua PDF) belum dimulai.

## 2. Masalah dan hasilnya

Kriteria pengalaman pada lowongan non-software selalu `NOT_DEMONSTRATED` karena pengklasifikasi peran Jev hanya mengenal peran software. Lowongan sipil: 13 CV nyata semua N; lowongan HR golden (JD-02) juga rusak di produksi. Kini lowongan mendefinisikan sendiri apa yang relevan (profil peran), dan model hanya mengusulkan data, tidak menghitung.

| Langkah | Isi | Status |
|---|---|---|
| 1 | Backend: `src/domain/role_profile.py`, jalur profil di `kind_rules.py`, usulan model di `jd_compiler.py`, benih taksonomi sipil | selesai |
| 2 | Panel "Pekerjaan yang dihitung relevan" di Criteria Studio | selesai |
| 3 | Penyuntingan profil oleh recruiter, dibersihkan dan di-lint di server saat disimpan | selesai |
| 4 | Pertanyaan relevansi Jev (RELEVAN/BERDEKATAN/TIDAK) untuk entri ambigu | **ditunda**; rancangan dan kriteria penerimaan sudah ditulis (ROLE_PROFILE_DESIGN §8), belum ada kode |
| 5 | ACHIEVEMENT, LEADERSHIP, `JEV_DOMAIN_GUARD` relatif terhadap lowongan; set bidang kedua (akuntansi atau pemasaran) | belum |

Angka: R2 set sipil sintetis (alur produksi) 4/12 → **12/12**; uji alur penuh lewat API dengan Jev sungguhan juga 12/12; HR JD-02 R1 N → STRONG (76 bulan); 13 CV nyata R2 13 N → 3 STRONG, 4 PARTIAL, 5 N dengan usulan model; software tidak bergeser (golden 150/150, hold-out 3 117/120, aturan murni 0 sel berubah).

## 3. Aturan yang berlaku

- Profil yang tersimpan di `params.role_profile` dipakai **persis seperti tersimpan** (terkunci bersama versi kriteria): kata yang dihapus recruiter tidak kembali dari taksonomi. Tanpa profil tersimpan, benih taksonomi dipakai.
- Lowongan software tetap di jalur Jev lama; jalur profil hanya bila keluarga yang diterima bukan software atau `params.role_profile` ada. Profil yang kosong setelah dibersihkan dibuang agar tidak memindahkan lowongan software ke jalur profil.
- Linter proyek mengizinkan agama dan gender secara default (`ALLOW_RELIGION_CRITERIA`, `ALLOW_GENDER_CRITERIA`); jadi kata seperti itu lolos ke profil. Itu konfigurasi yang ada, bukan perubahan ini.

## 4. Batas yang harus diingat

- Set sipil adalah **set pengembangan, sebagian melingkar**; ia membuktikan mekanisme dan jalur data, bukan kemampuan membaca profesi yang belum diduga. Usulan model sungguhan diuji pada satu lowongan.
- Pada CV nyata, kosakata adalah batasnya. Lima kandidat nyata masih N dan **belum ditinjau pemilik** (berapa yang memang tidak relevan, berapa yang terlewat kosakata). Itu bukti yang menentukan apakah langkah 4 perlu.
- Lowongan tanpa keluarga di taksonomi dan dengan usulan model gagal tetap jatuh ke jalur software.
- Kriteria sipil R3 sampai R8 belum diperiksa (R7 sertifikasi N untuk hampir semua kandidat).
- Panel UI diuji dengan respons compile palsu di Playwright dan dengan backend sungguhan lewat API; alur klik penuh di browser dengan backend sungguhan belum.
- `cv_screener.db` (0 byte, tidak terlacak) dan `.claude/` tidak masuk commit; asal berkas pertama tidak diketahui.

## 5. Langkah berikutnya (urutan usulan)

1. Pemilik meninjau lima kandidat nyata yang masih N (daftar judul relevan dan tidak relevan diberikan terpisah, tidak masuk repo). Hasilnya memutuskan langkah 4.
2. Periksa kriteria sipil R3 sampai R8, terutama R7.
3. Langkah 4 atau 5 sesuai hasil butir 1.
4. Di akhir: push `fix/vacancy-role-profile` dan buka PR (`gh --repo alifihsan7/ai-cv-screening-ranking`; tanpa Co-Authored-By di commit).
