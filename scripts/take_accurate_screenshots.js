const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Gunakan viewport lebar & tinggi agar seluruh dialog modal terlihat proporsional
  const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
  const page = await context.newPage();

  console.log("Navigasi ke http://127.0.0.1:8110/...");
  await page.goto("http://127.0.0.1:8110/");
  await page.waitForLoadState('networkidle');

  // Klik Golden Dataset
  const goldenBtn = page.getByRole('button', { name: /Golden Dataset/i }).first();
  if (await goldenBtn.isVisible()) {
    await goldenBtn.click();
    await page.waitForTimeout(1000);
  }

  // Pindah ke Step 4: Workbench
  const step4Btn = page.getByRole('button', { name: /Workbench/i }).first();
  await step4Btn.click();
  await page.waitForTimeout(1000);

  // Klik baris kandidat pertama untuk membuka Panel Inspeksi
  const candidateRow = page.locator('tbody tr').first();
  await candidateRow.click();
  await page.waitForTimeout(1000);

  const inspectorDialog = page.getByRole('dialog', { name: 'Panel Inspeksi Kandidat' });
  await inspectorDialog.waitFor({ state: 'visible' });

  // 1. Tab Evaluasi (Secara default aktif)
  console.log("Menyimpan 05_inspector_evaluation.png...");
  await page.screenshot({ path: path.join(__dirname, '../docs/images/05_inspector_evaluation.png') });

  // 2. Tab Perhitungan Skor
  console.log("Beralih ke Tab Perhitungan Skor...");
  const scoringTab = inspectorDialog.getByRole('button', { name: /Perhitungan Skor/i });
  await scoringTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, '../docs/images/06_inspector_scoring.png') });

  // 3. Tab Jejak Penalaran
  console.log("Beralih ke Tab Jejak Penalaran...");
  const trajTab = inspectorDialog.getByRole('button', { name: /Jejak Penalaran/i });
  await trajTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, '../docs/images/07_inspector_trajectory.png') });

  // 4. Tab Kutipan CV
  console.log("Beralih ke Tab Kutipan CV...");
  const groundingTab = inspectorDialog.getByRole('button', { name: /Kutipan CV/i });
  await groundingTab.click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(__dirname, '../docs/images/08_inspector_grounding.png') });

  await browser.close();
  console.log("Semua tangkapan layar 4 Tab Inspeksi BERHASIL diperbarui dengan benar!");
})();
