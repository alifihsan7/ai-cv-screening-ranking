# Profil peran lowongan: rancangan langkah 1 dan kriteria penerimaan

Ditulis 30 Oktober 2026 **sebelum** kode diubah. Konteks: [CHECKPOINT_2026-10-29.md](CHECKPOINT_2026-10-29.md). Keputusan pemilik: pendekatan "profil peran diusulkan, lalu disetujui recruiter", dikerjakan bertahap; langkah 1 hanya backend.

## 1. Masalah (terukur pada lowongan "Civil Engineer (Struktur & Pelaksana)", 13 CV nyata)

Kriteria R2 (pengalaman kerja minimal 1 sampai 3 tahun di konstruksi sipil, wajib, bobot 20) bernilai `NOT_DEMONSTRATED` untuk **semua 13 kandidat**, sehingga 11 dari 12 kandidat jatuh ke band C. Penyebab, semuanya terverifikasi:

1. **Pengklasifikasi peran Jev berdaftar tetap perangkat lunak** (`STANDARD_ROLE_FAMILIES` di `verifier.py`: BACKEND, FRONTEND, FULLSTACK, DEVOPS_SRE, DATA_AI, MOBILE, NON_TECHNICAL). Tidak ada kategori sipil, jadi keluarga yang diterima R2 (`civil_engineering`) tidak mungkin keluar. Compiler lowongan memakai pengklasifikasi yang sama untuk lowongan itu sendiri. Lowongan HR golden (JD-02) melewati jalur yang sama.
2. **Cadangan taksonomi sempit:** `civil_engineering` hanya punya enam judul persis. "Asisten Engineer and Drafter", "Junior Engineer", dan "Project Control" jatuh ke `other`; yang terbaca sipil justru organisasi mahasiswa.
3. **Penurunan keluarga yang diterima memakai substring:** kata bidang `bi` (milik keluarga `data`) cocok di dalam "**bi**dang", sehingga R2 sipil menerima `['data', 'civil_engineering']`.
4. Metrik bernama `backend_months` untuk semua bidang.

## 2. Prinsip

**Lowongan mendefinisikan apa yang relevan; taksonomi hanya benih.** Model bahasa hanya mengusulkan *data* (judul dan kata bidang); kode yang menghitung; manusia menyetujui sebelum dikunci. Memenuhi aturan emas #1 (model tidak menghitung skor), #3 (teks CV adalah data), dan #7 (hasil sama untuk kriteria yang sama).

## 3. Cakupan langkah 1

**Termasuk:**
- Modul baru `src/domain/role_profile.py`:
  - `infer_accepted_families(req)`: penurunan keluarga yang diterima dengan **batas kata** (memperbaiki butir 1.3), satu implementasi untuk semua pemakai.
  - `RoleProfile` (judul, kata bidang, sumber), `seed_profile(families)` dari taksonomi, `resolve_role_profile(req)`.
  - Aturan relevansi (deterministik): sebuah entri **relevan** bila judulnya memuat salah satu judul profil (batas kata), **atau** judul dan bulletnya memuat sedikitnya 2 kata bidang berbeda. Entri organisasi/kepanitiaan (himpunan, BEM, UKM, panitia, komunitas) tidak dihitung sebagai pengalaman kerja.
  - `sanitize_proposal(raw)`: membersihkan usulan model (tipe, panjang, duplikat, kata terlalu umum, istilah terlarang oleh policy linter).
- `kind_rules.py`: bila keluarga yang diterima **tidak memuat keluarga perangkat lunak** (atau `params.role_profile` ada), jalur durasi memakai profil, bukan klasifikasi Jev. Lowongan perangkat lunak **tetap di jalur lama**, tidak berubah.
- `jd_compiler.py`: untuk kriteria EXPERIENCE_DURATION lowongan non-perangkat-lunak, panggil model sekali untuk mengusulkan profil, bersihkan, simpan di `params.role_profile`. Gagal mengusulkan **tidak fatal** (benih taksonomi dipakai).
- Benih taksonomi: judul dan kata bidang `civil_engineering` diperluas (judul spesifik saja, tanpa kata umum seperti "engineer" saja).
- Metrik durasi: tetap menulis `backend_months` (kompatibilitas) dan menambah `relevant_months`.
- Set pengembangan sipil sintetis (`docs/eval/civil_set/`) dan perubahan kecil `eval_agent_path.py` agar menerima label sebagian.

**Tidak termasuk (langkah berikutnya):** tampilan dan penyuntingan profil di Criteria Studio; pertanyaan relevansi Jev (RELEVAN/BERDEKATAN/TIDAK) untuk entri ambigu; ACHIEVEMENT, LEADERSHIP, dan `JEV_DOMAIN_GUARD` relatif terhadap lowongan; set bidang kedua. Pertanyaan relevansi Jev baru ditambahkan **bila** recall aturan terbukti kurang.

## 4. Mengapa jalur perangkat lunak tidak disentuh

Jalur Jev yang ada sudah terukur (golden 150/150, hold-out 115 sampai 117). Menggantinya sekaligus mencampur dua perubahan besar. Langkah 1 membuktikan mekanisme profil pada bidang non-perangkat-lunak lebih dulu; penyatuan jalur dipertimbangkan setelah ada bukti.

## 5. Kriteria penerimaan (ditulis sebelum pengukuran)

1. **Perangkat lunak tidak bergeser:** ekstraksi 66 CV sintetis identik dan aturan murni di lima set (golden, parafrase, hold-out 1 sampai 3) **0 sel berubah**. Penurunan keluarga yang diterima untuk kedua kriteria golden (JD-01, JD-02) tidak berubah.
2. **Set sipil (R2):** sedikitnya **10 dari 12** label R2 benar pada alur produksi, dan **tidak ada** STRONG palsu pada CV di luar bidang (perangkat lunak, pemasaran, akuntan proyek). Satu jebakan presisi sengaja diberikan (akuntan di kontraktor); bila gagal, itu dilaporkan sebagai batas, bukan disembunyikan.
3. **Uji asap HR (JD-02, I1):** R1 bernilai STRONG pada alur produksi dengan Jev (sebelum perubahan dicatat sebagai baseline).
4. **13 CV nyata (tidak masuk repo):** R2 tidak lagi N untuk semua; jumlah CV dengan bulan relevan > 0 dilaporkan, dan daftar kandidat yang berubah ditinjau satu per satu.
5. **Tes baru lulus:** penurunan keluarga dengan batas kata (kasus "bidang"), aturan relevansi, pengecualian organisasi, pembersih usulan model, dan jalur kompilasi dengan model yang gagal.

**Batas kejujuran:** set sipil dibuat setelah melihat kegagalan pada CV nyata bidang yang sama, jadi ia **set pengembangan, bukan hold-out**. Ia membuktikan bahwa cacat yang ditemukan hilang, bukan bahwa profesi lain akan terbaca; itu perlu set bidang kedua (langkah 4).
