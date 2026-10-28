import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';
import { runHybridFlow } from './prompt-flow.mjs';
import { runReadinessFlow } from './readiness-flow.mjs';

const html = await readFile(new URL('../index.html', import.meta.url));
assert.ok(html.length > 100_000);
assert.ok(html.toString().includes('content="standalone"'));
assert.ok(!html.toString().includes('src="./main.tsx"'));
const unexpected = [];
const server = createServer((req, res) => {
  if (req.url === '/analysis_property/') {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(html);
  } else {
    unexpected.push(req.url);
    res.writeHead(404);
    res.end('Not found');
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
try {
  const url = `http://127.0.0.1:${server.address().port}/analysis_property/`;
  await runHybridFlow(url, 'hybrid-pages');
  await runReadinessFlow(url);
  assert.deepEqual(unexpected, [], 'All JS, CSS, fonts, and icons must be embedded for Pages');
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  try {
    const context = await browser.newContext();
    const page = await context.newPage();
    await page.goto(url);
    await page.getByRole('heading', { name: 'Keputusan tepat dimulai di sini.' }).waitFor();
    await context.setOffline(true);
    await page
      .getByRole('button', { name: 'Cari pembanding dengan prompt AI', exact: true })
      .click();
    await page.getByRole('button', { name: 'Generate prompt', exact: true }).click();
    await page.getByRole('tab', { name: 'Teks lengkap', exact: true }).click();
    assert.ok(
      (
        await page.getByRole('textbox', { name: 'Teks prompt lengkap', exact: true }).inputValue()
      ).includes('# Stop Condition'),
    );
    assert.ok(await page.getByRole('button', { name: 'Salin prompt', exact: true }).isEnabled());
    console.log(
      'PASS empty project can generate prompts offline without comparables, AI key, or backend',
    );
  } finally {
    await browser.close();
  }
} finally {
  await new Promise((resolve) => server.close(resolve));
}
