import test from 'node:test';
import assert from 'node:assert/strict';
import { analyze, demoProject } from '../src/domain';
import { areaKey, clusterKey } from '../src/location';
import { analysisReadiness } from '../src/readiness';

test('six imported records remain stored even when none can support the valuation', () => {
  const p = demoProject();
  p.comparables.forEach((c) => {
    c.condition = 'Belum diketahui';
  });
  const before = JSON.stringify(p);
  const a = analyze(p);
  const info = analysisReadiness(p, a);
  assert.equal(info.stored, 6);
  assert.equal(info.eligible, 0);
  assert.equal(info.basis, 0);
  assert.equal(info.excluded, 6);
  assert.equal(info.exclusions[0].reason, 'Kondisi / sertifikat perlu diverifikasi');
  assert.equal(info.exclusions[0].count, 6);
  assert.ok(info.exclusions[0].facts.includes('Kondisi pada data: Belum diketahui'));
  assert.match(info.exclusions[0].guidance, /jangan menggantinya dengan tebakan/);
  assert.equal(JSON.stringify(p), before);
  assert.equal(a.suggested, null);
});

test('an area mismatch exposes both actual names without silently changing the scope', () => {
  const p = demoProject();
  p.property.area = 'Gunung Putri';
  p.comparables.forEach((c) => {
    c.area = 'Cileungsi';
  });
  const info = analysisReadiness(p, analyze(p));
  assert.equal(info.exclusions[0].reason, 'Di luar area');
  assert.equal(info.exclusions[0].count, 6);
  assert.ok(info.exclusions[0].facts.includes('Area properti Anda: Gunung Putri'));
  assert.ok(info.exclusions[0].facts.includes('Area pembanding: Cileungsi'));
  assert.equal(p.settings.mode, 'area');
  assert.equal(p.property.area, 'Gunung Putri');
});

test('administrative label variations match while distinct places do not', () => {
  assert.equal(areaKey('Kec. Gunung Putri'), areaKey('Gunung Putri'));
  assert.equal(areaKey('KECAMATAN Gunung Putri'), areaKey(' gunung putri '));
  assert.notEqual(areaKey('Gunung Putri'), areaKey('Cileungsi'));
  assert.notEqual(areaKey('Kota Wisata'), areaKey('Gunung Putri'));
  assert.equal(clusterKey('Cluster Nashville'), clusterKey('Klaster Nashville'));
  assert.equal(clusterKey('Cluster Nashville'), clusterKey('Nashville'));
  assert.notEqual(clusterKey('Nashville'), clusterKey('Kota Wisata'));
  assert.notEqual(clusterKey('Nashville'), clusterKey('Nashville 2'));
});

test('normalization restores eligibility only for equivalent labels', () => {
  const p = demoProject();
  p.property.area = 'Gunung Putri';
  p.comparables.forEach((c) => {
    c.area = 'Kec. Gunung Putri';
  });
  assert.equal(analyze(p).count, 6);
  assert.notEqual(analyze(p).suggested, null);
  p.settings.mode = 'cluster';
  p.property.cluster = 'Nashville';
  p.comparables.forEach((c) => {
    c.cluster = 'Cluster Nashville';
  });
  assert.equal(analyze(p).count, 6);
  p.comparables.forEach((c) => {
    c.cluster = 'Cluster Bellevue';
  });
  assert.equal(analyze(p).count, 0);
});

test('eligible rows and price-basis rows are distinguished when price groups cannot be combined', () => {
  const p = demoProject();
  p.comparables = p.comparables.slice(0, 3);
  p.comparables.slice(0, 2).forEach((c) => {
    c.priceType = 'Transaksi';
    c.verified = true;
  });
  const info = analysisReadiness(p, analyze(p));
  assert.equal(info.eligible, 3);
  assert.equal(info.basis, 1);
  assert.equal(info.mixedShortfall, true);
  assert.equal(info.askingCount, 1);
  assert.equal(info.transactionCount, 2);
  assert.equal(info.ready, false);
});

test('property defects are explained even if enough comparable rows qualify', () => {
  const p = demoProject();
  p.property.address = '';
  const info = analysisReadiness(p, analyze(p));
  assert.equal(info.basis, 6);
  assert.equal(info.ready, false);
  assert.equal(info.missing, 0);
  assert.ok(info.propertyIssues.some((message) => message.includes('Alamat')));
});
