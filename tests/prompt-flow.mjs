import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { demoProject, today } from '../src/domain.ts';

export async function runPromptFlow(base, screenshotName = 'prompt') {
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
  const preserved = demoProject();
  preserved.demo = false;
  preserved.property.title = 'Rumah Kota Wisata';
  preserved.property.address = 'PRIVATE_ADDRESS_NASHVILLE_25';
  preserved.property.area = 'Gunung Putri';
  preserved.property.cluster = 'Nashville, Kota Wisata';
  preserved.property.land = 153;
  preserved.property.building = 216;
  preserved.property.minimum = 2345678910;
  preserved.property.budget = 1234567;
  preserved.property.legalNotes = 'PRIVATE_LEGAL_NOTES';
  preserved.comparables = [];
  delete preserved.property.kind;
  await context.addInitScript((data) => {
    if (!localStorage.getItem('ruangnilai.project.v1'))
      localStorage.setItem('ruangnilai.project.v1', JSON.stringify(data));
  }, preserved);
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
  const fullText = () => page.getByRole('textbox', { name: 'Teks prompt lengkap', exact: true });
  async function check(name, run) {
    await run();
    console.log(`PASS ${screenshotName}: ${name}`);
  }
  try {
    await page.goto(base);
    await page.getByRole('heading', { name: 'Konteks lengkap. Prompt yang tepat.' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    await check(
      'old property and campaign data survive the new interface; no comparables required',
      async () => {
        assert.ok(
          await page.getByRole('heading', { name: 'Rumah Kota Wisata', exact: true }).isVisible(),
        );
        assert.equal(await page.getByText('Belum tersedia', { exact: true }).count(), 0);
        const data = await page.evaluate(() =>
          JSON.parse(localStorage.getItem('ruangnilai.project.v1')),
        );
        assert.equal(data.property.land, 153);
        assert.equal(data.property.building, 216);
        assert.equal(data.campaigns.length, 1);
        assert.equal(data.comparables.length, 0);
        assert.ok(
          await page.getByRole('button', { name: 'Generate prompt', exact: true }).isEnabled(),
        );
        assert.equal(
          await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
          false,
        );
        await page.screenshot({
          path: `.local/checks/${screenshotName}-desktop.png`,
          fullPage: true,
        });
      },
    );
    await check('generates six sections and a correct redacted property context', async () => {
      await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
      await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
      const text = await fullText().inputValue();
      assert.deepEqual(
        [...text.matchAll(/^# (.+)$/gm)].map((m) => m[1]),
        ['Role', 'Task', 'Context', 'Reasoning', 'Stop Condition', 'Output'],
      );
      assert.ok(text.includes('Rumah Kota Wisata'));
      assert.ok(text.includes('153'));
      assert.ok(text.includes('216'));
      for (const value of [
        'PRIVATE_ADDRESS_NASHVILLE_25',
        '2345678910',
        '1234567',
        'PRIVATE_LEGAL_NOTES',
      ])
        assert.ok(!text.includes(value));
      assert.ok(text.includes('"pembanding_opsional": []'));
    });
    await check(
      'platform, task, web option and additional notes change the actual output',
      async () => {
        await page.getByRole('button', { name: 'Claude', exact: true }).click();
        await page.getByLabel('Tujuan prompt', { exact: true }).selectOption('marketing');
        await page.getByLabel('Minta AI melakukan riset web', { exact: false }).uncheck();
        await page
          .getByLabel('Arahan tambahan (opsional)', { exact: true })
          .fill('Fokuskan rencana pada Cluster Nashville.');
        const text = await fullText().inputValue();
        assert.ok(text.includes('Claude'));
        assert.ok(text.includes('Jangan melakukan pencarian web'));
        assert.ok(text.includes('Fokuskan rencana pada Cluster Nashville.'));
        assert.ok(text.includes('151–180'));
        assert.equal(
          await page.getByRole('link', { name: 'Buka Claude' }).getAttribute('href'),
          'https://claude.ai/new',
        );
      },
    );
    await check('privacy is opt-in and exported TXT matches the preview exactly', async () => {
      await page.getByText('Pengaturan data sensitif', { exact: true }).click();
      await page.getByLabel('Sertakan alamat lengkap & koordinat', { exact: false }).check();
      await page.getByLabel('Sertakan data internal penjual', { exact: false }).check();
      const text = await fullText().inputValue();
      assert.ok(text.includes('PRIVATE_ADDRESS_NASHVILLE_25'));
      assert.ok(text.includes('2345678910'));
      assert.ok(text.includes('PRIVATE_LEGAL_NOTES'));
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Unduh TXT', exact: true }).click();
      const download = await event;
      const file = `.local/checks/${screenshotName}-prompt.txt`;
      await download.saveAs(file);
      assert.equal(await readFile(file, 'utf8'), text);
      await page.getByLabel('Sertakan alamat lengkap & koordinat', { exact: false }).uncheck();
      await page.getByLabel('Sertakan data internal penjual', { exact: false }).uncheck();
    });
    await check('clipboard denial opens a real selectable manual-copy fallback', async () => {
      await page.evaluate(() =>
        Object.defineProperty(navigator, 'clipboard', {
          configurable: true,
          value: { writeText: () => Promise.reject(new Error('Test clipboard denial')) },
        }),
      );
      const text = await fullText().inputValue();
      await page.getByRole('button', { name: 'Salin prompt', exact: true }).click();
      const modal = page.getByRole('dialog', { name: 'Salin prompt secara manual' });
      await modal.waitFor();
      const field = modal.getByRole('textbox', { name: 'Prompt untuk disalin manual' });
      assert.equal(await field.inputValue(), text);
      assert.equal(await field.evaluate((el) => el.selectionEnd - el.selectionStart), text.length);
      await modal.getByRole('button', { name: 'Selesai', exact: true }).click();
    });
    await check(
      'property form allows unknown legal status and refreshes prompt immediately',
      async () => {
        await nav('Detail properti').click();
        await page
          .getByLabel('Nama properti *', { exact: true })
          .fill('Rumah Kota Wisata diperbarui');
        await page
          .getByLabel('Status sertifikat (boleh belum diketahui)', { exact: true })
          .selectOption('Lainnya / belum diketahui');
        await page.getByRole('button', { name: 'Simpan & buat prompt', exact: true }).click();
        await page
          .getByRole('heading', { name: 'Rumah Kota Wisata diperbarui', exact: true })
          .waitFor();
        assert.ok((await fullText().inputValue()).includes('Rumah Kota Wisata diperbarui'));
      },
    );
    await check(
      'zero-view metrics enter an evaluation prompt without an automatic price recommendation',
      async () => {
        await nav('Performa pemasaran').click();
        await page.getByRole('button', { name: 'Catat performa', exact: true }).click();
        const modal = page.getByRole('dialog');
        await modal.getByLabel('Tanggal mulai *', { exact: true }).fill(today());
        await modal.getByLabel('Kanal pemasaran *', { exact: true }).fill('Gabungan kanal uji');
        await modal.getByRole('button', { name: 'Simpan periode', exact: true }).click();
        await modal.waitFor({ state: 'hidden' });
        await page.getByRole('button', { name: 'Buat prompt evaluasi', exact: true }).click();
        const text = await fullText().inputValue();
        assert.ok(text.includes('Gabungan kanal uji'));
        assert.ok(text.includes('"viewer": 0'));
        assert.ok(text.includes('bukan penurunan harga otomatis'));
        assert.equal(
          await page.getByLabel('Tujuan prompt', { exact: true }).inputValue(),
          'evaluation',
        );
      },
    );
    await check('prompt options and property data persist across reload', async () => {
      await page.reload();
      await page
        .getByRole('heading', { name: 'Rumah Kota Wisata diperbarui', exact: true })
        .waitFor();
      assert.equal(
        await page.getByLabel('Tujuan prompt', { exact: true }).inputValue(),
        'evaluation',
      );
      await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
      const text = await fullText().inputValue();
      assert.ok(text.includes('Claude'));
      assert.ok(text.includes('Gabungan kanal uji'));
      const data = await page.evaluate(() =>
        JSON.parse(localStorage.getItem('ruangnilai.project.v1')),
      );
      assert.equal(data.campaigns.length, 2);
      assert.equal(data.property.minimum, 2345678910);
    });
    await check('optional comparables and Markdown download remain available', async () => {
      await nav('Pembanding opsional').click();
      await page
        .getByRole('heading', { name: 'Mulai dengan pembanding pertama', exact: true })
        .waitFor();
      await page.getByRole('button', { name: 'Tambah pembanding', exact: true }).first().click();
      await page.getByRole('dialog').getByRole('button', { name: 'Batal', exact: true }).click();
      await nav('Generator prompt').click();
      await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
      const text = await fullText().inputValue();
      await page.getByRole('button', { name: 'Data & pengaturan', exact: true }).click();
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: 'Markdown', exact: true }).click();
      const file = await event;
      const path = `.local/checks/${screenshotName}-prompt.md`;
      await file.saveAs(path);
      assert.equal(await readFile(path, 'utf8'), text);
      await page.getByRole('button', { name: 'Tutup dialog', exact: true }).click();
    });
    await check('mobile generator and navigation fit within the viewport', async () => {
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForFunction(
        () => document.querySelector('.sidebar').getBoundingClientRect().right <= 0,
      );
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
      await page.screenshot({
        path: `.local/checks/${screenshotName}-mobile.png`,
        fullPage: true,
        animations: 'disabled',
      });
      await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
      await nav('Cara menggunakan').click();
      await page
        .getByRole('heading', { name: 'Anda membawa data. Prompt memberi arah.' })
        .waitFor();
      assert.equal(
        await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
        false,
      );
    });
    assert.deepEqual(apiRequests, [], 'The new generator must not make any backend API calls');
    assert.deepEqual(errors, []);
    console.log(`PASS ${screenshotName}: no backend API calls or uncaught browser errors`);
  } finally {
    await browser.close();
  }
}
