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

## 6. Hasil langkah 1 (diukur 30 Oktober 2026)

| Kriteria | Hasil |
|---|---|
| 1. Perangkat lunak tidak bergeser | **Terpenuhi.** Ekstraksi 66 CV sintetis: 0 berbeda. Aturan murni di lima set: 0 sel berubah. Live (Jev asli): golden 150/150 dan hold-out 3 117/120, sama seperti sebelumnya. Penurunan keluarga yang diterima untuk JD-01 dan JD-02 tidak berubah |
| 2. Set sipil, R2 | **Terpenuhi, dengan catatan di bawah.** Alur produksi: R2 **4/12 → 12/12** (aturan murni 7/12 → 12/12), tidak ada STRONG palsu pada perangkat lunak, pemasaran, atau akuntan proyek. R1 12/12 sebelum dan sesudah (tidak rusak sejak awal). Total 16/24 → 24/24 |
| 3. Uji asap HR (JD-02, I1, R1) | **Terpenuhi.** Alur produksi dengan Jev: NOT_DEMONSTRATED, 0 bulan → **STRONG, 76 bulan**. Lowongan HR golden kita sendiri rusak di produksi sebelum perubahan ini |
| 4. 13 CV nyata | R2 dari **13 N → 3 STRONG, 3 PARTIAL, 6 N**. Daftar entri yang dinilai relevan dan bukan relevan (hanya judul) diberikan ke pemilik untuk ditinjau; tidak masuk repo |
| 5. Tes baru | **Terpenuhi.** 17 tes baru; suite 454 lulus, 3 dilewati |

### Catatan yang membatasi klaim

- **Set sipil sebagian melingkar.** Ia ditulis setelah melihat kegagalan, dan judul benih (`pelaksana lapangan`, `pengawas lapangan`, `quantity surveyor`, `drafter`) serta kosakata bulletnya berasal dari pengamatan yang sama. Ablasi: tanpa satu pun judul benih hasilnya tetap 12/12 (aturan kata bidang cukup), tetapi dengan hanya tiga kata bidang turun menjadi 4/12. Jadi hasil ini membuktikan **mekanisme** (organisasi dikecualikan, magang 50%, tumpang tindih digabung, judul profesi lain menolak, usulan model masuk), **bukan** kemampuan membaca kosakata bidang yang belum diduga.
- **Pada CV nyata, kosakata adalah batasnya.** Entri seperti "Balai Geoteknik, Terowongan, dan Struktur" (C-0026) dan "Junior Engineer" di proyek kilang (C-0022) dinilai bukan relevan karena kata di bulletnya (geoteknik, terowongan, piping) tidak ada di profil. Itu tepat jenis kasus yang dijawab oleh (a) usulan model yang disimpan di `params.role_profile` dan (b) pertanyaan relevansi Jev untuk entri ambigu, yang dengan sengaja belum dikerjakan di langkah ini dan kini punya bukti kebutuhan.
- **Usulan model sungguhan** (gateway lokal, hanya dari teks lowongan sipil, tanpa melihat CV): 12 judul dan 22 kata bidang yang masuk akal (`pelaksana proyek`, `site supervisor`, `quantity surveyor`, `insinyur sipil`, `pondasi`, `kurva s`, ...). Sebagian istilahnya berbentuk `rencana anggaran biaya (rab)` dan `ska / skt` yang tidak akan pernah cocok dengan teks CV; pembersih kini memecahnya (tes ditambahkan). Pada 13 CV nyata, usulan itu menggeser R2 dari 3 STRONG / 3 PARTIAL / 6 N (hanya benih) menjadi **3 / 4 / 5**: menambah `Junior Engineer` (C-0022) dan `Tunnel Engineer` (C-0024). Perbaikannya nyata tetapi kecil; lima kandidat yang tetap N belum ditinjau, jadi belum diketahui berapa yang memang tidak punya pengalaman relevan dan berapa yang terlewat kosakata.
- **Lowongan yang tidak punya keluarga di taksonomi** (mis. akuntansi) tetap jatuh ke cadangan perangkat lunak bila model gagal mengusulkan profil. Mekanisme usulan hanya diuji dengan model sungguhan pada satu lowongan (sipil).
- Kriteria selain R1 dan R2 pada lowongan sipil tidak diperiksa (R7 sertifikasi bernilai N di hampir semua kandidat; belum diselidiki).

## 7. Uji alur penuh lewat API (30 Oktober 2026)

Dijalankan pada API dan worker terpisah (port 8199, database `cv_screening_test`, vault sementara), bukan pada layanan produksi. Alur: buat lowongan dari templat "Civil Engineer (Struktur & Pelaksana)" → `compile-preview` (model sungguhan mengusulkan profil) → recruiter menyunting profil → `import-approved` → `approve` → unggah 12 CV sipil → screening dengan Jev sungguhan.

