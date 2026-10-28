import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { demoProject, today } from '../src/domain.ts';
import { defaultCostSettings } from '../src/cost.ts';

export async function runExtractionFlow(base) {
  await mkdir('.local/checks', { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const old = demoProject(),
      year = Number(today().slice(0, 4));
    old.demo = false;
    old.valuationMethod = 'cost';
    old.campaigns = [];
    old.property.title = 'Rumah uji ekstraksi';
    old.property.area = 'Gunung Putri';
    old.property.cluster = 'Nashville';
    old.property.land = 100;
    old.property.building = 100;
    old.property.minimum = 0;
    old.cost = {
      ...defaultCostSettings(),
      landMode: 'references',
      newBuildRate: 7.5e6,
      buildSource: 'Asumsi uji biaya bangun',
      effectiveAge: 10,
      junction: 'no',
      flood: 'no',
      notes: 'PRIVATE_EXTRACTION_NOTES',
    };
    old.comparables = Array.from({ length: 18 }, (_, i) => ({
      ...old.comparables[0],
      id: `extraction-${i}`,
      title: `Rumah referensi ${i + 1}`,
      address: `Alamat uji ${i + 1}`,
      area: 'Gunung Putri',
      cluster: 'Nashville',
      land: 100,
      building: 100,
      price: 2e9 + i * 10e6,
      condition: 'Belum diketahui',
      certificate: i < 9 ? 'HGB' : 'Lainnya / belum diketahui',
      url: `https://example.com/extraction/${i + 1}`,
      observedAt: today(),
    }));
    const original = JSON.stringify(old.comparables);
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    await context.addInitScript((data) => {
      if (!localStorage.getItem('ruangnilai.project.v1'))
        localStorage.setItem('ruangnilai.project.v1', JSON.stringify(data));
    }, old);
    const page = await context.newPage(),
      errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('ruangnilai.project.v1')));
    const nav = (name) =>
      page
        .getByRole('navigation', { name: 'Navigasi utama' })
        .getByRole('button', { name, exact: true });
    await page.goto(base);
    await page.getByRole('button', { name: 'Atur metode tanah + bangunan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Metode tanah dan bangunan' });
    await panel
      .getByRole('button', { name: 'Gunakan pembanding rumah yang sudah diimpor', exact: true })
      .click();
    const extraction = page.getByLabel('Ekstraksi tanah dari pembanding rumah', { exact: true });
    assert.equal(await extraction.locator('tbody tr').count(), 18);
    assert.ok((await extraction.innerText()).includes('Isi estimasi tahun bangunan pembanding'));
    await extraction
      .getByLabel('Gunakan asumsi bersama untuk field pembanding yang kosong', { exact: true })
      .check();
    await extraction
      .getByLabel('Estimasi tahun bangunan bersama', { exact: true })
      .fill(String(year - 10));
    await extraction
      .getByLabel('Biaya bangun baru bersama (Rp/m²)', { exact: true })
      .fill('7500000');
    await extraction.getByLabel('Faktor kondisi bersama (%)', { exact: true }).fill('100');
    await extraction
      .getByLabel('Dasar asumsi bersama', { exact: true })
      .fill('Perkiraan pengguna untuk uji, bukan fakta pasar');
    const summary = extraction.getByLabel('Rata-rata hasil ekstraksi', { exact: true });
    assert.ok((await summary.innerText()).includes('14.850.000'));
    assert.ok((await summary.innerText()).includes('7.500.000'));
    assert.ok((await summary.innerText()).includes('6.000.000'));
    assert.equal(JSON.stringify((await stored()).comparables), original);
    const preview = panel.getByLabel('Pratinjau perhitungan biaya', { exact: true });
    assert.ok((await preview.innerText()).includes('2.085.000.000'));
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    assert.equal((await stored()).cost.landMode, 'houses');
    assert.equal((await stored()).comparables.length, 18);
    await nav('Ringkasan').click();
    assert.ok((await page.locator('.hero-price').innerText()).includes('2,09 M'));
    await page.reload();
    assert.equal((await stored()).cost.referenceBuildRate, 7.5e6);
    console.log(
      'PASS extraction: 18 old house records yield separate land/new-building/depreciated-building means through explicit shared assumptions, without reimport or modifying source data',
    );
    await nav('Analisis harga').click();
    await extraction
      .getByRole('button', { name: 'Lengkapi bangunan Rumah referensi 1', exact: true })
      .click();
    const dialog = page.getByRole('dialog');
    assert.equal(await page.locator('form form').count(), 0);
    await dialog
      .getByLabel('Estimasi tahun bangunan pembanding', { exact: true })
      .fill(String(year));
    await dialog
      .getByLabel('Biaya bangun baru pembanding (Rp/m²)', { exact: true })
      .fill('5000000');
    await dialog.getByLabel('Faktor kondisi pembanding (%)', { exact: true }).fill('100');
    await dialog
      .getByLabel('Dasar estimasi bangunan pembanding', { exact: true })
      .fill('Asumsi khusus rumah pertama');
    await dialog.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    const first = extraction.locator('tbody tr').first();
    assert.ok((await first.innerText()).includes('500.000.000'));
    assert.ok((await first.innerText()).includes('15.000.000'));
    assert.ok((await first.innerText()).includes('Input per rumah'));
    assert.equal((await stored()).comparables[0].builtYear, year);
    assert.equal((await stored()).comparables[0].newBuildRate, 5e6);
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    assert.ok((await preview.innerText()).includes('2.091.000.000'));
    console.log(
      'PASS extraction: per-house building year/cost overrides shared estimates; unknown certificate/condition can be retained with explicit condition factor',
    );
    await summary
      .getByRole('button', {
        name: 'Gunakan rata-rata biaya bangun untuk properti saya',
        exact: true,
      })
      .click();
    assert.ok((await preview.innerText()).includes('2.079.000.000'));
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    assert.ok(Math.abs((await stored()).cost.newBuildRate - 7361111.111111111) < 0.01);
    await page.screenshot({ path: '.local/checks/extraction-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1));
    await extraction.screenshot({ path: '.local/checks/extraction-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await nav('Laporan & presentasi').click();
    for (const [format, signature] of [
      ['PDF', '%PDF'],
      ['PPTX', 'PK'],
    ]) {
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: format, exact: true }).click();
      const file = await event;
      const target = `.local/checks/extraction-report.${format.toLowerCase()}`;
      await file.saveAs(target);
      const bytes = await readFile(target);
      assert.equal(bytes.subarray(0, signature.length).toString(), signature);
      if (format === 'PDF') {
        assert.ok(bytes.toString().includes('Metode ekstraksi rumah'));
        assert.ok(!bytes.toString().includes('PRIVATE_EXTRACTION_NOTES'));
      }
    }
    await nav('Analisis harga').click();
    await page.getByRole('button', { name: 'Generate prompt harga 180 hari', exact: true }).click();
    await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
    await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
    const text = await page
      .getByRole('textbox', { name: 'Teks prompt lengkap', exact: true })
      .inputValue();
    assert.ok(text.includes('estimasi_tahun_bangunan'));
    assert.ok(text.includes('ringkasan_ekstraksi_opsional'));
    assert.ok(!text.includes('PRIVATE_EXTRACTION_NOTES'));
    assert.deepEqual(errors, []);
    console.log(
      'PASS extraction: subject uses NEW building cost without double depreciation; mobile table scroll, real reports and AI context preserve extraction/provenance/privacy',
    );
  } finally {
    await browser.close();
  }
}
