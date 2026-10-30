import { test, expect } from '@playwright/test';

test.describe('AI CV Screener E2E Smoke Test Suite', () => {
  test('1. Pemuatan awal Dashboard dan verifikasi bebas error konsol fatal', async ({ page }) => {
    const fatalErrors: string[] = [];

    // Tangkap error uncaught di halaman
    page.on('pageerror', (exception) => {
      fatalErrors.push(`Uncaught exception: ${exception.message}`);
    });

    // Tangkap error level console yang kritis (abaikan warning non-kritis)
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        const text = msg.text();
        if (!text.includes('favicon.ico')) {
          fatalErrors.push(`Console error: ${text}`);
        }
      }
    });

    await page.goto('/');

    // Verifikasi judul tab & halaman
    await expect(page).toHaveTitle(/AI CV Screening/i);

    // Verifikasi brand heading / header utama
    await expect(page.getByText('AI CV Screening').first()).toBeVisible();

    // Verifikasi Stepper 4 langkah ter-render
    const stepper = page.getByRole('navigation', { name: 'Workflow Stepper' });
    await expect(stepper).toBeVisible();
    await expect(page.getByText('Setup Lowongan')).toBeVisible();
    await expect(page.getByText('Kriteria & Bobot')).toBeVisible();
    await expect(page.getByText('Unggah Berkas CV')).toBeVisible();
    await expect(page.getByText('Workbench Screening')).toBeVisible();

    // Verifikasi konten langkah awal (Setup Lowongan Kerja) setelah inisialisasi
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText('Pilih Template Peran Standar Industri:')).toBeVisible();

    // Pastikan tidak ada error fatal saat render awal
    expect(fatalErrors).toHaveLength(0);
  });

  test('2. Pemilihan template peran dan navigasi workflow stepper', async ({ page }) => {
    await page.goto('/');

    // Tunggu heading Setup Lowongan Kerja muncul
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible({ timeout: 15000 });

    // Pilih template lowongan (Senior Backend Engineer)
    const templateBtn = page.getByRole('button', { name: /Senior Backend Engineer/i });
    await expect(templateBtn).toBeVisible();
    await templateBtn.click();

    // Klik tombol Golden Dataset di Topbar untuk membuka seluruh alur
    const goldenDatasetBtn = page.getByRole('button', { name: /Golden Dataset/i });
    await expect(goldenDatasetBtn).toBeVisible();
    await goldenDatasetBtn.click();

    // Navigasi ke Workbench via Stepper
    const workbenchStepBtn = page.getByRole('button', { name: /Workbench/i });
    await expect(workbenchStepBtn).toBeEnabled();
    await workbenchStepBtn.click();
    await expect(page.getByRole('table')).toBeVisible();

    // Navigasi kembali ke Setup Lowongan via Stepper
    const setupStepBtn = page.getByRole('button', { name: /Setup Lowongan/i });
    await setupStepBtn.click();
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible();
  });

  test('3. Preload Golden Dataset, Workbench Roster, dan Filter Interaktif', async ({ page }) => {
    await page.goto('/');

    // Preload sampel benchmark via Golden Dataset
    const goldenDatasetBtn = page.getByRole('button', { name: /Golden Dataset/i });
    await expect(goldenDatasetBtn).toBeVisible();
    await goldenDatasetBtn.click();

    // Navigasi ke Workbench Screening (Langkah 4)
    const workbenchStepBtn = page.getByRole('button', { name: /Workbench/i });
    await workbenchStepBtn.click();

    // Verifikasi tabel kandidat ter-render
    await expect(page.getByRole('table')).toBeVisible();
    await expect(page.getByRole('columnheader', { name: 'Rank' })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Kandidat & Berkas/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Kualifikasi Wajib/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Skor Fit/i })).toBeVisible();
    await expect(page.getByRole('columnheader', { name: /Status Keputusan/i })).toBeVisible();

    // Uji filter Band: Klik Band A
    const bandABtn = page.getByRole('button', { name: 'Band A' });
    await bandABtn.click();
    await expect(bandABtn).toHaveClass(/bg-\[#1B4938\]/);

    // Reset ke Semua Band
    const allBandsBtn = page.getByRole('button', { name: 'Semua Band' });
    await allBandsBtn.click();
    await expect(allBandsBtn).toHaveClass(/bg-\[#1B4938\]/);

    // Uji toggle Blind Mode
    const blindModeBtn = page.getByRole('button', { name: /Blind Mode/i });
    await expect(blindModeBtn).toContainText('Blind Mode: Aktif');
    await blindModeBtn.click();
    await expect(blindModeBtn).toContainText('Blind Mode: Non-aktif');
    await blindModeBtn.click();
    await expect(blindModeBtn).toContainText('Blind Mode: Aktif');

    // Uji input pencarian kandidat
    const searchInput = page.getByPlaceholder(/Cari kandidat, nama, atau berkas CV/i);
    await searchInput.fill('CAN-01');
    await expect(page.getByText('CAN-01').first()).toBeVisible();
    await searchInput.clear();

    // Verifikasi badge buram "AI Verified" / "0 AI Verified" sudah bersih dari toolbar
    await expect(page.getByText(/AI Verified/i)).toHaveCount(0);
  });

  test('4. Inspeksi Modal Detail Kandidat (Candidate Inspector) dan Tab Evaluasi / Jejak Penalaran', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Muat data melalui Golden Dataset dan masuk ke Workbench
    await page.getByRole('button', { name: /Golden Dataset/i }).click();
    await page.getByRole('button', { name: /Workbench/i }).click();

    // Tunggu tabel siap dan klik baris kandidat pertama pada tabel
    const candidateRow = page.locator('tbody tr').first();
    await expect(candidateRow).toBeVisible();
    await candidateRow.click();

    // Verifikasi modal dialog inspeksi terbuka
    const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
    await expect(inspectorDialog).toBeVisible();
    await expect(inspectorDialog).toHaveClass(/translate-x-0/);
    await expect(inspectorDialog.getByText('Skor Fit')).toBeVisible();

    // Uji navigasi tab di dalam modal inspeksi: Jejak Penalaran
    const telemetryTab = inspectorDialog.getByRole('button', { name: /Jejak Penalaran/i });
    await expect(telemetryTab).toBeVisible();
    await telemetryTab.click();
    await expect(telemetryTab).toHaveClass(/bg-\[#FCFDFC\]/);

    // Uji tab Kutipan CV (Grounding)
    const groundingTab = inspectorDialog.getByRole('button', { name: /Kutipan CV/i });
    await expect(groundingTab).toBeVisible();
    await groundingTab.click();
    await expect(groundingTab).toHaveClass(/bg-\[#FCFDFC\]/);

    // Kembali ke tab Evaluasi
    const evalTab = inspectorDialog.getByRole('button', { name: /Evaluasi/i });
    await evalTab.click();
    await expect(evalTab).toHaveClass(/bg-\[#FCFDFC\]/);

    // Verifikasi Panel Performa Sistem tersembunyi secara default (CLS 0, hemat ruang vertikal)
    const telemetryToggleBtn = inspectorDialog.getByRole('button', { name: /Ringkasan Performa Sistem/i });
    await expect(telemetryToggleBtn).toBeVisible();
    await expect(inspectorDialog.getByText(/Metode Penilaian: AI \+ Aturan Baku/i)).toHaveCount(0);

    // Buka Telemetry Panel via toggle
    await telemetryToggleBtn.click();
    await expect(inspectorDialog.getByText(/Metode Penilaian: AI \+ Aturan Baku/i)).toBeVisible();
    await expect(inspectorDialog.getByText(/Kecepatan Analisis: ~0.2 detik \/ CV/i)).toBeVisible();
    await expect(inspectorDialog.getByText(/Biaya Analisis: Sangat Hemat/i)).toBeVisible();
    await expect(inspectorDialog.getByText(/Akurasi Bukti CV: Kutipan Nyata/i)).toBeVisible();

    // Sembunyikan kembali Telemetry Panel
    const hideBtn = inspectorDialog.getByRole('button', { name: /Sembunyikan/i }).first();
    await hideBtn.click();
    await expect(inspectorDialog.getByText(/Metode Penilaian: AI \+ Aturan Baku/i)).toHaveCount(0);
    await expect(telemetryToggleBtn).toBeVisible();

    // Uji tombol keputusan status (misal Shortlist)
    const shortlistBtn = inspectorDialog.getByRole('button', { name: /Shortlist/i }).first();
    await expect(shortlistBtn).toBeVisible();
    await shortlistBtn.click();

    // Tutup panel modal inspeksi via tombol X
    const closeBtn = inspectorDialog.getByTitle('Tutup Panel Inspeksi');
    await expect(closeBtn).toBeVisible();
    await closeBtn.click();

    // Pastikan modal bertransisi tertutup (translate-x-full)
    await expect(inspectorDialog).toHaveClass(/translate-x-full/);
  });

  test('5. Alur Upload CV Non-blocking dan Status Feedback Pipeline Terstruktur', async ({ page }) => {
    await page.goto('/');

    // Buka akses alur dengan Golden Dataset
    const goldenBtn = page.getByRole('button', { name: /Golden Dataset/i });
    await expect(goldenBtn).toBeVisible({ timeout: 15000 });
    await goldenBtn.click();

    // Navigasi ke Step 3 (Unggah Berkas CV) via stepper
    const uploadStepBtn = page.getByRole('button', { name: /Unggah Berkas CV/i });
    await expect(uploadStepBtn).toBeVisible();
    await uploadStepBtn.click();

    // Verifikasi heading dan area drop zone
    await expect(page.getByRole('heading', { name: /Unggah Berkas CV & Pipeline Ingestion/i })).toBeVisible();
    await expect(page.getByText('PDF (.pdf)')).toBeVisible();
    await expect(page.getByText('DOCX (.docx)')).toBeVisible();
    await expect(page.getByText('ZIP (.zip arsip batch)')).toBeVisible();

    // Verifikasi legenda status terlihat
    await expect(page.getByText('Status:', { exact: true })).toBeVisible();
    await expect(page.getByText('Diterima (Antrean)').first()).toBeVisible();
    await expect(page.getByText('Memproses Teks & Embedding').first()).toBeVisible();
    await expect(page.getByText('Siap (READY)').first()).toBeVisible();

    // Intercept upload API endpoint untuk mock 202 non-blocking
    await page.route('**/api/v1/jobs/*/cvs', async (route) => {
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-id',
          files: [
            { id: 'doc-1', filename: 'kandidat_alif.pdf', status: 'RECEIVED' },
            { id: 'doc-2', filename: 'kandidat_budi.docx', status: 'PROCESSING' },
          ],
        }),
      });
    });

    // Intercept status polling endpoint
    await page.route('**/api/v1/jobs/*/cvs/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          job_id: 'test-job-id',
          documents: [
            { id: 'doc-1', filename: 'kandidat_alif.pdf', size_bytes: 145000, status: 'READY', reasons: ['Ekstraksi teks selesai'] },
            { id: 'doc-2', filename: 'kandidat_budi.docx', size_bytes: 98000, status: 'READY', reasons: ['Ekstraksi teks selesai'] },
          ],
        }),
      });
    });

    // Upload berkas via input file tersembunyi
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Tarik & letakkan berkas CV ke sini/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      {
        name: 'kandidat_alif.pdf',
        mimeType: 'application/pdf',
        buffer: (globalThis as any).Buffer.from('PDF test content'),
      },
      {
        name: 'kandidat_budi.docx',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        buffer: (globalThis as any).Buffer.from('DOCX test content'),
      },
    ]);

    // Verifikasi berkas muncul di daftar tabel dan status terupdate
    await expect(page.getByText('kandidat_alif.pdf')).toBeVisible();
    await expect(page.getByText('kandidat_budi.docx')).toBeVisible();

    // Verifikasi tombol screening aktif dengan info jumlah CV siap
    const startScreeningBtn = page.getByRole('button', { name: /Mulai Screening AI & Buka Workbench/i });
    await expect(startScreeningBtn).toBeEnabled();
    await expect(startScreeningBtn).toContainText('CV Siap');
  });

  test('6. Ketahanan Upload CV: Auto-retry pada 401 Unauthorized dan Pelaporan Error Spesifik', async ({ page }) => {
    await page.goto('/');

    // Buka akses alur dengan Golden Dataset
    const goldenBtn = page.getByRole('button', { name: /Golden Dataset/i });
    await expect(goldenBtn).toBeVisible({ timeout: 15000 });
    await goldenBtn.click();

    // Navigasi ke Step 3 (Unggah Berkas CV)
    const uploadStepBtn = page.getByRole('button', { name: /Unggah Berkas CV/i });
    await expect(uploadStepBtn).toBeVisible();
    await uploadStepBtn.click();

    let uploadAttempts = 0;
    let authHeaderOnRetry = '';

    // Mock login endpoint untuk memastikan token baru dikembalikan saat 401
    await page.route('**/api/v1/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ access_token: 'fresh-refreshed-recruiter-token-2026' }),
      });
    });

    // Mock upload endpoint: attempt 1 returns 401 Unauthorized, attempt 2 verifies token and returns 202
    await page.route('**/api/v1/jobs/*/cvs', async (route) => {
      uploadAttempts++;
      if (uploadAttempts === 1) {
        await route.fulfill({
          status: 401,
          contentType: 'application/json',
          body: JSON.stringify({ detail: 'Token expired' }),
        });
      } else {
        authHeaderOnRetry = route.request().headers()['authorization'] || '';
        await route.fulfill({
          status: 202,
          contentType: 'application/json',
          body: JSON.stringify({
            job_id: 'test-job-id',
            files: [
              { id: 'doc-retry', filename: 'cv_retry_test.pdf', status: 'RECEIVED' },
            ],
          }),
        });
      }
    });

    // Trigger upload
    const fileChooserPromise = page.waitForEvent('filechooser');
    await page.getByText(/Tarik & letakkan berkas CV ke sini/i).click();
    const fileChooser = await fileChooserPromise;
    await fileChooser.setFiles([
      {
        name: 'cv_retry_test.pdf',
        mimeType: 'application/pdf',
        buffer: (globalThis as any).Buffer.from('PDF retry test content'),
      },
    ]);

    // Verifikasi bahwa retry terjadi dan berhasil diterima setelah refresh token
    await expect(page.getByText(/Berkas CV berhasil diterima di antrean ingestion/i)).toBeVisible();
    expect(uploadAttempts).toBe(2);
    expect(authHeaderOnRetry).toBe('Bearer fresh-refreshed-recruiter-token-2026');

    // Uji skenario error reporting: upload berkas lain yang menghasilkan 413 Payload Too Large
    await page.route('**/api/v1/jobs/*/cvs', async (route) => {
      await route.fulfill({
        status: 413,
        contentType: 'application/json',
        body: JSON.stringify({ detail: 'File size exceeds 10MB limit' }),
      });
    });

    const fileChooserPromise2 = page.waitForEvent('filechooser');
    await page.getByText(/Tarik & letakkan berkas CV ke sini/i).click();
    const fileChooser2 = await fileChooserPromise2;
    await fileChooser2.setFiles([
      {
        name: 'cv_too_large.pdf',
        mimeType: 'application/pdf',
        buffer: (globalThis as any).Buffer.from('Large PDF content'),
      },
    ]);

    // Verifikasi error spesifik 413 ditampilkan di antarmuka (tabel berkas & toast)
    await expect(page.getByText('cv_too_large.pdf')).toBeVisible();
    await expect(page.getByText(/Ukuran payload melebihi batas \(413\)/i).first()).toBeVisible();
  });

  test('7. Catatan Integritas Dokumen menampilkan penjelasan ramah manusia dalam kurung untuk setiap flag', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Muat data melalui Golden Dataset dan masuk ke Workbench
    await page.getByRole('button', { name: /Golden Dataset/i }).click();
    await page.getByRole('button', { name: /Workbench/i }).click();

    // Cari baris kandidat dengan flags (cand-11 / C-0011 / S11)
    const targetRow = page.locator('tbody tr').filter({ hasText: /C-0011|S11|Eko/i }).first();
    await expect(targetRow).toBeVisible();
    await targetRow.click();

    // Verifikasi modal dialog inspeksi terbuka
    const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
    await expect(inspectorDialog).toBeVisible();

    // Verifikasi judul blok catatan integritas
    await expect(inspectorDialog.getByText('Catatan Integritas Dokumen:')).toBeVisible();

    // Verifikasi flag dengan penjelasan dalam kurung
    await expect(
      inspectorDialog.getByText(/Flag:\s*TYPESAFE_LIVE\s*\(Diverifikasi langsung oleh AI engine resmi TypeSafe\)/i)
    ).toBeVisible();
    await expect(
      inspectorDialog.getByText(/Flag:\s*NO_EVIDENCE_FOUND\s*\(Bukti kualifikasi tidak ditemukan di teks CV\)/i)
    ).toBeVisible();
    await expect(
      inspectorDialog.getByText(/Flag:\s*DATE_YEAR_ONLY_INFERRED\s*\(Periode kerja hanya mencantumkan tahun, durasi diestimasi\)/i)
    ).toBeVisible();
    await expect(
      inspectorDialog.getByText(/Flag:\s*DATE_ANOMALY\s*\(Urutan kronologi tanggal kerja terdeteksi janggal atau tumpang tindih\)/i)
    ).toBeVisible();
    await expect(
      inspectorDialog.getByText(/Flag:\s*JEV_ROLE_FAMILY_LOW_CONFIDENCE\s*\(Judul posisi di CV kurang spesifik\/tidak lazim\)/i)
    ).toBeVisible();
  });

  test('8. Unifikasi Evaluasi Kualifikasi & Bukti CV serta pemisahan Must-Have vs Diutamakan vs Nilai Tambah', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Muat data melalui Golden Dataset dan masuk ke Workbench
    await page.getByRole('button', { name: /Golden Dataset/i }).click();
    await page.getByRole('button', { name: /Workbench/i }).click();

    // Klik kandidat pertama
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    // Verifikasi modal dialog inspeksi terbuka
    const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
    await expect(inspectorDialog).toBeVisible();

    // Pastikan section terpadu 'Evaluasi Kualifikasi & Bukti CV' ada
    await expect(inspectorDialog.getByRole('heading', { name: /Evaluasi Kualifikasi & Bukti CV/i })).toBeVisible();

    // Pastikan tidak ada duplikasi judul 'Ringkasan Eksekutif' lama
    await expect(inspectorDialog.getByRole('heading', { name: /^Ringkasan Eksekutif$/i })).toHaveCount(0);

    // Verifikasi ketiga sub-blok kualifikasi terpisah secara visual
    await expect(inspectorDialog.getByRole('heading', { name: /Kualifikasi Wajib \(Must-Have\)/i })).toBeVisible();
    await expect(inspectorDialog.getByRole('heading', { name: /Kualifikasi Diutamakan \(Strong Preference\)/i })).toBeVisible();
    await expect(inspectorDialog.getByRole('heading', { name: /Kualifikasi Nilai Tambah \(Nice-to-Have\)/i })).toBeVisible();

    // Verifikasi 4 metrik taktis pada Executive Summary Banner
    await expect(inspectorDialog.getByText('Skor Kesesuaian')).toBeVisible();
    await expect(inspectorDialog.getByText('Syarat Wajib', { exact: true }).first()).toBeVisible();
    await expect(inspectorDialog.getByText('Diutamakan', { exact: true }).first()).toBeVisible();
    await expect(inspectorDialog.getByText('Nilai Tambah', { exact: true }).first()).toBeVisible();

    // Verifikasi tombol toggle 'Buka Semua Bukti' / 'Tutup Semua Bukti'
    const toggleQuotesBtn = inspectorDialog.getByRole('button', { name: /(Buka|Tutup) Semua Bukti/i });
    await expect(toggleQuotesBtn).toBeVisible();
    await toggleQuotesBtn.click();
    await expect(inspectorDialog.getByRole('button', { name: /(Buka|Tutup) Semua Bukti/i })).toBeVisible();

    // Tutup dialog
    const closeBtn = inspectorDialog.getByTitle('Tutup Panel Inspeksi');
    await closeBtn.click();
    await expect(inspectorDialog).toHaveClass(/translate-x-full/);
  });

  test('9. Standarisasi Layout Kartu Kriteria (4 Tier Vertikal: Metadata, Deskripsi, Bobot, Bukti Verbatim)', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Muat data melalui Golden Dataset dan masuk ke Workbench
    await page.getByRole('button', { name: /Golden Dataset/i }).click();
    await page.getByRole('button', { name: /Workbench/i }).click();

    // Buka inspeksi kandidat pertama
    const firstRow = page.locator('tbody tr').first();
    await expect(firstRow).toBeVisible();
    await firstRow.click();

    const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
    await expect(inspectorDialog).toBeVisible();

    // Dapatkan kartu kriteria pertama (id diawali criterion-)
    const criterionCard = inspectorDialog.locator('[id^="criterion-"]').first();
    await expect(criterionCard).toBeVisible();

    // Baris 1: Metadata badge identitas (ID kriteria, badge importance Wajib Mutlak / Diutamakan / Nilai Tambah)
    await expect(criterionCard.locator('.font-mono.font-bold').first()).toBeVisible();
    await expect(criterionCard.getByText(/Wajib Mutlak|Diutamakan|Nilai Tambah/i).first()).toBeVisible();

    // Baris 2: Deskripsi kriteria (text-sm font-semibold)
    await expect(criterionCard.locator('.text-sm.font-semibold')).toBeVisible();

    // Baris 3: Bobot dan status pencapaian
    await expect(criterionCard.getByText(/Bobot:/i).first()).toBeVisible();
    await expect(criterionCard.getByText(/Terbukti|Perlu Dicek/i).first()).toBeVisible();

    // Baris 4: Footer bukti kutipan dan accordion
    const viewProofBtn = criterionCard.getByRole('button', { name: /Lihat Bukti Kutipan CV/i });
    if (await viewProofBtn.isVisible()) {
      await expect(criterionCard.getByText(/VERBATIM_GROUNDED|SEMANTIC MATCH/i).first()).toBeVisible();

      // Klik accordion untuk membuka kutipan
      await viewProofBtn.click();
      await expect(criterionCard.getByRole('button', { name: /Sembunyikan Kutipan CV/i })).toBeVisible();
      await expect(criterionCard.getByRole('button', { name: /Sorot di Teks CV/i })).toBeVisible();
    }

    // Tutup panel inspeksi
    const closeBtn = inspectorDialog.getByTitle('Tutup Panel Inspeksi');
    await closeBtn.click();
    await expect(inspectorDialog).toHaveClass(/translate-x-full/);
  });

  test('10. Studio Kriteria menampilkan profil peran dan membiarkan recruiter menyuntingnya', async ({ page }) => {
    await page.route('**/api/v1/requirements/compile-preview', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          requirements: [
            {
              requirement_id: 'R2',
              kind: 'EXPERIENCE_DURATION',
              description: 'Pengalaman kerja minimal 1 tahun di konstruksi sipil',
              source_text: 'minimal 1 tahun di konstruksi sipil',
              importance: 'MUST_HAVE',
              weight: 20,
              concepts: [],
              params: {
                role_profile: {
                  titles: ['pelaksana lapangan', 'quantity surveyor'],
                  domain_terms: ['pondasi', 'bekisting', 'kurva s'],
                  source: 'taxonomy+llm_proposal',
                },
              },
            },
          ],
        }),
      });
    });

    await page.goto('/');
    await page.getByRole('button', { name: /Senior Backend Engineer/i }).click();
    await page.getByRole('button', { name: /Ekstrak (Ulang|Kriteria AI)/i }).click();

    const panel = page.getByTestId('role-profile');
    await expect(panel).toBeVisible({ timeout: 15000 });
    await expect(panel.getByText('Pekerjaan yang dihitung relevan')).toBeVisible();
    await expect(panel.getByText('pelaksana lapangan')).toBeVisible();
    await expect(panel.getByText('Kamus sistem + usulan model')).toBeVisible();
    await expect(panel.getByText('bekisting')).toBeVisible();

    // recruiter edits: remove one title, add one field word
    await panel.getByRole('button', { name: 'Hapus quantity surveyor' }).click();
    await expect(panel.getByText('quantity surveyor')).toHaveCount(0);
    await panel.getByLabel(/Kata bidang/).fill('  Tiang Pancang ');
    await panel.getByLabel(/Kata bidang/).press('Enter');
    await expect(panel.getByText('tiang pancang')).toBeVisible();
    await expect(panel.getByText('Disunting recruiter')).toBeVisible();
    await panel.screenshot({ path: 'test-results/role-profile-panel.png' });
  });

  test('11. Pemilihan template peran saat lowongan memiliki CV otomatis membuat lowongan baru tanpa menimpa data lowongan lama', async ({ page }) => {
    // Intercept jobs API list endpoint
    let jobsList = [
      {
        id: 'job-backend-test',
        title: 'Senior Backend Engineer',
        cv_count: 3,
        location: 'Jakarta',
        employment_type: 'Full-time',
        jd_text: 'Deskripsi Senior Backend Engineer',
      },
    ];

    await page.route('**/api/v1/jobs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(jobsList),
        });
      } else if (route.request().method() === 'POST') {
        const payload = JSON.parse(route.request().postData() || '{}');
        const newJob = {
          id: 'job-civil-test',
          title: 'Civil Engineering Specialist',
          cv_count: 0,
          location: payload.location || 'Jakarta / Proyek Lapangan',
          employment_type: payload.employment_type || 'Penuh Waktu (Full-time)',
          jd_text: payload.jd_text || '',
        };
        jobsList = [newJob, ...jobsList];
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify(newJob),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/v1/jobs/job-backend-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-backend-test',
          title: 'Senior Backend Engineer',
          cv_count: 3,
          location: 'Jakarta',
          employment_type: 'Full-time',
          jd_text: 'Deskripsi Senior Backend Engineer',
        }),
      });
    });

    await page.route('**/api/v1/jobs/job-civil-test', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'job-civil-test',
          title: 'Civil Engineering Specialist',
          cv_count: 0,
          location: 'Jakarta / Proyek Lapangan',
          employment_type: 'Penuh Waktu (Full-time)',
          jd_text: 'Deskripsi Civil Engineering Specialist',
        }),
      });
    });

    await page.route('**/api/v1/jobs/*/requirements*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/jobs/*/cvs/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ job_id: 'test', documents: [] }),
      });
    });

    await page.route('**/api/v1/jobs/*/screenings/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.goto('/');

    // Pastikan antarmuka Setup Lowongan termuat dengan lowongan Senior Backend Engineer aktif (3 CV)
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Senior Backend Engineer');

    // Klik template pill Civil Engineering saat lowongan Backend yang memiliki CV aktif
    const civilPill = page.getByTestId('template-pill-civil_engineering');
    await expect(civilPill).toBeVisible();
    await civilPill.click();

    // Verifikasi judul input langsung berganti ke Civil Engineering Specialist
    const titleInput = page.getByLabel('Judul Lowongan Pekerjaan');
    await expect(titleInput).toHaveValue('Civil Engineering Specialist');

    // Verifikasi toast proteksi data muncul
    await expect(page.getByText(/Data lowongan sebelumnya tersimpan aman/i)).toBeVisible();

    // Verifikasi active job di Topbar sekarang adalah Civil Engineering Specialist dengan 0 CV
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Civil Engineering Specialist');

    // Buka dropdown switcher lowongan untuk memverifikasi lowongan Backend lama TIDAK tertimpa
    await page.getByTitle('Pilih Lowongan Aktif').click();
    const dropdownList = page.getByRole('listbox');
    await expect(dropdownList).toBeVisible();

    // Lowongan Senior Backend Engineer tetap ada dengan 3 CV utuh
    const backendOption = page.getByRole('option', { name: /Senior Backend Engineer.*3 CV/i });
    await expect(backendOption).toBeVisible();

    // Lowongan baru Civil Engineering Specialist ada dengan 0 CV
    const civilOption = page.getByRole('option', { name: /Civil Engineering Specialist.*0 CV/i });
    await expect(civilOption).toBeVisible();

    // Pilih kembali lowongan Senior Backend Engineer
    await backendOption.click();

    // Verifikasi tampilan kembali ke Senior Backend Engineer tanpa ada data yang rusak
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Senior Backend Engineer');
    await expect(titleInput).toHaveValue('Senior Backend Engineer');
  });

  test('12. Pemilihan template peran saat lowongan SUDAH ADA di daftar lowongan langsung switch (selectJob) tanpa membuat duplikat atau menimpa lowongan lain', async ({ page }) => {
    let jobsList = [
      {
        id: 'job-backend-test',
        title: 'Senior Backend Engineer',
        cv_count: 3,
        location: 'Jakarta',
        employment_type: 'Full-time',
        jd_text: 'Deskripsi Senior Backend Engineer',
      },
      {
        id: 'job-civil-existing',
        title: 'Civil Engineer (Struktur & Pelaksana)',
        cv_count: 1,
        location: 'Kediri, Jawa Timur',
        employment_type: 'Penuh Waktu (Full-time)',
        jd_text: 'Deskripsi Proyek Konstruksi Sipil Lapangan',
      },
    ];

    let postJobCalled = false;
    let patchBackendCalled = false;

    await page.route('**/api/v1/jobs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(jobsList),
        });
      } else if (route.request().method() === 'POST') {
        postJobCalled = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'unexpected-new-job', title: 'Unexpected' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/v1/jobs/job-backend-test', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchBackendCalled = true;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jobsList[0]),
      });
    });

    await page.route('**/api/v1/jobs/job-civil-existing', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jobsList[1]),
      });
    });

    await page.route('**/api/v1/jobs/*/requirements', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/jobs/*/screenings/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.route('**/api/v1/jobs/*/cvs/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_uploaded: 0,
          total_parsed: 0,
          pending: 0,
          ready: 0,
          failed: 0,
        }),
      });
    });

    await page.goto('/');

    // Pastikan antarmuka Setup Lowongan termuat dengan lowongan Senior Backend Engineer aktif (3 CV)
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible({ timeout: 15000 });
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Senior Backend Engineer');

    // Klik template pill Civil Engineering saat lowongan Civil Engineer sudah ada di availableJobs
    const civilPill = page.getByTestId('template-pill-civil_engineering');
    await expect(civilPill).toBeVisible();
    await civilPill.click();

    // Verifikasi toast info switch lowongan muncul
    await expect(page.getByText(/Beralih ke lowongan "Civil Engineer/i)).toBeVisible();

    // Verifikasi judul input dan topbar langsung beralih ke lowongan Civil Engineer yang sudah ada
    const titleInput = page.getByLabel('Judul Lowongan Pekerjaan');
    await expect(titleInput).toHaveValue('Civil Engineer (Struktur & Pelaksana)');
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Civil Engineer (Struktur & Pelaksana)');

    // Verifikasi bahwa sistem TIDAK membuat lowongan baru dan TIDAK menimpa lowongan Backend
    expect(postJobCalled).toBe(false);
    expect(patchBackendCalled).toBe(false);

    // Buka dropdown switcher lowongan untuk memastikan kedua lowongan tetap utuh
    await page.getByTitle('Pilih Lowongan Aktif').click();
    const dropdownList = page.getByRole('listbox');
    await expect(dropdownList).toBeVisible();

    const backendOption = page.getByRole('option', { name: /Senior Backend Engineer.*3 CV/i });
    await expect(backendOption).toBeVisible();

    const civilOption = page.getByRole('option', { name: /Civil Engineer \(Struktur & Pelaksana\).*1 CV/i });
    await expect(civilOption).toBeVisible();

    // Pilih kembali lowongan Senior Backend Engineer
    await backendOption.click();

    // Verifikasi tampilan kembali ke Senior Backend Engineer tanpa ada data yang rusak
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Senior Backend Engineer');
    await expect(titleInput).toHaveValue('Senior Backend Engineer');
  });

  test('13. Pemilihan template peran saat lowongan draf kosong (0 CV) mengisi form secara in-place tanpa membuat lowongan baru', async ({ page }) => {
    let jobsList = [
      {
        id: 'job-draft-test',
        title: 'Draft Lowongan Baru',
        cv_count: 0,
        location: '',
        employment_type: 'Full-time',
        jd_text: '',
      },
    ];

    let postJobCalled = false;
    let patchDraftCalled = false;

    await page.route('**/api/v1/jobs', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(jobsList),
        });
      } else if (route.request().method() === 'POST') {
        postJobCalled = true;
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({ id: 'unexpected-new-job', title: 'Unexpected' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.route('**/api/v1/jobs/job-draft-test', async (route) => {
      if (route.request().method() === 'PATCH') {
        patchDraftCalled = true;
        const payload = JSON.parse(route.request().postData() || '{}');
        jobsList[0] = { ...jobsList[0], ...payload };
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(jobsList[0]),
      });
    });

    await page.route('**/api/v1/jobs/*/requirements', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      });
    });

    await page.route('**/api/v1/jobs/*/screenings/latest', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(null),
      });
    });

    await page.route('**/api/v1/jobs/*/cvs/status', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_uploaded: 0,
          total_parsed: 0,
          pending: 0,
          ready: 0,
          failed: 0,
        }),
      });
    });

    await page.goto('/');

    // Pastikan antarmuka Setup Lowongan termuat dengan lowongan draft kosong
    await expect(page.getByRole('heading', { name: /Setup Lowongan Kerja/i })).toBeVisible({ timeout: 15000 });

    // Klik template pill Civil Engineering
    const civilPill = page.getByTestId('template-pill-civil_engineering');
    await expect(civilPill).toBeVisible();
    await civilPill.click();

    // Verifikasi toast info template diterapkan muncul
    await expect(page.getByText(/Template "Civil Engineering" diterapkan/i)).toBeVisible();

    // Verifikasi judul input dan topbar terisi template secara in-place
    const titleInput = page.getByLabel('Judul Lowongan Pekerjaan');
    await expect(titleInput).toHaveValue('Civil Engineer (Struktur & Pelaksana)');
    await expect(page.getByTitle('Pilih Lowongan Aktif')).toContainText('Civil Engineer (Struktur & Pelaksana)');

    // Verifikasi bahwa lowongan baru TIDAK dibuat dan patch draf in-place terpanggil
    expect(postJobCalled).toBe(false);
    expect(patchDraftCalled).toBe(true);
  });
});
