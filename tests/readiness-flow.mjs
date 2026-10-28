import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { demoProject } from '../src/domain.ts';

export async function runReadinessFlow(base) {
  const browser = await chromium.launch({
    executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
    headless: true,
    args: ['--no-sandbox'],
  });
  const project = demoProject();
  project.demo = false;
  project.property.area = 'Gunung Putri';
  project.comparables.forEach((c) => {
    c.area = 'Cileungsi';
  });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
    await context.addInitScript((data) => {
      if (!localStorage.getItem('ruangnilai.project.v1'))
        localStorage.setItem('ruangnilai.project.v1', JSON.stringify(data));
    }, project);
    const page = await context.newPage();
    await page.goto(base);
    await page
      .getByRole('heading', { name: '6 data tersimpan; harga belum dapat dihitung.', exact: true })
      .waitFor();
    const info = page.getByRole('region', { name: 'Kesiapan analisis pembanding' });
    assert.ok((await info.innerText()).includes('Di luar area'));
    assert.ok((await info.innerText()).includes('Area properti Anda: Gunung Putri'));
    assert.ok((await info.innerText()).includes('Area pembanding: Cileungsi'));
    assert.equal(
      await page
        .getByRole('heading', {
          name: 'Harga belum tersedia? Mulai dari data pembanding.',
          exact: true,
        })
        .count(),
      0,
    );
    await page.screenshot({ path: '.local/checks/readiness-area.png', fullPage: true });
    await page.getByRole('button', { name: 'Tinjau data pembanding', exact: true }).click();
    assert.equal(await page.locator('tbody tr').count(), 6);
    // Controlled test data represents the same district with a prefix. This verifies actual form corrections.
    for (let index = 0; index < 3; index++) {
      await page
        .getByRole('button', { name: `Ubah ${project.comparables[index].title}`, exact: true })
        .click();
      const dialog = page.getByRole('dialog');
      await dialog.getByLabel('Area / kecamatan *', { exact: true }).fill('Kec. Gunung Putri');
      await dialog.getByRole('button', { name: 'Simpan perubahan', exact: true }).click();
      await dialog.waitFor({ state: 'hidden' });
    }
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('button', { name: 'Ringkasan', exact: true })
      .click();
    assert.ok(!(await page.locator('.hero-price').innerText()).includes('Belum tersedia'));
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem('ruangnilai.project.v1')).comparables.length,
      ),
      6,
    );
    console.log(
      'PASS readiness regression: 6 stored / 0 eligible explains scope mismatch; corrected equivalent labels yield a price without deleting data',
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForFunction(
      () => document.querySelector('.sidebar').getBoundingClientRect().right <= 0,
    );
    await page.getByRole('button', { name: 'Buka navigasi', exact: true }).click();
    await page
      .getByRole('navigation', { name: 'Navigasi utama' })
      .getByRole('button', { name: 'Data pembanding', exact: true })
      .click();
    assert.equal(
      await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),
      false,
    );
    console.log('PASS readiness diagnostics fit the mobile viewport');
  } finally {
    await browser.close();
  }
}
