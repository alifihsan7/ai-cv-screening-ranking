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
    await expect(page.getByText('Workbench Skrining')).toBeVisible();

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

    // Navigasi ke Workbench Skrining (Langkah 4)
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
  });

  test('4. Inspeksi Modal Detail Kandidat (Candidate Inspector) dan Tab Evaluasi / Telemetri', async ({ page }) => {
    await page.goto('/');

    // Muat data melalui Golden Dataset dan masuk ke Workbench
    await page.getByRole('button', { name: /Golden Dataset/i }).click();
    await page.getByRole('button', { name: /Workbench/i }).click();

    // Klik baris kandidat pertama pada tabel
    const candidateRow = page.locator('tbody tr').first();
    await expect(candidateRow).toBeVisible();
    await candidateRow.click();

    // Verifikasi modal dialog inspeksi terbuka
    const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
    await expect(inspectorDialog).toBeVisible();
    await expect(inspectorDialog).toHaveClass(/translate-x-0/);
    await expect(inspectorDialog.getByText('Skor Fit')).toBeVisible();

    // Uji navigasi tab di dalam modal inspeksi: Telemetri
    const telemetryTab = inspectorDialog.getByRole('button', { name: /Telemetri/i });
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
});
