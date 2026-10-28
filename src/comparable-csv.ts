import Papa from 'papaparse';
import { validateComparable, type Comparable } from './domain';
import { parseRooms } from './rooms';

export const COMPARABLE_CSV_COLUMNS = [
  'title',
  'address',
  'area',
  'cluster',
  'lat',
  'lng',
  'land',
  'building',
  'beds',
  'baths',
  'price',
  'condition',
  'certificate',
  'source',
  'url',
  'observedAt',
  'priceType',
] as const;

/** Parse and validate the whole batch before committing anything to browser storage. */
export function parseComparableCsv(text: string): { records: Comparable[]; error: string } {
  const fail = (error: string) => ({ records: [] as Comparable[], error });
  if (new TextEncoder().encode(text).byteLength > 2e6) return fail('CSV maksimal 2 MB.');
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (h) => h.replace(/^\uFEFF/, '').trim(),
  });
  if (parsed.errors.length) return fail(`CSV tidak valid: ${parsed.errors[0].message}`);
  const required = [
    'title',
    'address',
    'area',
    'land',
    'building',
    'price',
    'source',
    'observedAt',
  ];
  const missing = required.filter((key) => !parsed.meta.fields?.includes(key));
  if (missing.length) return fail(`Kolom wajib belum ada: ${missing.join(', ')}.`);
  if (!parsed.data.length || parsed.data.length > 500)
    return fail('CSV harus berisi 1–500 baris data. Header saja belum berisi pembanding.');
  const num = (value: string | undefined) => (value?.trim() ? Number(value.trim()) : 0);
  const records: Comparable[] = [];
  for (const [index, row] of parsed.data.entries()) {
    const beds = parseRooms(row.beds?.trim() || '0');
    const baths = row.baths?.trim() ? parseRooms(row.baths) : undefined;
    if (!beds || baths === null)
      return fail(
        `Baris ${index + 2}: format kamar harus seperti 4 atau 4+1. Tidak ada data yang diimpor.`,
      );
    const c: Comparable = {
      id: crypto.randomUUID(),
      title: row.title?.trim() || '',
      address: row.address?.trim() || '',
      area: row.area?.trim() || '',
      cluster: row.cluster?.trim() || '',
      lat: row.lat?.trim() ? Number(row.lat) : null,
      lng: row.lng?.trim() ? Number(row.lng) : null,
      land: num(row.land),
      building: num(row.building),
      beds: beds.main,
      staffBeds: beds.staff,
      ...(baths ? { baths: baths.main, staffBaths: baths.staff } : {}),
      price: num(row.price),
      condition: (row.condition?.trim() || 'Belum diketahui') as Comparable['condition'],
      certificate: (row.certificate?.trim() ||
        'Lainnya / belum diketahui') as Comparable['certificate'],
      source: row.source?.trim() || '',
      url: row.url?.trim() || '',
      observedAt: row.observedAt?.trim() || '',
      priceType: (row.priceType?.trim() || 'Penawaran') as Comparable['priceType'],
      enabled: true,
      // Imported AI claims cannot establish independent verification, even if the CSV adds a "verified" column.
      verified: false,
    };
    const error = validateComparable(c);
    if (error) return fail(`Baris ${index + 2}: ${error} Tidak ada data yang diimpor.`);
    records.push(c);
  }
  return { records, error: '' };
}
