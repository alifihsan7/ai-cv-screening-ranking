import { test, expect } from '@playwright/test';

test.describe('AI CV Screener Smoke Test', () => {
  test('harus memuat dashboard dan stepper workflow dengan benar', async ({ page }) => {
    await page.goto('/');

    // 1. Verifikasi judul tab & halaman
    await expect(page).toHaveTitle(/AI CV Screening/i);

    // 2. Verifikasi Workflow Stepper rendered
    const stepper = page.getByRole('navigation', { name: 'Workflow Stepper' });
    await expect(stepper).toBeVisible();

    // 3. Verifikasi label langkah stepper
    await expect(page.getByText('Setup Lowongan')).toBeVisible();
    await expect(page.getByText('Kriteria & Bobot')).toBeVisible();
    await expect(page.getByText('Unggah Berkas CV')).toBeVisible();
    await expect(page.getByText('Workbench Skrining')).toBeVisible();
  });

  test('dapat membuka Workbench via Golden Dataset dan memeriksa tabel kandidat', async ({ page }) => {
    await page.goto('/');

    // Klik tombol Golden Dataset di Topbar untuk preload sampel data
    const goldenDatasetBtn = page.getByRole('button', { name: /Golden Dataset/i });
    await expect(goldenDatasetBtn).toBeVisible();
    await goldenDatasetBtn.click();

    // Navigasi ke Workbench Skrining (Langkah 4)
    const workbenchStepBtn = page.getByRole('button', { name: /Workbench/i });
    await workbenchStepBtn.click();

    // Pastikan masuk ke mode Workbench
    await expect(page.getByText('Workbench Skrining')).toBeVisible();

    // Pastikan tabel kandidat ter-render (misal: header Rank / Skor)
    await expect(page.getByText(/Kandidat/i).first()).toBeVisible();
  });
});
