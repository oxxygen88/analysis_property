import test from 'node:test';
import assert from 'node:assert/strict';
import Papa from 'papaparse';
import { parseRooms, formatRooms, validRoomCounts } from '../src/rooms';
import { COMPARABLE_CSV_COLUMNS, parseComparableCsv } from '../src/comparable-csv';
import { analyze, demoProject, emptyProject, today } from '../src/domain';
import { buildPrompt, defaultPromptOptions, promptContext } from '../src/prompts';
import { reportSections } from '../src/reports';

const row = (changes = {}) => ({
  title: 'Rumah uji',
  address: 'Alamat uji',
  area: 'Pondok Aren',
  cluster: '',
  lat: '',
  lng: '',
  land: 180,
  building: 150,
  beds: '4+1',
  baths: '3+1',
  price: 2800000000,
  condition: 'Siap huni',
  certificate: 'SHM',
  source: 'Sumber uji',
  url: 'https://example.com/rumah-uji',
  observedAt: today(),
  priceType: 'Penawaran',
  ...changes,
});

test('4+1 keeps four family rooms and one staff room; simple old numbers remain valid', () => {
  assert.deepEqual(parseRooms('4+1'), { main: 4, staff: 1 });
  assert.deepEqual(parseRooms(' 4 + 1 '), { main: 4, staff: 1 });
  assert.deepEqual(parseRooms(4), { main: 4, staff: 0 });
  assert.deepEqual(parseRooms('0+1'), { main: 0, staff: 1 });
  assert.equal(formatRooms(4, 1), '4+1');
  assert.equal(formatRooms(4), '4');
  assert.equal(formatRooms(undefined), '—');
  for (const value of ['4.1', '-4', '4++1', '4+1+1', '4+', 'empat', '999999999999999999999'])
    assert.equal(parseRooms(value), null);
  assert.equal(validRoomCounts(4, -1), false);
});

test('CSV imports bedroom and bathroom staff counts without inflating family counts', () => {
  const csv = Papa.unparse([row()]);
  const result = parseComparableCsv(csv);
  assert.equal(result.error, '');
  assert.equal(result.records.length, 1);
  assert.equal(result.records[0].beds, 4);
  assert.equal(result.records[0].staffBeds, 1);
  assert.equal(result.records[0].baths, 3);
  assert.equal(result.records[0].staffBaths, 1);
  assert.equal(result.records[0].verified, false);
});

test('older CSV without bathrooms still imports, and verification cannot be claimed by AI', () => {
  const { baths, ...old } = row({ beds: '4', verified: true });
  void baths;
  const result = parseComparableCsv(Papa.unparse([old]));
  assert.equal(result.error, '');
  assert.equal(result.records[0].beds, 4);
  assert.equal(result.records[0].staffBeds, 0);
  assert.equal(result.records[0].baths, undefined);
  assert.equal(result.records[0].verified, false);
});

test('one invalid room count rejects the whole batch and empty CSV is not treated as evidence', () => {
  const result = parseComparableCsv(Papa.unparse([row(), row({ title: 'Invalid', beds: '4++1' })]));
  assert.match(result.error, /Baris 3/);
  assert.deepEqual(result.records, []);
  assert.ok(parseComparableCsv(COMPARABLE_CSV_COLUMNS.join(',')).error);
  assert.ok(parseComparableCsv('title,price\nNama,1000').error);
  assert.ok(parseComparableCsv(Papa.unparse([row({ price: 'Rp 2.8 M' })])).error);
});

test('unknown source facts remain unknown and cannot silently support a valuation', () => {
  const result = parseComparableCsv(Papa.unparse([row({ condition: '', certificate: '' })]));
  assert.equal(result.error, '');
  assert.equal(result.records[0].condition, 'Belum diketahui');
  assert.equal(result.records[0].certificate, 'Lainnya / belum diketahui');
  const p = demoProject();
  p.comparables = result.records;
  assert.equal(analyze(p).count, 0);
  assert.equal(analyze(p).suggested, null);
});

test('room notation reaches AI context, optional comparables, and shared reports consistently', () => {
  const p = demoProject();
  p.property.beds = 4;
  p.property.staffBeds = 1;
  p.property.baths = 3;
  p.property.staffBaths = 1;
  p.comparables = parseComparableCsv(Papa.unparse([row()])).records;
  const context = promptContext(p, defaultPromptOptions);
  assert.equal(context.properti.kamar_tidur, 4);
  assert.equal(context.properti.kamar_tidur_ART, 1);
  assert.equal(context.properti.kamar_tidur_notasi, '4+1');
  assert.equal(context.properti.kamar_mandi_notasi, '3+1');
  assert.equal(context.pembanding_opsional[0].kamar_tidur, 4);
  assert.equal(context.pembanding_opsional[0].kamar_tidur_ART, 1);
  const report = JSON.stringify(reportSections(p));
  assert.ok(report.includes('KT 4+1'));
  assert.ok(report.includes('KM 3+1'));
  assert.ok(report.includes('4 keluarga + 1 ART'));
});

test('research prompt uses exactly the import schema and allows unknown facts without fabricating rows', () => {
  const result = buildPrompt(emptyProject(), { ...defaultPromptOptions, goal: 'research' });
  assert.ok(result.sections[5].body.includes(COMPARABLE_CSV_COLUMNS.join(',')));
  assert.match(result.text, /RFC 4180/);
  assert.match(result.text, /header saja/);
  assert.match(result.text, /jangan menebak atau mengubah 4\+1 menjadi 5/);
  assert.match(result.text, /Belum diketahui/);
  assert.match(result.text, /bukan langsung memberikan harga jual subjek/);
});

test('180-day price prompt asks for competitive opening, negotiation and evidence without a guarantee', () => {
  const result = buildPrompt(demoProject(), { ...defaultPromptOptions, goal: 'pricing' });
  assert.match(result.sections[1].body, /180 hari/);
  assert.match(result.sections[1].body, /tanpa harga terlalu tinggi maupun terlalu rendah/);
  assert.match(result.sections[1].body, /bukan jaminan terjual/);
  assert.match(result.sections[5].body, /ruang negosiasi/);
  assert.match(result.sections[5].body, /belum cukup, jangan mengeluarkan harga final/);
});

test('shared V1 reports still omit internal seller floor and budget', () => {
  const p = demoProject();
  p.property.minimum = 2345678910;
  p.property.budget = 987654321;
  const report = JSON.stringify(reportSections(p));
  assert.ok(!report.includes('2345678910'));
  assert.ok(!report.includes('987654321'));
  assert.match(report, /SIMULASI/);
});
