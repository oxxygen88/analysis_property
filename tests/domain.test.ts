import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyze,
  dateOffset,
  demoProject,
  emptyProject,
  evaluate,
  validateCampaign,
  validateComparable,
  type Campaign,
} from '../src/domain';

test('empty project cannot produce a fabricated valuation', () => {
  const result = analyze(emptyProject());
  assert.equal(result.suggested, null);
  assert.equal(result.low, null);
  assert.ok(result.issues.length > 0);
});
test('demo has six eligible unique asking prices and an ordered indicative range', () => {
  const result = analyze(demoProject());
  assert.equal(result.count, 6);
  assert.equal(result.transactionCount, 0);
  assert.ok(result.low! <= result.suggested!);
  assert.ok(result.suggested! <= result.high!);
  assert.equal(result.confidence, 'Sedang');
});
test('duplicate cross-agent address and same URL with tracking parameters are excluded', () => {
  const p = demoProject();
  p.comparables[0].url = 'https://example.com/rumah/123?utm_source=agent1';
  p.comparables.push({ ...p.comparables[0], id: 'duplicate' });
  p.comparables.push({
    ...p.comparables[0],
    id: 'duplicate-url',
    address: 'Different address',
    url: 'https://example.com/rumah/123?utm_source=agent2',
  });
  const a = analyze(p);
  assert.equal(a.count, 6);
  assert.equal(a.rows.filter((r) => r.reason === 'Duplikat properti').length, 2);
});
test('stale, different-certificate and out-of-area records are excluded', () => {
  const p = demoProject();
  p.comparables[0].observedAt = dateOffset(-181);
  p.comparables[1].certificate = 'HGB';
  p.comparables[2].area = 'Area berbeda';
  const a = analyze(p);
  assert.equal(a.count, 3);
  assert.deepEqual(
    a.rows.slice(0, 3).map((r) => r.reason),
    ['Data lebih dari 180 hari', 'Sertifikat berbeda', 'Di luar area'],
  );
});
test('radius filter needs actual coordinate pairs, including on subject', () => {
  const p = demoProject();
  p.settings.mode = 'radius';
  p.property.lat = null;
  assert.equal(analyze(p).suggested, null);
  p.property.lat = -6.279;
  p.comparables[0].lat = null;
  p.comparables[0].lng = null;
  assert.equal(analyze(p).rows[0].reason, 'Koordinat belum tersedia');
});
test('unverified transaction prices are never treated as transactions or mixed with asking', () => {
  const p = demoProject();
  p.comparables[0].priceType = 'Transaksi';
  assert.equal(analyze(p).rows[0].reason, 'Transaksi belum diverifikasi');
  p.comparables[0].verified = true;
  assert.equal(analyze(p).count, 5);
  assert.equal(analyze(p).transactionCount, 1);
  p.comparables.slice(0, 3).forEach((c) => {
    c.priceType = 'Transaksi';
    c.verified = true;
  });
  assert.equal(analyze(p).count, 3);
  assert.equal(analyze(p).transactionCount, 3);
});
test('infinite prices, negative sizes, unsafe URLs and future dates are rejected', () => {
  const c = demoProject().comparables[0];
  for (const changes of [
    { price: Infinity },
    { land: -1 },
    { url: 'javascript:alert(1)' },
    { observedAt: dateOffset(1) },
    { observedAt: '2025-02-31' },
  ])
    assert.ok(validateComparable({ ...c, ...changes }));
});
function period(changes: Partial<Campaign> = {}): Campaign {
  return {
    id: 'test',
    start: dateOffset(-7),
    end: dateOffset(-1),
    channel: 'Test',
    price: 3e9,
    views: 0,
    chats: 0,
    scheduled: 0,
    visits: 0,
    offers: 0,
    spend: 0,
    objection: 'Belum diketahui',
    notes: '',
    ...changes,
  };
}
test('zero views does not trigger an automatic price cut', () => {
  const p = demoProject();
  p.campaigns = [period()];
  const e = evaluate(p, analyze(p));
  assert.equal(e.nextPrice, null);
  assert.match(e.title, /jangkauan/);
});
test('a tiny sample reaching 50 percent does not justify a strong conversion conclusion', () => {
  const p = demoProject();
  p.campaigns = [period({ views: 10, chats: 2, visits: 1 })];
  const e = evaluate(p, analyze(p));
  assert.equal(e.ratio, 0.5);
  assert.equal(e.nextPrice, null);
  assert.match(e.title, /terbatas/);
});
test('a supported price experiment respects the market floor and seller minimum', () => {
  const p = demoProject();
  p.campaigns = [period({ views: 500, chats: 12, visits: 1, objection: 'Harga' })];
  const e = evaluate(p, analyze(p));
  assert.ok(e.nextPrice! < p.property.asking);
  assert.ok(e.nextPrice! >= analyze(p).low!);
  p.property.minimum = 2.99e9;
  assert.equal(evaluate(p, analyze(p)).nextPrice, null);
  p.property.minimum = 0;
  p.property.asking = 2.9e9;
  assert.equal(
    evaluate(p, analyze(p)).nextPrice,
    null,
    'stale campaign price must not cut a newly changed asking price',
  );
});
test('reaching conversion target prioritizes follow-up', () => {
  const p = demoProject();
  p.campaigns = [period({ views: 200, chats: 12, visits: 6, objection: 'Harga' })];
  const e = evaluate(p, analyze(p));
  assert.match(e.title, /Pertahankan/);
  assert.equal(e.nextPrice, null);
});
test('cohorts cannot overlap or have more surveyed prospects than unique chats', () => {
  assert.match(validateCampaign(period({ visits: 1 }), []), /melebihi/);
  assert.match(validateCampaign(period(), [period()]), /tumpang tindih/);
  assert.match(validateCampaign(period({ views: -1 }), []), /nonnegatif/);
  assert.equal(validateCampaign(period({ chats: 5, visits: 2 }), []), '');
});
