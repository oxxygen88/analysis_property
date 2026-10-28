// Normalize labels, not geography. Distinct districts/clusters must remain distinct.
const key = (value: string) =>
  value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '');
export function areaKey(value: string) {
  return key(value.trim().replace(/^(?:kecamatan|kec\.?)(?:\s+|$)/i, ''));
}
export function clusterKey(value: string) {
  return key(value.trim().replace(/^(?:cluster|klaster)(?:\s+|$)/i, ''));
}
