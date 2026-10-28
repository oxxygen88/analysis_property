import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import {
  demoProject,
  analyze,
  analyzeMarket,
  today,
  dateOffset,
  type Project,
} from '../src/domain';
import { defaultCostSettings, costValuation, houseResiduals } from '../src/cost';
import { parseComparableCsv } from '../src/comparable-csv';
import { buildPrompt, defaultPromptOptions, promptContext } from '../src/prompts';
import { reportSections } from '../src/reports';

function fixture(): Project {
  const p = demoProject();
  p.demo = false;
  p.valuationMethod = 'cost';
  p.campaigns = [];
  p.property.land = 100;
  p.property.building = 100;
  const year = Number(today().slice(0, 4));
  p.cost = {
    ...defaultCostSettings(),
    landMode: 'houses',
    newBuildRate: 7.5e6,
    buildSource: 'Biaya uji',
    effectiveAge: 10,
    junction: 'no',
    flood: 'no',
  };
  p.comparables = p.comparables.slice(0, 3).map((c, i) => ({
    ...c,
    land: 100,
    building: 100,
    price: 2e9 + i * 100e6,
    condition: 'Siap huni',
    builtYear: year - 10,
    newBuildRate: 7.5e6,
    buildingEstimateSource: 'Asumsi biaya uji',
    url: `https://example.com/house/${i}`,
  }));
  return p;
}
test('residual extraction subtracts depreciated building first, then divides land; component averages stay separate', () => {
  const p = fixture(),
    before = JSON.stringify(p),
    c = costValuation(p),
    r = c.houses.rows[0];
  assert.equal(r.buildingValue, 600e6);
  assert.equal(r.residualLandValue, 1.4e9);
  assert.equal(r.rate, 14e6);
  assert.equal(c.houses.landRate, 15e6);
  assert.equal(c.houses.newBuildRate, 7.5e6);
  assert.equal(c.houses.currentBuildingRate, 6e6);
  assert.equal(c.landRate, 15e6);
  assert.equal(c.suggested, 2.1e9);
  assert.equal(c.low, 2e9);
  assert.equal(c.high, 2.2e9);
  assert.equal(analyze(p).count, 3);
  assert.equal(JSON.stringify(p), before);
});
test('each house is extracted before the arithmetic mean, including different lot/building sizes', () => {
  const p = fixture();
  p.comparables[1].land = 200;
  p.comparables[1].building = 200;
  p.comparables[1].price = 3.2e9;
  const h = houseResiduals(p, p.cost!);
  assert.equal(h.rows[1].rate, 10e6);
  assert.equal(h.landRate, (14e6 + 10e6 + 16e6) / 3);
  assert.notEqual(
    h.landRate,
    p.comparables.reduce((a, c) => a + c.price, 0) / p.comparables.reduce((a, c) => a + c.land, 0),
  );
});
test('missing reference years/costs are requested rather than copied from subject or fabricated', () => {
  const p = fixture();
  p.comparables.forEach((c) => {
    delete c.builtYear;
    delete c.newBuildRate;
  });
  const before = JSON.stringify(p),
    c = costValuation(p);
  assert.equal(c.suggested, null);
  assert.equal(c.houses.basis.length, 0);
  assert.match(c.houses.rows[0].reason, /tahun bangunan/);
  assert.equal(c.houses.rows[0].estimatedYear, null);
  assert.equal(c.houses.rows[0].newRate, null);
  assert.equal(JSON.stringify(p), before);
});
test('explicit shared assumptions fill missing fields only, preserve source data and can be disabled', () => {
  const p = fixture(),
    year = Number(today().slice(0, 4));
  p.comparables[0].builtYear = year;
  p.comparables[0].newBuildRate = 5e6;
  delete p.comparables[1].builtYear;
  delete p.comparables[1].newBuildRate;
  p.cost!.useSharedHouseAssumptions = true;
  p.cost!.referenceBuiltYear = year - 10;
  p.cost!.referenceBuildRate = 7.5e6;
  p.cost!.referenceEstimateSource = 'Perkiraan yang diaktifkan pengguna';
  const before = JSON.stringify(p),
    h = houseResiduals(p, p.cost!);
  assert.equal(h.rows[0].buildingValue, 500e6);
  assert.equal(h.rows[0].usedShared, false);
  assert.equal(h.rows[1].buildingValue, 600e6);
  assert.equal(h.rows[1].usedShared, true);
  assert.equal(h.basis.length, 3);
  assert.equal(JSON.stringify(p), before);
  p.cost!.useSharedHouseAssumptions = false;
  assert.equal(houseResiduals(p, p.cost!).basis.length, 2);
});
test('unknown conditions require an explicit factor, while unknown/different legal status is a warning', () => {
  const p = fixture();
  p.comparables.forEach((c) => {
    c.condition = 'Belum diketahui';
    c.certificate = 'HGB';
  });
  assert.equal(costValuation(p).suggested, null);
  p.comparables.forEach((c) => {
    c.buildingConditionPercent = 100;
  });
  assert.equal(costValuation(p).suggested, 2.1e9);
  assert.equal(analyzeMarket(p).count, 0);
  assert.ok(costValuation(p).warnings.some((w) => w.includes('Sertifikat')));
  p.comparables.forEach((c) => {
    delete c.buildingConditionPercent;
  });
  p.cost!.useSharedHouseAssumptions = true;
  p.cost!.referenceConditionPercent = 100;
  p.cost!.referenceEstimateSource = 'Asumsi kondisi, belum inspeksi';
  assert.equal(costValuation(p).suggested, 2.1e9);
});
test('negative residuals, invalid years/costs/condition and shared assumptions without basis are excluded', () => {
  const p = fixture();
  p.comparables[0].newBuildRate = 100e6;
  let h = houseResiduals(p, p.cost!);
  assert.ok(h.rows[0].residualLandValue! < 0);
  assert.match(h.rows[0].reason, /nol\/negatif/);
  assert.equal(h.basis.length, 2);
  p.comparables[0].newBuildRate = -1;
  assert.equal(houseResiduals(p, p.cost!).rows[0].included, false);
  p.comparables[0].newBuildRate = 7.5e6;
  p.comparables[0].builtYear = Number(today().slice(0, 4)) + 1;
  assert.equal(houseResiduals(p, p.cost!).rows[0].included, false);
  p.comparables[0].builtYear = 2020;
  p.comparables[0].buildingConditionPercent = 101;
  assert.equal(houseResiduals(p, p.cost!).rows[0].included, false);
  delete p.comparables[0].builtYear;
  delete p.comparables[0].buildingConditionPercent;
  p.cost!.useSharedHouseAssumptions = true;
  p.cost!.referenceBuiltYear = 2020;
  assert.match(houseResiduals(p, p.cost!).rows[0].reason, /dasar asumsi/i);
});
test('extraction preserves location, duplicate, freshness, selection and transaction evidence filters', () => {
  const p = fixture();
  p.comparables[1].area = 'Other area';
  p.comparables[2].url = p.comparables[0].url + '?tracking=1';
  assert.equal(houseResiduals(p, p.cost!).basis.length, 1);
  p.comparables[0].observedAt = dateOffset(-181);
  assert.match(houseResiduals(p, p.cost!).rows[0].reason, /180/);
  p.comparables[0].observedAt = today();
  p.comparables[0].priceType = 'Transaksi';
  assert.equal(houseResiduals(p, p.cost!).rows[0].included, false);
  p.comparables[0].verified = true;
  assert.equal(houseResiduals(p, p.cost!).rows[0].included, true);
  p.settings.mode = 'cluster';
  p.comparables.forEach((c) => (c.cluster = 'Other cluster'));
  assert.equal(costValuation(p).suggested, null);
  p.settings.mode = 'radius';
  p.comparables.forEach((c) => {
    c.lat = null;
    c.lng = null;
  });
  assert.equal(costValuation(p).suggested, null);
});
test('transaction and asking extraction components are never averaged in one group', () => {
  const p = fixture();
  p.comparables[0].priceType = 'Transaksi';
  p.comparables[0].verified = true;
  p.comparables[0].price = 1.6e9;
  let h = houseResiduals(p, p.cost!);
  assert.equal(h.basis.length, 2);
  assert.equal(h.landRate, 15.5e6);
  const c = p.comparables[0];
  p.comparables.push(
    { ...c, id: 'txn2', address: 'Unique t2', url: 'https://example.com/t2' },
    { ...c, id: 'txn3', address: 'Unique t3', url: 'https://example.com/t3' },
  );
  h = houseResiduals(p, p.cost!);
  assert.equal(h.basis.length, 3);
  assert.equal(h.landRate, 10e6);
});
test('CSV imports optional extraction columns, preserves old CSV, and rejects an invalid optional estimate atomically', () => {
  const p = fixture();
  const csv = Papa.unparse(p.comparables.map((c) => ({ ...c, buildingConditionPercent: 100 })));
  const result = parseComparableCsv(csv);
  assert.equal(result.error, '');
  assert.equal(result.records[0].newBuildRate, 7.5e6);
  assert.equal(result.records[0].builtYear, p.comparables[0].builtYear);
  assert.equal(result.records[0].verified, false);
  assert.equal(
    parseComparableCsv(
      Papa.unparse(p.comparables.map((c, i) => ({ ...c, newBuildRate: i === 1 ? -1 : 7.5e6 }))),
    ).records.length,
    0,
  );
  const legacy = p.comparables.map((c) => {
    const { builtYear, newBuildRate, buildingEstimateSource, ...row } = c;
    void builtYear;
    void newBuildRate;
    void buildingEstimateSource;
    return row;
  });
  const old = parseComparableCsv(Papa.unparse(legacy));
  assert.equal(old.error, '');
  assert.equal(old.records[0].builtYear, undefined);
  assert.equal(old.records[0].newBuildRate, undefined);
});
test('prompts and shared reports carry the extraction method, component means and provenance without private notes', () => {
  const p = fixture();
  p.property.minimum = 2345678910;
  p.cost!.notes = 'PRIVATE_EXTRACTION_NOTES';
  const ctx = promptContext(p, defaultPromptOptions);
  assert.equal(ctx.pembanding_opsional[0].estimasi_biaya_bangun_baru_Rp_m2, 7.5e6);
  assert.equal(ctx.ringkasan_ekstraksi_opsional?.estimasi_rata_rata_tanah_Rp_m2, 15e6);
  const excluded = promptContext(p, { ...defaultPromptOptions, includeComparables: false });
  assert.equal(excluded.ringkasan_ekstraksi_opsional, null);
  assert.equal(excluded.pembanding_opsional.length, 0);
  const prompt = buildPrompt(p, { ...defaultPromptOptions, goal: 'pricing' }).text;
  assert.match(prompt, /harga total rumah - nilai bangunan/);
  assert.match(prompt, /tanyakan estimasi tahun/);
  const report = JSON.stringify(reportSections(p));
  assert.match(report, /Metode ekstraksi rumah/);
  assert.match(report, /15.000.000/);
  assert.ok(!report.includes('2345678910'));
  assert.ok(!report.includes('PRIVATE_EXTRACTION_NOTES'));
});

test('known condition categories and per-house factors take priority over shared fallback conditions', () => {
  const p = fixture();
  p.cost!.useSharedHouseAssumptions = true;
  p.cost!.referenceConditionPercent = 100;
  p.cost!.referenceEstimateSource = 'Fallback kondisi belum diketahui';
  p.comparables[0].condition = 'Perlu renovasi besar';
  let h = houseResiduals(p, p.cost!);
  assert.equal(h.rows[0].conditionPercent, 70);
  assert.equal(h.rows[0].usedShared, false);
  assert.equal(h.rows[0].conditionFromCategory, true);
  p.comparables[0].buildingConditionPercent = 80;
  h = houseResiduals(p, p.cost!);
  assert.equal(h.rows[0].conditionPercent, 80);
  assert.equal(h.rows[0].conditionFromCategory, false);
});
