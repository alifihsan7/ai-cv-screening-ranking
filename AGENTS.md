# AGENTS.md

Titik masuk untuk agen pengodean mana pun (Codex, Claude Code, dan lainnya). Isi aturan ada di dokumen lain; berkas ini hanya menunjuknya.

1. **Baca [CLAUDE.md](CLAUDE.md) dulu.** Berisi misi, 8 aturan emas yang tidak boleh dilanggar, peta kode, dan perintah (tes, lint, menjalankan layanan). Berlaku untuk agen mana pun, bukan hanya Claude.
2. **Baca [docs/plan/CHECKPOINT_2026-10-30.md](docs/plan/CHECKPOINT_2026-10-30.md)** untuk keadaan terkini, pekerjaan yang terbuka, dan bagian 6 (preferensi pemilik, perintah yang sudah terbukti, jebakan).
3. Rincian lain: [docs/README.md](docs/README.md).

Ringkasan yang paling sering terlupa:
- Bahasa komunikasi: Indonesia. Laporkan hasil dengan jujur, termasuk tes yang gagal atau yang tidak diperiksa.
- Commit **tanpa** `Co-Authored-By` atau atribusi agen apa pun.
- Push, PR, dan penghapusan branch hanya bila pemilik meminta.
- Jangan menyebut alur skrining sebagai "agent" (urutan fase tetap, bukan agen otonom).
- Tes memakai database `cv_screening_test`, bukan produksi; lihat checkpoint bagian 6 untuk perintahnya.
