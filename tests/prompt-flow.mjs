import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import Papa from 'papaparse';
import { demoProject, today } from '../src/domain.ts';
import { COMPARABLE_CSV_COLUMNS } from '../src/comparable-csv.ts';

export async function runHybridFlow(base, prefix = 'hybrid') {
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
  const old = demoProject();
  old.demo = false;
  old.property.title = 'Rumah Kota Wisata';
  old.property.address = 'PRIVATE_ADDRESS_NASHVILLE_25';
  old.property.area = 'Gunung Putri';
  old.property.cluster = 'Nashville, Kota Wisata';
  old.property.land = 153;
  old.property.building = 216;
  old.property.beds = 4;
  old.property.baths = 3;
  old.property.minimum = 2345678910;
  old.property.budget = 1234567;
  old.property.legalNotes = 'PRIVATE_LEGAL_NOTES';
  old.comparables = [];
  delete old.property.kind;
  delete old.property.staffBeds;
  delete old.property.staffBaths;
  await context.addInitScript((data) => {
    if (!localStorage.getItem('ruangnilai.project.v1'))
      localStorage.setItem('ruangnilai.project.v1', JSON.stringify(data));
  }, old);
  const page = await context.newPage();
  const errors = [];
  const apiRequests = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (new URL(request.url()).pathname.includes('/api/')) apiRequests.push(request.url());
  });
  const nav = (name) =>
    page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('button', { name, exact: true });
  const promptText = () => page.getByRole('textbox', { name: 'Teks prompt lengkap', exact: true });
  const check = async (name, run) => {
    await run();
    console.log(`PASS ${prefix}: ${name}`);
  };
  try {
    await page.goto(base);
    await page.getByRole('heading', { name: 'Keputusan tepat dimulai di sini.' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await check(
      'V1 dashboard, pricing, strategy and reports are restored without losing old property data',
      async () => {
        assert.ok(
          await page.getByRole('heading', { name: 'Rumah Kota Wisata', exact: true }).isVisible(),
        );
        for (const name of [
          'Ringkasan',
          'Detail properti',
          'Data pembanding',
          'Analisis harga',
          'Strategi penjualan',
          'Laporan & presentasi',
          'Generator prompt AI',
        ])
          assert.ok(await nav(name).isVisible());
        assert.match(await page.locator('.hero-price').innerText(), /Belum tersedia/);
        const data = await page.evaluate(() =>
          JSON.parse(localStorage.getItem('ruangnilai.project.v1')),
        );
        assert.equal(data.property.beds, 4);
        assert.equal(data.property.land, 153);
        assert.equal(data.campaigns.length, 1);
      },
    );
    await check(
      '4+1 bedrooms and 3+1 bathrooms save as separate family and ART counts',
      async () => {
        await nav('Detail properti').click();
        await page.getByLabel('Kamar tidur', { exact: true }).fill('4+1');
        await page.getByLabel('Kamar mandi', { exact: true }).fill('3+1');
        await page.getByRole('button', { name: 'Simpan & perbarui analisis', exact: true }).click();
        await page.getByRole('heading', { name: 'Rumah Kota Wisata', exact: true }).waitFor();
        const facts = await page.locator('.property-facts').innerText();
        assert.ok(facts.includes('4+1'));
        assert.ok(facts.includes('3+1'));
        const p = await page.evaluate(
          () => JSON.parse(localStorage.getItem('ruangnilai.project.v1')).property,
        );
        assert.equal(p.beds, 4);
        assert.equal(p.staffBeds, 1);
        assert.equal(p.baths, 3);
        assert.equal(p.staffBaths, 1);
      },
    );
    await check(
      'research prompt can be generated without comparables and specifies the exact CSV schema',
      async () => {
        await page
          .getByRole('button', { name: 'Cari pembanding dengan prompt AI', exact: true })
          .click();
        assert.equal(
          await page.getByLabel('Tujuan prompt', { exact: true }).inputValue(),
          'research',
        );
        await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
        await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
        const text = await promptText().inputValue();
        assert.deepEqual(
          [...text.matchAll(/^# (.+)$/gm)].map((m) => m[1]),
          ['Role', 'Task', 'Context', 'Reasoning', 'Stop Condition', 'Output'],
        );
        assert.ok(text.includes(COMPARABLE_CSV_COLUMNS.join(',')));
        assert.ok(text.includes('"kamar_tidur": 4'));
        assert.ok(text.includes('"kamar_tidur_ART": 1'));
        for (const value of [
          'PRIVATE_ADDRESS_NASHVILLE_25',
          '2345678910',
          '1234567',
          'PRIVATE_LEGAL_NOTES',
        ])
          assert.ok(!text.includes(value));
        await page.getByRole('button', { name: 'Claude', exact: true }).click();
        assert.ok((await promptText().inputValue()).includes('Claude'));
        const event = page.waitForEvent('download');
        await page.getByRole('button', { name: 'Unduh TXT', exact: true }).click();
        const file = await event;
        await file.saveAs(`.local/checks/${prefix}-research.txt`);
        assert.equal(
          await readFile(`.local/checks/${prefix}-research.txt`, 'utf8'),
          await promptText().inputValue(),
        );
      },
    );
    await check('copy has a selectable fallback when clipboard permission is denied', async () => {
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('Test denial')) },
        }),
      );
      const text = await promptText().inputValue();
      await page.getByRole('button', { name: 'Salin prompt', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Salin prompt secara manual', exact: true });
      await modal.waitFor();
      assert.equal(
        await modal
          .getByRole('textbox', { name: 'Prompt untuk disalin manual', exact: true })
          .inputValue(),
        text,
      );
      await modal.getByRole('button', { name: 'Selesai', exact: true }).click();
      await page.getByRole('button', { name: 'Buka data pembanding', exact: true }).click();
    });
    const rows = [0, 1, 2].map((i) => ({
      title: `Pembanding UJI ${i + 1}`,
      address: `Alamat UJI ${i + 1}`,
      area: 'Gunung Putri',
      cluster: 'Nashville, Kota Wisata',
      lat: '',
      lng: '',
      land: 153,
      building: 216,
      beds: '4+1',
      baths: '3+1',
      price: 2750000000 + i * 100000000,
      condition: 'Siap huni',
      certificate: 'SHM',
      source: 'Data pengujian, bukan iklan nyata',
      url: `https://example.com/test-house-${i}`,
      observedAt: today(),
      priceType: 'Penawaran',
    }));
    await check('pasted AI CSV is atomic, supports 4+1/3+1 and remains unverified', async () => {
      await page.getByRole('button', { name: 'Tempel CSV dari AI', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Tempel CSV dari AI', exact: true });
      await modal
        .getByRole('textbox', { name: 'CSV pembanding dari AI', exact: true })
        .fill(Papa.unparse([rows[0], { ...rows[1], beds: '4++1' }]));
      await modal.getByRole('button', { name: 'Impor data CSV', exact: true }).click();
      await modal.getByRole('alert').waitFor();
      assert.equal(
        await page.evaluate(
          () => JSON.parse(localStorage.getItem('ruangnilai.project.v1')).comparables.length,
        ),
        0,
      );
      await modal
        .getByRole('textbox', { name: 'CSV pembanding dari AI', exact: true })
        .fill(Papa.unparse(rows));
      await modal.getByRole('button', { name: 'Impor data CSV', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      assert.equal(await page.locator('tbody tr').count(), 3);
      assert.ok((await page.locator('tbody').innerText()).includes('KT 4+1 · KM 3+1'));
      const records = await page.evaluate(
        () => JSON.parse(localStorage.getItem('ruangnilai.project.v1')).comparables,
      );
      assert.equal(records[0].beds, 4);
      assert.equal(records[0].staffBeds, 1);
      assert.equal(records[0].baths, 3);
      assert.equal(records[0].staffBaths, 1);
      assert.equal(records[0].verified, false);
    });
    await check(
      'V1 calculates a local estimate after import and data survives a reload',
      async () => {
        await page.reload();
        await page.getByRole('heading', { name: 'Rumah Kota Wisata', exact: true }).waitFor();
        assert.match(await page.locator('.hero-price').innerText(), /Rp 2,82 M/);
        assert.ok((await page.locator('.property-facts').innerText()).includes('4+1'));
        await nav('Analisis harga').click();
        await page.getByRole('button', { name: 'Lihat metode', exact: true }).click();
        await page
          .getByRole('heading', { name: 'Asumsi awal yang digunakan', exact: true })
          .waitFor();
      },
    );
    await check(
      'dedicated 180-day price prompt contains comparables, separate ART counts, and no automatic price change',
      async () => {
        await page
          .getByRole('button', { name: 'Generate prompt harga 180 hari', exact: true })
          .click();
        assert.equal(
          await page.getByLabel('Tujuan prompt', { exact: true }).inputValue(),
          'pricing',
        );
        await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
        const text = await promptText().inputValue();
        assert.ok(text.includes('180 hari'));
        assert.ok(text.includes('bukan jaminan terjual'));
        assert.ok(text.includes('ruang negosiasi'));
        assert.ok(text.includes('Pembanding UJI 1'));
        assert.ok(text.includes('"kamar_tidur_notasi": "4+1"'));
        assert.ok(!text.includes('2345678910'));
        assert.equal(
          await page.evaluate(
            () => JSON.parse(localStorage.getItem('ruangnilai.project.v1')).property.asking,
          ),
          3000000000,
        );
      },
    );
    await check('V1 marketing evaluation remains functional', async () => {
      await nav('Strategi penjualan').click();
      await page.getByRole('button', { name: 'Catat performa iklan', exact: true }).click();
      const modal = page.getByRole('dialog');
      await modal.getByLabel('Tanggal mulai *', { exact: true }).fill(today());
      await modal.getByLabel('Kanal pemasaran *', { exact: true }).fill('Gabungan kanal uji');
      await modal.getByRole('button', { name: 'Simpan periode', exact: true }).click();
      await modal.waitFor({ state: 'hidden' });
      await page
        .getByRole('heading', { name: 'Periksa jangkauan iklan terlebih dahulu', exact: true })
        .waitFor();
    });
    await check(
      'PDF and PowerPoint exports are restored and include the new room notation',
      async () => {
        await nav('Laporan & presentasi').click();
        for (const [format, signature] of [
          ['PDF', '%PDF-'],
          ['PPTX', 'PK'],
        ]) {
          const event = page.waitForEvent('download');
          await page.getByRole('button', { name: format, exact: true }).click();
          const file = await event;
          const path = `.local/checks/${prefix}-report.${format.toLowerCase()}`;
          await file.saveAs(path);
          const bytes = await readFile(path);
          assert.equal(bytes.subarray(0, signature.length).toString(), signature);
          if (format === 'PDF') {
            assert.ok(bytes.toString('latin1').includes('4+1'));
            assert.ok(bytes.toString('latin1').includes('3+1'));
            assert.ok(!bytes.toString('latin1').includes('2345678910'));
          }
        }
        await nav('Ringkasan').click();
        await page.screenshot({ path: `.local/checks/${prefix}-desktop.png`, fullPage: true });
      },
    );
    await check(
      'mobile V1 dashboard and integrated prompt navigation fit the viewport',
      async () => {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.waitForFunction(
          () => document.querySelector('.sidebar').getBoundingClientRect().right <= 0,
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await page.screenshot({
          path: `.local/checks/${prefix}-mobile.png`,
          fullPage: true,
          animations: 'disabled',
        });
        await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
        await nav('Generator prompt AI').click();
        await page.getByRole('button', { name: 'Generate prompt', exact: true }).waitFor();
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
      },
    );
    assert.deepEqual(apiRequests, []);
    assert.deepEqual(errors, []);
    console.log(`PASS ${prefix}: no AI API calls or browser errors`);
  } finally {
    await browser.close();
  }
}
