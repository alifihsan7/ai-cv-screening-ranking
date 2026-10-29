# Panduan Deployment & Runbook Operasional Platform CV Screening

Dokumen ini berisi prosedur operasional standar (SOP) untuk deployment, pemeliharaan, manajemen cadangan (backup/restore), konfigurasi model AI/LLM, dan pemantauan sistem di VPS Ubuntu.

> **Catatan path:** `/srv/hermes-control/services/cv-screening` di dokumen ini adalah lokasi di **VPS produksi asal**. Di mesin lokal atau Docker, ganti dengan root repo (path penyimpanan CV dan taksonomi sudah relatif ke root repo lewat `src/infrastructure/config.py`, dan bisa di-override lewat `.env`). Bagian 7 menjelaskan hal yang berlaku di mana pun.

---

## 1. Arsitektur Layanan & Port

| Komponen | Runtime / Service | Port / Socket | Domain / Akses |
| :--- | :--- | :--- | :--- |
| **REST API Backend** | FastAPI (uvicorn) | `127.0.0.1:8110` | Reverse proxy `/api/*` |
| **Frontend Web SPA** | Vite React TypeScript | Static Build (`dist/`) | `https://screening.rifqisetiawan.my.id` |
| **Database & Vektor**| PostgreSQL 16 + `pgvector` 0.8.7 | `127.0.0.1:5432` | `cv_screening` DB (Port 5432 loopback) |
| **LLM Gateway** | 9Router Container | `127.0.0.1:20128` | Internal loopback `/v1/chat/completions` |
| **Reverse Proxy** | Caddy v2 (Docker) | `80 / 443 / 2019` | SSL otomatis via Cloudflare / Let's Encrypt |

---

## 2. Prosedur Start, Stop, & Restart Layanan

### Prosedur Deploy / Pembaruan Kode & Skema (Standard SOP):
Setiap pembaruan production wajib mengikuti urutan:
1. **Pencadangan Basis Data & Dokumen:**
   ```bash
   cd /srv/hermes-control/services/cv-screening
   ./scripts/backup.sh
   ```
2. **Jalankan Migrasi Skema Basis Data (Alembic):**
   ```bash
   make migrate
   # atau: .venv/bin/alembic upgrade head
   ```
3. **Restart Layanan Aplikasi & Worker:**
   ```bash
   sudo systemctl restart cv-screening-api.service cv-screening-worker.service
   ```
4. **Verifikasi Metrik & Log Kesehatan:**
   ```bash
   curl -H "Authorization: Bearer $METRICS_TOKEN" http://127.0.0.1:8110/metrics
   ```

*Catatan Penting Keamanan DB:* Skrip destruktif lama `scripts/migrate.sh` telah diubah menjadi `scripts/reset_dev_db.sh` dan dipasangi penjaga (`CONFIRM_RESET=yes`). Jangan pernah menjalankannya di environment production.

### Menjalankan Backend Secara Mandiri (Development):
```bash
cd <root repo>            # di VPS: /srv/hermes-control/services/cv-screening
source .venv/bin/activate
uvicorn src.api.main:app --host 127.0.0.1 --port 8110 --reload
python -m src.worker.main   # terminal terpisah; worker TIDAK punya --reload (lihat bagian 7)
```

### Mengelola Layanan Produksi via Systemd:
Unit file terpasang di `deploy/systemd/cv-screening-api.service`:
```bash
# Restart API Backend
sudo systemctl restart cv-screening-api.service

# Cek Status Layanan
sudo systemctl status cv-screening-api.service

# Melihat Log Real-time
sudo journalctl -u cv-screening-api.service -f
```

### Reload Reverse Proxy Caddy:
```bash
curl -s -X POST "http://127.0.0.1:2019/load" \
  -H "Content-Type: text/caddyfile" \
  --data-binary "@/srv/gateway/caddy/Caddyfile"
```

---

## 3. Manajemen Cadangan (Backup & Restore)

