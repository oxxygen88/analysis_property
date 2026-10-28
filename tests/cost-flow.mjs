import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { mkdir, readFile } from 'node:fs/promises';
import { demoProject, today } from '../src/domain.ts';
import { LAND_CSV_COLUMNS } from '../src/cost.ts';

export async function runCostFlow(base) {
  await mkdir('.local/checks', { recursive: true });
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const old = demoProject();
    old.demo = false;
    old.property.title = 'Rumah uji metode biaya';
    old.property.area = 'Gunung Putri';
    old.property.cluster = 'Nashville';
    old.property.land = 153;
    old.property.building = 216;
    old.property.minimum = 0;
    old.comparables = Array.from({ length: 18 }, (_, i) => ({
      ...old.comparables[i % 6],
      id: `legacy${i}`,
      certificate: i < 9 ? 'Lainnya / belum diketahui' : 'HGB',
    }));
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1100 },
      acceptDownloads: true,
    });
    await context.addInitScript((data) => {
      if (!localStorage.getItem('ruangnilai.project.v1'))
        localStorage.setItem('ruangnilai.project.v1', JSON.stringify(data));
    }, old);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(base);
    await page
      .getByRole('heading', { name: '18 data tersimpan; harga belum dapat dihitung.', exact: true })
      .waitFor();
    await page.getByRole('button', { name: 'Atur metode tanah + bangunan', exact: true }).click();
    const panel = page.getByRole('region', { name: 'Metode tanah dan bangunan' });
    await panel.getByLabel('Sumber harga tanah', { exact: true }).selectOption('manual');
    await panel.getByLabel('Harga tanah manual (Rp/m²)', { exact: true }).fill('10000000');
    await panel
      .getByLabel('Sumber/asumsi harga tanah', { exact: true })
      .fill('Asumsi uji tanah, bukan harga pasar nyata');
    await panel.getByLabel('Biaya bangun baru (Rp/m²)', { exact: true }).fill('5000000');
    await panel
      .getByLabel('Sumber/asumsi biaya bangun', { exact: true })
      .fill('Asumsi uji kontraktor');
    await panel.getByLabel('Umur efektif bangunan (tahun)', { exact: true }).fill('10');
    await panel.getByLabel('Posisi tusuk sate', { exact: true }).selectOption('no');
    await panel.getByLabel('Risiko/riwayat banjir', { exact: true }).selectOption('no');
    await panel
      .getByLabel('Catatan dasar koreksi', { exact: true })
      .fill('PRIVATE_CORRECTION_NOTES');
    const preview = panel.getByLabel('Pratinjau perhitungan biaya', { exact: true });
    assert.ok((await preview.innerText()).includes('2.394.000.000'));
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    const stored = () =>
      page.evaluate(() => JSON.parse(localStorage.getItem('ruangnilai.project.v1')));
    assert.equal((await stored()).valuationMethod, 'cost');
    assert.equal((await stored()).comparables.length, 18);
    const nav = (name) =>
      page
        .getByRole('navigation', { name: 'Navigasi utama' })
        .getByRole('button', { name, exact: true });
    await nav('Ringkasan').click();
    assert.ok((await page.locator('.hero-price').innerText()).includes('2,39 M'));
    assert.equal(
      await page.getByRole('region', { name: 'Kesiapan analisis pembanding' }).count(),
      0,
    );
    await page.reload();
    assert.ok((await page.locator('.hero-price').innerText()).includes('2,39 M'));
    console.log(
      'PASS cost: 18 excluded house records stay intact; manual land + depreciated building yields Rp2.394bn and persists',
    );
    await nav('Analisis harga').click();
    await panel.getByLabel('Posisi tusuk sate', { exact: true }).selectOption('yes');
    await panel.getByLabel('Risiko/riwayat banjir', { exact: true }).selectOption('yes');
    assert.ok((await preview.innerText()).includes('2.047.000.000'));
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    console.log(
      'PASS cost: 5% junction and 10% flood compound on value rather than depreciating land',
    );
    await panel.getByRole('button', { name: 'Generate prompt riset tanah', exact: true }).click();
    await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
    await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
    const prompt = await page
      .getByRole('textbox', { name: 'Teks prompt lengkap', exact: true })
      .inputValue();
    assert.ok(prompt.includes(LAND_CSV_COLUMNS.join(',')));
    assert.ok(prompt.includes('# Stop Condition'));
    assert.ok(!prompt.includes('PRIVATE_CORRECTION_NOTES'));
    await page.getByRole('button', { name: 'Buka referensi tanah', exact: true }).click();
    await panel.getByLabel('Sumber harga tanah', { exact: true }).selectOption('references');
    await panel.getByRole('button', { name: 'Tempel CSV tanah', exact: true }).click();
    const csv =
      LAND_CSV_COLUMNS.join(',') +
      '\n' +
      [8e6, 10e6, 12e6]
        .map(
          (rate, i) =>
            `Kavling test ${i + 1},Kec. Gunung Putri,Nashville,,,100,${rate * 100},Belum diketahui,Sumber uji,https://example.com/land/${i + 1},${today()},Penawaran`,
        )
        .join('\n');
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('CSV tanah dari AI', { exact: true }).fill(csv);
    await dialog.getByRole('button', { name: 'Impor referensi tanah', exact: true }).click();
    await dialog.waitFor({ state: 'hidden' });
    assert.equal(await panel.locator('tbody tr').count(), 3);
    assert.ok((await preview.innerText()).includes('2.047.000.000'));
    await panel
      .getByRole('button', { name: 'Simpan & gunakan metode tanah + bangunan', exact: true })
      .click();
    assert.equal((await stored()).landReferences.length, 3);
    assert.equal((await stored()).comparables.length, 18);
    assert.ok((await stored()).landReferences.every((r) => !r.verified));
    console.log(
      'PASS cost: separate land CSV imports unknown certificates, computes mean rate and keeps legacy house prices separate',
    );
    await page.screenshot({ path: '.local/checks/cost-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    assert.ok(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
    );
    await panel.screenshot({ path: '.local/checks/cost-mobile.png' });
    await page.setViewportSize({ width: 1440, height: 1100 });
    await nav('Laporan & presentasi').click();
    const pdfPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PDF', exact: true }).click();
    const pdf = await pdfPromise;
    await pdf.saveAs('.local/checks/cost-report.pdf');
    const bytes = await readFile('.local/checks/cost-report.pdf');
    assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
    assert.ok(bytes.toString().includes('susut linear'));
    assert.ok(!bytes.toString().includes('PRIVATE_CORRECTION_NOTES'));
    const pptPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'PPTX', exact: true }).click();
    const ppt = await pptPromise;
    await ppt.saveAs('.local/checks/cost-report.pptx');
    assert.equal(
      (await readFile('.local/checks/cost-report.pptx')).subarray(0, 2).toString(),
      'PK',
    );
    await nav('Analisis harga').click();
    await panel
      .getByRole('button', { name: 'Gunakan metode pembanding rumah V1', exact: true })
      .click();
    assert.equal((await stored()).valuationMethod, 'market');
    assert.equal((await stored()).landReferences.length, 3);
    assert.deepEqual(errors, []);
    console.log(
      'PASS cost: mobile layout, real PDF/PPTX exports, private notes excluded, switching back to V1 preserves all data',
    );
  } finally {
    await browser.close();
  }
}
