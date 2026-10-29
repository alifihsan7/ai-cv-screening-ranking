# Panduan Ekstensi Taksonomi Domain (FX-31)

Platform CV Screening menggunakan sistem taksonomi berbasis berkas konfigurasi YAML di folder `config/taxonomy/`. Seluruh pengenalan jabatan, alias keahlian, istilah sertifikasi, dan aturan kepemimpinan dikendalikan oleh berkas-berkas ini **tanpa perlu mengubah kode sumber Python**.

---

## 1. Struktur Berkas Taksonomi

Folder `config/taxonomy/` berisi:
- `role_families.yaml`: Klasifikasi jabatan (misalnya `backend`, `frontend`, `data`, `civil_engineering`, `hr`, `finance`).
- `skills.yaml`: Konsep keahlian, alias, relasi, dan kategori bobot.
- `certifications.yaml`: Istilah pencocokan sertifikasi profesional (mis. `cert:cloud`, `cert:hr`, `cert:safety_civil`).
- `leadership.yaml`: Kata kerja aksi dan kata kunci jabatan kepemimpinan (`verbs`, `titles`), ditambah dua daftar kata untuk aturan domain (lihat bagian 4).
- `prohibited_criteria.yaml`: Leksikon deteksi kriteria diskriminatif (PROHIBITED) dan syarat administratif (ADMIN_DEMOGRAPHIC).
- `stopwords.txt`: Kata henti umum dalam bahasa Indonesia dan Inggris.

---

## 2. Cara Menambahkan Role Baru (Contoh: `data_analyst`)

### Langkah 1: Tambahkan Role Family di `role_families.yaml`
Buka `config/taxonomy/role_families.yaml` dan tambahkan blok baru:

```yaml
data_analyst:
  titles:
    - data analyst
    - analis data
    - junior data analyst
    - senior data analyst
    - bi analyst
    - business intelligence analyst
  domain_terms:
    - sql
    - python
    - dashboard
    - power bi
    - tableau
    - data visualization
    - reporting
  related:
    - data
    - business_analyst
```

### Langkah 2: Tambahkan Keahlian / Konsep di `skills.yaml`
Buka `config/taxonomy/skills.yaml` dan daftarkan konsep atau alias spesifik:

```yaml
skill:power_bi:
  label: Power BI
  type: tool
  category: HARD_SKILLS
  kind: SKILL
  default_importance: STRONG_PREFERENCE
  default_weight: 8.0
  aliases:
    - power bi
    - powerbi
    - power-bi
    - dax

field:data_analytics:
  label: Sains Data & Statistika
  aliases:
    - sains data
    - data science
    - statistika
    - statistics
    - matematika
```

### Langkah 3: Verifikasi Otomatis
Setelah berkas YAML disimpan, aplikasi akan otomatis memvalidasi regex saat startup. Untuk memverifikasi sintaks dan integritas:

```bash
make test
```

Aplikasi mengenali kandidat dengan jabatan dan istilah tersebut tanpa penulisan kode baru. **Taksonomi dimuat sekali saat proses mulai** (`get_taxonomy` di-cache), jadi API dan worker perlu di-restart agar perubahan YAML berlaku.

---

## 3. Alias Bidang Pendidikan (`field:*`)

Konsep `field:*` di `skills.yaml` (mis. `field:computing`) memuat `aliases` (nama bidang yang setara, termasuk lintas bahasa: "informatika", "informatics", "ilmu komputer", "computer science") dan `related` (bidang berdekatan). Aturan EDUCATION memakai alias itu dengan dua cara:
- Bila recruiter **tidak** menulis daftar `strong_fields`, alias dan `related` bidang yang cocok dengan kriteria dipakai sebagai jurusan yang diterima.
- Bila recruiter menulis daftar `strong_fields`, daftar itu **diperluas dengan alias bidang yang sama** (keputusan D16 di `docs/spec/DECISIONS.md`). `partial_fields` tidak diperluas.

---

## 4. Daftar Kata untuk Aturan Domain (`leadership.yaml`)

Dua daftar regex (tanpa perlu mengubah kode) dipakai aturan LEADERSHIP dan ACHIEVEMENT serta pengaman verifier (D17 dan D18):

- `non_technical_team_terms`: kata yang menunjukkan tim non-teknis (panitia, acara, relokasi, kantor, pemasaran, penjualan, gudang, logistik, dan seterusnya). Kalimat memimpin yang memuat salah satunya **dan tidak** memuat istilah teknis tidak dihitung sebagai kepemimpinan teknis.
- `technical_domain_terms`: kata yang menandai pekerjaan teknis (engineer, developer, backend, devops, qa, cloud, database, dan seterusnya). Dipakai untuk (a) membatalkan penandaan tim non-teknis di atas bila kalimat yang sama menyebut istilah teknis, dan (b) pengaman `JEV_DOMAIN_GUARD`: verifier tidak boleh menaikkan LEADERSHIP atau ACHIEVEMENT memakai kutipan dari pekerjaan yang judul dan bullet-nya tidak memuat satu pun istilah ini.

Menambah kata ke daftar ini langsung mengubah hasil penilaian. Setelah mengubahnya, jalankan pengukuran `scripts/eval_agent_path.py --mock-jev` (gratis) pada golden dan ketiga set hold-out, dan pastikan tidak ada sel yang menjadi salah.