### Eksekusi Backup Harian:
Skrip `scripts/backup.sh` mencadangkan database PostgreSQL secara utuh beserta berkas vault PDF/DOCX:
```bash
cd /srv/hermes-control/services/cv-screening
./scripts/backup.sh
```
* **Output:** Tersimpan di `/srv/hermes-control/backups/cv-screening/<TIMESTAMP>/`.
* **Berkas:** `cv_screening_<TIMESTAMP>.dump`, `vault_<TIMESTAMP>.tar.gz`, dan `SHA256SUMS.txt`.

### Uji Restore & Pemulihan Bencana:
Skrip `scripts/restore.sh` memverifikasi checksum dan merestorasi data ke database terisolasi untuk membuktikan integritas:
```bash
cd /srv/hermes-control/services/cv-screening
./scripts/restore.sh [/path/ke/backup_dir]
```

---

## 4. Prosedur Penggantian Model Embedding & LLM

### Mengganti Model Embedding:
1. Model default saat ini adalah `microsoft/harrier-oss-v1-270m` dengan dimensi 640.
2. Edit file `.env`:
   ```bash
   EMBEDDING_MODEL=microsoft/harrier-oss-v1-270m
   EMBEDDING_DIM=640
   ```
3. Jika dimensi kolom berubah, migrasikan kolom di PostgreSQL:
   ```sql
   DROP INDEX IF EXISTS idx_profile_chunks_embedding;
   ALTER TABLE profile_chunks ALTER COLUMN embedding TYPE vector(<DIMENSI_BARU>);
   CREATE INDEX idx_profile_chunks_embedding ON profile_chunks USING hnsw (embedding vector_cosine_ops);
   ```

### Mengganti Provider / Model LLM:
1. Konfigurasi tersimpan di `.env`:
   ```bash
   LLM_DATA_POLICY=redacted_dev_router
   LLM_GATEWAY_URL=http://127.0.0.1:20128/v1
   LLM_MODEL_JD_COMPILER=ag/gemini-3.8-flash-high
   LLM_TEMPERATURE=0.0
   ```
2. Untuk beralih ke model lokal atau API berbayar resmi, ubah `LLM_DATA_POLICY=paid_or_local_only` dan sesuaikan `LLM_GATEWAY_URL` serta `LLM_GATEWAY_KEY`.

---

## 5. Pemantauan & Metrik (Prometheus)

Metrik sistem diekspos dalam format standar Prometheus di endpoint:
```text
GET /metrics
```
Metrik mencakup:
- `cv_processed_total`: Akumulasi CV yang diproses.
- `cv_processed_hourly`: Estimasi throughput per jam.
- `pipeline_stage_latency_seconds{stage="..."}`: Latensi pemrosesan tiap tahap.
- `llm_calls_total` & `llm_tokens_total`: Total konsumsi API LLM.
- `cv_failures_total{reason="..."}`: Rincian berkas yang ditolak/gagal.

---

## 6. Konkurensi Uvicorn & Catatan Rate Limiter (FX-06 / R-14)

Unit systemd `deploy/systemd/cv-screening-api.service` dikonfigurasi menggunakan `--workers 2`.
Karena rate limiter saat ini diimplementasikan secara thread-safe in-memory per proses, perlu dicatat karakteristik operasionalnya:
- **Limit Efektif = Limit per Worker × Jumlah Worker (2)**.
- Contoh: Batas upload 20 request/menit pada arsitektur 2 workers memberikan batas agregat efektif 40 request/menit jika beban terbagi merata melalui round-robin worker OS.
- Jika diinginkan batas strict absolut tunggal per IP, uvicorn dapat diturunkan menjadi `--workers 1` atau state rate limiter dimigrasikan ke Redis / tabel PostgreSQL terpusat.

---

## 7. Operasi yang Berlaku di Mana Pun (Jev, Pemrosesan Ulang, Data Pribadi)

