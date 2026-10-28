import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';

const html = await readFile(new URL('../index.html', import.meta.url));
assert.ok(
  html.length > 500_000,
  'Root index must contain the compiled app, not the TSX source entry',
);
assert.ok(!html.toString().includes('src="./main.tsx"'));
await mkdir('.local/checks', { recursive: true });
const server = createServer((req, res) => {
  if (req.url === '/analysis_property/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
try {
  const hosted = `http://127.0.0.1:${server.address().port}/analysis_property/`;
  for (const [mode, url] of [
    ['file', new URL('../index.html', import.meta.url).href],
    ['pages-subpath', hosted],
  ]) {
    const context = await browser.newContext({
      acceptDownloads: true,
      viewport: { width: 1280, height: 900 },
    });
    const page = await context.newPage();
    const errors = [];
    const apiRequests = [];
    const failures = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (req) => {
      if (req.url().includes('/api/')) apiRequests.push(req.url());
    });
    page.on('requestfailed', (req) => failures.push(req.url()));
    if (mode === 'file') await context.setOffline(true);
    try {
      await page.goto(url);
    } catch (error) {
      if (mode === 'file' && String(error).includes('ERR_BLOCKED_BY_ADMINISTRATOR')) {
        console.log(
          'SKIP file: managed Chromium policy blocks file URLs; HTTP Pages-style validation still runs.',
        );
        await context.close();
        continue;
      }
      throw error;
    }
    await page.getByRole('heading', { name: 'Keputusan tepat dimulai di sini.' }).waitFor();
    await page.evaluate(() => document.fonts.ready);
    // A loaded static app must keep working without a backend or internet requests.
    await context.setOffline(true);
    assert.ok(await page.getByText('Anda sedang melihat contoh analisis.').isVisible());
    const nav = (label) =>
      page.getByRole('navigation', { name: 'Navigasi utama' }).getByRole('button', { name: label });
    await nav('Laporan & presentasi').click();
    for (const [format, signature] of [
      ['PDF', '%PDF-'],
      ['PPTX', 'PK'],
    ]) {
      const event = page.waitForEvent('download');
      await page.getByRole('button', { name: format, exact: true }).click();
      const download = await event;
      const filename = `.local/checks/${mode}.${format.toLowerCase()}`;
      await download.saveAs(filename);
      const bytes = await readFile(filename);
      assert.equal(bytes.subarray(0, signature.length).toString(), signature);
    }
    assert.equal(
      await page.getByRole('button', { name: 'Buat ringkasan AI', exact: true }).isDisabled(),
      true,
    );
    await nav('Data pembanding').click();
    assert.equal(await page.locator('tbody tr').count(), 6);
    await page.getByRole('button', { name: 'Tambah pembanding', exact: true }).click();
    await page.getByRole('dialog').getByLabel('Nama / judul iklan *').fill('Uji input lokal');
    await page.getByRole('button', { name: 'Batal', exact: true }).click();
    await nav('Ringkasan').click();
    await context.setOffline(false);
    await page.reload();
    await page.getByRole('heading', { name: 'Keputusan tepat dimulai di sini.' }).waitFor();
    assert.deepEqual(errors, []);
    assert.deepEqual(apiRequests, [], 'Static build must not request a backend');
    assert.deepEqual(
      failures,
      [],
      'All scripts, styles, fonts and exports must work without external assets',
    );
    await page.screenshot({ path: `.local/checks/${mode}.png`, fullPage: true });
    console.log(
      `PASS ${mode}: app, comparables, modal input, reload, PDF, PPTX; no backend or external asset requests`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
