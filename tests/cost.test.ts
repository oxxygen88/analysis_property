import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyze,
  analyzeMarket,
  demoProject,
  emptyProject,
  today,
  dateOffset,
  type Project,
} from '../src/domain';
import {
  costValuation,
  defaultCostSettings,
  parseLandCsv,
  LAND_CSV_COLUMNS,
  type LandReference,
} from '../src/cost';
import { buildPrompt, defaultPromptOptions, promptContext, sectionNames } from '../src/prompts';
import { reportSections } from '../src/reports';

function fixture(): Project {
  const p = demoProject();
  p.demo = false;
  p.valuationMethod = 'cost';
  p.property.land = 100;
  p.property.building = 100;
  p.cost = {
    ...defaultCostSettings(),
    landMode: 'manual',
    manualLandRate: 10e6,
    manualLandSource: 'Asumsi tanah untuk uji',
    newBuildRate: 5e6,
    buildSource: 'Asumsi biaya uji',
    effectiveAge: 10,
    junction: 'no',
    flood: 'no',
  };
  return p;
}
function ref(p: Project, i: number, rate = 10e6): LandReference {
  return {
    id: `l${i}`,
    title: `Kavling unik ${i}`,
    area: p.property.area,
    cluster: p.property.cluster,
    lat: null,
    lng: null,
    land: 100,
    price: rate * 100,
    certificate: 'Belum diketahui',
    source: 'Sumber uji',
    url: `https://example.com/land/${i}`,
    observedAt: today(),
    priceType: 'Penawaran',
    verified: false,
    enabled: true,
  };
}
test('cost method is opt-in and legacy projects retain exactly the old analysis and data', () => {
  const p = demoProject();
  const before = JSON.stringify(p);
  assert.deepEqual(analyze(p), analyzeMarket(p));
  assert.equal(JSON.stringify(p), before);
  p.valuationMethod = 'cost';
  assert.equal(analyze(p).suggested, null);
  p.valuationMethod = 'market';
  assert.ok(analyze(p).suggested);
});
test('land is not depreciated; a ten-year building loses 20% of its new replacement cost', () => {
  const p = fixture(),
    before = JSON.stringify(p),
    c = costValuation(p);
  assert.equal(c.landValue, 1e9);
  assert.equal(c.buildingNew, 500e6);
  assert.equal(c.retained, 0.8);
  assert.equal(c.buildingValue, 400e6);
  assert.equal(c.suggested, 1.4e9);
  assert.equal(c.low, c.high);
  assert.equal(JSON.stringify(p), before);
  assert.equal(analyze(p).confidence, 'Simulasi asumsi');
});
test('new buildings, residual floor, zero residual and condition effects are explicit', () => {
  const p = fixture();
  p.cost!.effectiveAge = 0;
  assert.equal(costValuation(p).buildingValue, 500e6);
  p.cost!.effectiveAge = 100;
  p.cost!.annualDepreciation = 10;
  assert.equal(costValuation(p).retained, 0.2);
  assert.equal(costValuation(p).buildingValue, 100e6);
  p.cost!.conditionPercent = 50;
  assert.equal(costValuation(p).buildingValue, 50e6);
  p.cost!.residualPercent = 0;
  assert.equal(costValuation(p).buildingValue, 0);
});
test('effective age overrides calendar age; renovation never silently resets depreciation', () => {
  const p = fixture(),
    year = Number(today().slice(0, 4));
  p.property.builtYear = year - 20;
  p.property.renovationYear = year - 1;
  p.cost!.effectiveAge = null;
  assert.equal(costValuation(p).age, 20);
  assert.equal(costValuation(p).retained, 0.6);
  p.cost!.effectiveAge = 5;
  assert.equal(costValuation(p).retained, 0.9);
  assert.ok(costValuation(p).warnings.some((s) => s.includes('tidak otomatis')));
  p.cost!.effectiveAge = null;
  p.property.builtYear = year + 1;
  assert.equal(costValuation(p).suggested, null);
});
test('junction and flood factors compound on total land plus building, then strategy adjustment', () => {
  const p = fixture();
  p.cost!.junction = 'yes';
  p.cost!.flood = 'yes';
  p.cost!.saleDiscount = 5;
  const c = costValuation(p);
  assert.equal(c.positionFactor, 0.95);
  assert.equal(c.floodFactor, 0.9);
  assert.equal(c.baseValue, 1.4e9 * 0.95 * 0.9);
  assert.equal(c.suggested, Math.round((1.4e9 * 0.95 * 0.9 * 0.95) / 1e6) * 1e6);
  p.cost!.junction = 'no';
  p.cost!.flood = 'no';
  assert.equal(costValuation(p).baseValue, 1.4e9);
});
test('missing costs, sources, age, risk status and invalid coefficients cannot produce a recommendation', () => {
  assert.equal(costValuation(emptyProject()).suggested, null);
  for (const change of [
    { manualLandRate: 0 },
    { manualLandSource: '' },
    { newBuildRate: Infinity },
    { buildSource: '' },
    { effectiveAge: -1 },
    { conditionPercent: -1 },
    { annualDepreciation: NaN },
    { residualPercent: 101 },
    { junction: 'unknown' },
    { flood: 'unknown' },
    { junctionDiscount: 51 },
    { saleDiscount: -1 },
  ]) {
    const p = fixture();
    Object.assign(p.cost!, change);
    assert.equal(costValuation(p).suggested, null, JSON.stringify(change));
  }
});
test('unknown/different certificates warn on land rather than blocking a provisional cost simulation', () => {
  const p = fixture();
  p.cost!.landMode = 'references';
  p.landReferences = [ref(p, 1)];
  p.property.certificate = 'SHM';
  const c = costValuation(p);
  assert.equal(c.suggested, 1.4e9);
  assert.equal(c.basis.length, 1);
  assert.ok(c.warnings.some((s) => s.includes('Sertifikat')));
  assert.ok(c.warnings.some((s) => s.includes('Hanya 1')));
  p.property.certificate = 'Lainnya / belum diketahui';
  assert.ok(costValuation(p).suggested);
});
test('land rate uses arithmetic mean of pure-land rates; house prices are never reinterpreted', () => {
  const p = fixture();
  p.cost!.landMode = 'references';
  p.landReferences = [ref(p, 1, 8e6), ref(p, 2, 10e6), ref(p, 3, 12e6)];
  p.landReferences[1].land = 200;
  p.landReferences[1].price = 2e9;
  const c = costValuation(p);
  assert.equal(c.landRate, 10e6);
  assert.equal(c.suggested, 1.4e9);
  assert.equal(c.low, 1.2e9);
  assert.equal(c.high, 1.6e9);
  p.landReferences = [];
  assert.equal(costValuation(p).suggested, null);
  assert.equal(p.comparables.length, 6);
});
test('land filters preserve scope, freshness, duplicates and transaction verification without mixing prices', () => {
  const p = fixture();
  p.cost!.landMode = 'references';
  p.landReferences = [ref(p, 1), ref(p, 2), ref(p, 3), ref(p, 4), ref(p, 5), ref(p, 6)];
  p.landReferences[1].area = 'Other area';
  p.landReferences[2].observedAt = dateOffset(-181);
  p.landReferences[3].url = p.landReferences[0].url + '?tracking=1';
  p.landReferences[4].priceType = 'Transaksi';
  p.landReferences[5].priceType = 'Transaksi';
  p.landReferences[5].verified = true;
  p.landReferences[5].price = 800e6;
  let c = costValuation(p);
  assert.equal(c.basis.length, 1);
  assert.equal(c.landRate, 10e6);
  assert.equal(c.rows.filter((r) => r.included).length, 2);
  for (let i = 7; i < 9; i++)
    p.landReferences.push({ ...ref(p, i, 8e6), priceType: 'Transaksi', verified: true });
  c = costValuation(p);
  assert.equal(c.basis.length, 3);
  assert.equal(c.landRate, 8e6);
  p.settings.mode = 'cluster';
  p.landReferences.forEach((r) => (r.cluster = 'Other cluster'));
  assert.equal(costValuation(p).suggested, null);
  p.settings.mode = 'radius';
  assert.equal(costValuation(p).suggested, null);
});
test('manual land basis does not claim imported land was used; unsupported apartments are blocked', () => {
  const p = fixture();
  p.landReferences = [ref(p, 1)];
  assert.equal(costValuation(p).basis.length, 0);
  p.property.kind = 'Apartemen';
  assert.equal(costValuation(p).suggested, null);
  p.property.kind = 'Tanah kavling';
  p.property.building = 0;
  p.cost!.newBuildRate = 0;
  p.cost!.buildSource = '';
  p.cost!.effectiveAge = null;
  assert.equal(costValuation(p).suggested, 1e9);
});
test('land CSV schema is separate, atomic and cannot import houses or manufacture verification', () => {
  const row = `Kavling,${fixture().property.area},,,,100,1000000000,SHM,Portal,https://example.com/1,${today()},Penawaran`;
  const text = LAND_CSV_COLUMNS.join(',') + '\n' + row;
  const parsed = parseLandCsv(text);
  assert.equal(parsed.error, '');
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].verified, false);
  assert.equal(parseLandCsv(text + '\n' + row.replace(',100,', ',0,')).records.length, 0);
  assert.match(
    parseLandCsv(
      'title,area,land,price,source,observedAt,building\nHouse,A,100,2000000000,S,2020-01-01,100',
    ).error,
    /rumah/,
  );
  assert.match(parseLandCsv(LAND_CSV_COLUMNS.join(',')).error, /1–500/);
});
test('land research prompt has six sections, exact importer header and factual-data constraints', () => {
  const result = buildPrompt(fixture(), { ...defaultPromptOptions, goal: 'land' });
  assert.deepEqual(
    result.sections.map((s) => s.title),
    [...sectionNames],
  );
  assert.ok(result.text.includes(LAND_CSV_COLUMNS.join(',')));
  assert.match(result.text, /harga TOTAL tanah/);
  assert.match(result.text, /header saja/);
  assert.match(result.text, /bukan rumah/);
});
test('cost assumptions and land sources reach prompts/reports while internal notes and coordinates remain private', () => {
  const p = fixture();
  p.cost!.notes = 'PRIVATE_COST_NOTES';
  p.property.minimum = 2323232323;
  p.landReferences = [{ ...ref(p, 1), lat: -6.12345, lng: 106.12345 }];
  const context = promptContext(p, defaultPromptOptions);
  assert.ok(context.asumsi_tanah_bangunan);
  assert.equal(context.referensi_tanah_opsional.length, 1);
  assert.equal('latitude' in context.referensi_tanah_opsional[0], false);
  assert.ok(!JSON.stringify(context).includes('PRIVATE_COST_NOTES'));
  assert.equal(
    promptContext(p, { ...defaultPromptOptions, includeComparables: false })
      .referensi_tanah_opsional.length,
    0,
  );
  const report = JSON.stringify(reportSections(p));
  assert.match(report, /susut linear/);
  assert.match(report, /bukan bukti/);
  assert.ok(!report.includes('PRIVATE_COST_NOTES'));
  assert.ok(!report.includes('2323232323'));
});