- **Profil tersimpan dan terbaca ulang:** R2 membawa profil lengkap (benih + usulan), `source` menjadi `edited`. Penyuntingan dihormati: `quantity surveyor` yang dihapus tidak kembali dari taksonomi. Kata yang diselipkan `Laki-laki <b>` dibuang pembersih di server.
- **R2 pada alur API: 12/12 cocok dengan label**, walau `quantity surveyor` sudah dihapus (aturan kata bidang dan judul lain cukup).
- Batas: ini set pengembangan sipil yang sama dengan §6 (sebagian melingkar), satu lowongan, satu kali jalan. Yang diperiksa adalah **jalur data** (profil disunting → disimpan → dipakai), bukan kemampuan membaca profesi baru. Kriteria selain R2 tidak diperiksa.

## 8. Langkah 4: pertanyaan relevansi Jev untuk entri ambigu (rancangan dan kriteria penerimaan, ditulis sebelum kode)

Ditulis 30 Oktober 2026. Bukti kebutuhan: pada CV nyata, aturan kosakata melewatkan entri seperti "Balai Geoteknik, Terowongan, dan Struktur" dan "Junior Engineer" di proyek kilang (§6).

**Rancangan.**
- **Hanya menambah, tidak pernah mengurangi.** Aturan di §2 tetap yang pertama. Jev hanya ditanya tentang entri yang aturan nilai *tidak relevan*, dan hanya bila entri itu **ambigu**: bukan organisasi/kepanitiaan, judulnya bukan milik profesi lain (`_title_belongs_elsewhere`), dan memuat tepat **1** kata bidang (atau judulnya kosong/generik). Entri yang jelas relevan atau jelas bukan tidak pernah menyentuh Jev.
- **Pertanyaan tertutup** (CHOICE): `RELEVAN`, `BERDEKATAN`, `TIDAK`, dengan keadaan berisi deskripsi kriteria, profil lowongan, dan judul serta bullet satu entri (teks CV tetap data, bukan instruksi; tanpa PII).
- **Hanya `RELEVAN` dengan keyakinan ≥ 0,80 yang dihitung.** `BERDEKATAN` tidak dihitung tetapi memberi flag `ENTRY_NEEDS_REVIEW` agar recruiter melihatnya (tanpa penolakan otomatis, aturan emas #6). `TIDAK` dan keyakinan rendah: tidak dihitung, tanpa flag.
- Skor tetap dihitung kode dari bulan; Jev tidak menghasilkan angka (aturan emas #1). Setiap panggilan dicatat di `jev_calls`.
- Berlaku hanya di **jalur profil** (non-perangkat-lunak atau `params.role_profile` ada). Jalur perangkat lunak tidak disentuh.
- Bila Jev tidak terkonfigurasi atau gagal: entri tetap *tidak relevan* (aturan murni), tanpa kesalahan fatal; hasil sama dengan sekarang.

**Kriteria penerimaan (sebelum pengukuran).**
1. **Perangkat lunak tidak bergeser:** aturan murni lima set 0 sel berubah; ekstraksi sama.
2. **Set sipil (pengembangan):** R2 tetap 12/12 pada alur produksi; **tidak ada STRONG palsu** pada CV di luar bidang. Jev tidak boleh mengubah satu pun label yang sudah benar.
3. **Jev tidak pernah mengubah entri yang aturan nilai relevan** (diuji dengan klien palsu yang selalu menjawab TIDAK: hasil identik dengan aturan murni).
4. **Biaya:** jumlah panggilan Jev per CV dilaporkan; hanya entri ambigu yang dipanggil (diuji dengan klien palsu yang menghitung panggilan: nol panggilan untuk entri jelas, organisasi, dan judul profesi lain).
5. **Kestabilan:** dua kali jalan pada 13 CV nyata dilaporkan jumlah entri yang berbalik keputusan; bila ada, itu dicatat sebagai batas (menunggu cache Tahap 4), bukan disembunyikan.
6. **CV nyata:** daftar entri yang berubah dari tidak relevan menjadi dihitung (hanya judul) diberikan ke pemilik untuk ditinjau satu per satu; ketepatannya dilaporkan dari tinjauan itu, bukan dari tebakan saya.
7. **Tes baru:** jawaban RELEVAN/BERDEKATAN/TIDAK, ambang keyakinan, kegagalan klien, dan butir 3 dan 4 di atas.

**Batas yang sudah diketahui.** Jev tidak deterministik di sekitar keyakinan 0,6; ambang 0,80 mengurangi tetapi tidak menghilangkan balikan. Tanpa cache (Tahap 4), aturan emas #7 (hasil identik) hanya terpenuhi penuh untuk entri yang tidak ambigu.