### 7.1 Worker harus di-restart setelah kode atau taksonomi berubah
API dengan `--reload` memuat ulang sendiri, tetapi **worker (`python -m src.worker.main`) tidak**: ia terus memakai kode yang ada di memorinya saat dimulai. Worker lama yang dibiarkan berjalan akan terus mengekstrak CV dengan parser lama dan menulis hasil lama. Taksonomi (`config/taxonomy/*.yaml`) juga dimuat sekali saat proses mulai. Setelah `git pull`, perbarui YAML, atau ganti branch: restart worker dan API (`sudo systemctl restart cv-screening-api.service cv-screening-worker.service`, atau hentikan dan jalankan ulang proses di dev).

### 7.2 Konfigurasi Jev (TypeSafe)
Di `.env` (contoh di `.env.example`):
```bash
SCORING_MODE=jev_hybrid        # rules | hybrid | jev_hybrid
TYPESAFE_API_KEY=...           # kosong = tidak dikonfigurasi; panggilan Jev gagal dengan jujur, tidak ada emulasi
VERIFIER_MIN_CONFIDENCE=0.60   # jawaban Jev di bawah ini tidak menimpa status aturan
EVIDENCE_TOP_K=8               # jumlah potongan bukti yang dinilai Jev per kriteria
```
`hybrid` dan `jev_hybrid` juga mengaktifkan validasi pengalaman oleh Jev saat ingest. Setiap panggilan Jev berbayar (sekitar $0,007 sampai $0,013 untuk 15 CV) dan dicatat di tabel `jev_calls`. Test otomatis tidak memanggil API sungguhan: `tests/conftest.py` mengosongkan `TYPESAFE_API_KEY` kecuali `RUN_LIVE_JEV=1`. Hasil Jev **belum di-cache** dan bisa berbeda antar run di sekitar confidence 0,6.

### 7.3 Memproses ulang dokumen yang sudah READY
`process_document` melewati dokumen yang berstatus `READY` ("already in state READY, skipping"). Antre ulang saja **tidak** memproses apa pun. Untuk memproses ulang satu job dengan kode terbaru:
```sql
-- 1. kembalikan statusnya, 2. antre ulang
UPDATE documents SET status = 'RECEIVED', updated_at = now() WHERE job_id = '<JOB_ID>' AND status = 'READY';
INSERT INTO jobs_queue (type, payload)
SELECT 'ingest_cv', jsonb_build_object('document_id', d.id::text)
FROM documents d WHERE d.job_id = '<JOB_ID>' AND d.status = 'RECEIVED';
```
Worker memproses satu per satu (pemrosesan pertama bisa lambat karena model embedding dimuat). Pemrosesan ulang mengenali orang yang sama lewat hash email, jadi kandidat tidak diduplikasi bila email terbaca. Run screening lama tidak berubah; jalankan screening baru untuk melihat hasil dengan ekstraksi terbaru.

### 7.4 Membersihkan data pribadi di baris lama
Sebelum keputusan D21, `candidate_profiles.profile` menyimpan profil mentah (nama, email, telepon, teks CV) tanpa enkripsi. Untuk database yang sudah berisi baris seperti itu:
```bash
python scripts/scrub_stored_pii.py            # dry run: hanya melaporkan
python scripts/scrub_stored_pii.py --apply    # menulis, dalam satu transaksi
```
Identitas asli tetap aman di `candidate_identities` (terenkripsi); skrip hanya mengganti `profile` dengan `matching_profile` dan menyensor sampel teks di `quality`. Pemeriksaan sesudahnya: tidak ada kunci `identity` di `profile`, dan tidak ada pola email di `quality`.

### 7.5 Mengukur sebelum dan sesudah mengubah aturan
`python scripts/eval_agent_path.py --mock-jev --output-json out.json` (gratis, hanya aturan) dan tanpa `--mock-jev` (Jev asli, berbayar). Set hold-out (`docs/eval/holdout_set*/`) hanya untuk mengukur, jangan dipakai menyetel aturan. Rincian dan hasil: `docs/eval/BENCHMARK_RESULTS_2026-10-29.md`.
