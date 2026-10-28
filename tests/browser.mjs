import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:3000';
await mkdir('.local/checks', { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  acceptDownloads: true,
});
const page = await context.newPage();
const errors = [];
page.on('pageerror', (error) => errors.push(error.message));
const nav = (label) =>
  page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('button', { name: label });
async function check(name, action) {
  await action();
  console.log(`PASS ${name}`);
}
try {
  await check('health API and missing AI credentials response', async () => {
    const health = await context.request.get(`${base}/api/health`);
    assert.equal(health.status(), 200);
    const data = await health.json();
    assert.equal(data.status, 'ok');
    if (!data.aiConfigured) {
      const ai = await context.request.post(`${base}/api/summary`, { data: { facts: {} } });
      assert.equal(ai.status(), 503);
      assert.match((await ai.json()).error, /belum dikonfigurasi/);
    }
  });
  await page.goto(base);
  await page.getByRole('heading', { name: 'Keputusan tepat dimulai di sini.' }).waitFor();
  await page.evaluate(() => document.fonts.ready);
  await check('labelled simulation and desktop layout', async () => {
    assert.ok(await page.getByText('Anda sedang melihat contoh analisis.').isVisible());
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: '.local/checks/desktop.png', fullPage: true });
  });
  await check('price calculation method is visible and comparable filtering works', async () => {
    await nav('Analisis harga').click();
    await page.getByRole('button', { name: 'Lihat metode', exact: true }).click();
    await page.getByRole('heading', { name: 'Asumsi awal yang digunakan' }).waitFor();
    await nav('Data pembanding').click();
    assert.equal(await page.locator('tbody tr').count(), 6);
    await page.getByRole('textbox', { name: 'Cari pembanding' }).fill('tidak-ada');
    await page.getByRole('heading', { name: 'Pembanding tidak ditemukan' }).waitFor();
    await page.getByRole('textbox', { name: 'Cari pembanding' }).fill('');
  });
  await check('PDF is a real multi-page download', async () => {
    await nav('Laporan & presentasi').click();
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    const file = await event;
    await file.saveAs('.local/checks/report.pdf');
    const data = await readFile('.local/checks/report.pdf');
    assert.equal(data.subarray(0, 5).toString(), '%PDF-');
    assert.ok(data.length > 15_000);
  });
  await check('editable PowerPoint is a real ZIP-based PPTX download', async () => {
    const event = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PPTX', exact: true }).click();
    const file = await event;
    await file.saveAs('.local/checks/report.pptx');
    const data = await readFile('.local/checks/report.pptx');
    assert.equal(data.subarray(0, 2).toString(), 'PK');
    assert.ok(data.length > 30_000);
  });
  await check('new analysis clears simulations and accepts property form', async () => {
    await page.getByRole('button', { name: 'Analisis baru', exact: true }).click();
    await page.getByRole('button', { name: 'Mulai analisis kosong' }).click();
    await page.getByLabel('Nama properti *', { exact: true }).fill('Rumah uji BSD');
    await page
      .getByLabel('Alamat lengkap *', { exact: true })
      .fill('Alamat uji, Serpong, Tangerang Selatan');
    await page.getByLabel('Area / kecamatan *', { exact: true }).fill('Serpong');
    await page.getByLabel('Luas tanah (m²) *', { exact: true }).fill('180');
    await page.getByLabel('Luas bangunan (m²) *', { exact: true }).fill('150');
    await page.getByLabel('Kamar tidur', { exact: true }).fill('3');
    await page.getByLabel('Status sertifikat *', { exact: true }).selectOption('SHM');
    await page.getByLabel('Harga iklan saat ini (Rp)', { exact: true }).fill('3000000000');
    await page.getByRole('button', { name: 'Simpan & perbarui analisis' }).click();
    await page.getByRole('heading', { name: 'Rumah uji BSD', exact: true }).waitFor();
    assert.equal(await page.getByText('Anda sedang melihat contoh analisis.').count(), 0);
    assert.match(await page.locator('.hero-price').innerText(), /Belum tersedia/);
  });
  await check('manual comparables generate an estimate only after 3 records', async () => {
    await nav('Data pembanding').click();
    for (let i = 0; i < 3; i++) {
      await page.getByRole('button', { name: 'Tambah pembanding', exact: true }).first().click();
      const modal = page.getByRole('dialog');
      await modal.getByLabel('Nama / judul iklan *').fill(`Pembanding uji ${i + 1}`);
      await modal.getByLabel('Alamat pembanding *').fill(`Alamat unik ${i + 1}, Serpong`);
      await modal.getByLabel('Luas tanah (m²) *', { exact: true }).fill('180');
      await modal.getByLabel('Luas bangunan (m²) *', { exact: true }).fill('150');
      await modal.getByLabel('Harga (Rp) *', { exact: true }).fill(String(2.6e9 + i * 1e8));
      await modal.getByLabel('Nama sumber *').fill('Input pengujian');
      await modal.getByRole('button', { name: 'Simpan pembanding' }).click();
      await modal.waitFor({ state: 'hidden' });
    }
    assert.equal(await page.locator('tbody tr').count(), 3);
    await nav('Analisis harga').click();
    assert.match(await page.locator('.hero-price').innerText(), /Rp 2,67 M/);
  });
  await check('CSV import is validated, adds records, and excludes duplicates', async () => {
    await nav('Data pembanding').click();
    const csv = `title,address,area,land,building,beds,price,condition,certificate,source,observedAt,priceType\nCSV Rumah,Alamat CSV,Serpong,180,150,3,2800000000,Siap huni,SHM,Uji CSV,${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })},Penawaran\nCSV Duplikat,Alamat CSV,Serpong,180,150,3,2900000000,Siap huni,SHM,Uji CSV,${new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })},Penawaran`;
    await page
      .locator('input[type=file]')
      .setInputFiles({ name: 'uji.csv', mimeType: 'text/csv', buffer: Buffer.from(csv) });
    await page.getByText('Duplikat properti', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 5);
    await page.getByRole('button', { name: 'Ubah CSV Rumah', exact: true }).click();
    const editor = page.getByRole('dialog');
    await editor.getByLabel('Nama / judul iklan *').fill('CSV Rumah diperbarui');
    await editor.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
    await page.getByText('CSV Rumah diperbarui', { exact: true }).waitFor();
    assert.equal(await page.locator('tbody tr').count(), 5);
    await page.locator('input[type=file]').setInputFiles({
      name: 'invalid.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('title,address\nRusak,Data'),
    });
    await page.getByRole('alert').waitFor();
    assert.equal(await page.locator('tbody tr').count(), 5);
  });
  await check('zero-view campaign prioritizes reach over a price cut', async () => {
    await nav('Strategi penjualan').click();
    await page.getByRole('button', { name: 'Catat performa iklan', exact: true }).click();
    const modal = page.getByRole('dialog');
    await modal.getByLabel('Kanal pemasaran *').fill('Gabungan kanal pengujian');
    await modal.getByRole('button', { name: 'Simpan & evaluasi' }).click();
    await page.getByRole('heading', { name: 'Periksa jangkauan iklan terlebih dahulu' }).waitFor();
    assert.equal(await page.getByRole('button', { name: 'Setujui usulan' }).count(), 0);
  });
  await check('persisted property, comparable and campaign survive reload', async () => {
    await page.reload();
    await page.getByRole('heading', { name: 'Rumah uji BSD', exact: true }).waitFor();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('ruangnilai.project.v1')),
    );
    assert.equal(stored.demo, false);
    assert.equal(stored.comparables.length, 5);
    assert.equal(stored.campaigns.length, 1);
  });
  await check('mobile navigation and form stay within viewport', async () => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () => document.querySelector('.sidebar').getBoundingClientRect().right <= 0,
    );
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    await page.screenshot({ path: '.local/checks/mobile.png', fullPage: true });
    await page.getByRole('button', { name: 'Buka navigasi' }).click();
    await nav('Detail properti').click();
    assert.ok(await page.getByLabel('Nama properti *', { exact: true }).isVisible());
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
  });
  assert.deepEqual(errors, []);
  console.log('PASS no uncaught browser errors');
} finally {
  await browser.close();
}
