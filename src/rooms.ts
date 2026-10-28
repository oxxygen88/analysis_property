export interface RoomCount {
  main: number;
  staff: number;
}

/** Property notation: 4+1 is four family rooms plus one ART room, never five family rooms. */
export function parseRooms(value: string | number): RoomCount | null {
  const match = String(value)
    .trim()
    .match(/^(\d+)\s*(?:\+\s*(\d+))?$/);
  if (!match) return null;
  const main = Number(match[1]);
  const staff = Number(match[2] || 0);
  return Number.isSafeInteger(main) && Number.isSafeInteger(staff) ? { main, staff } : null;
}

export function formatRooms(main: number | undefined, staff: number | undefined = 0) {
  if (main === undefined || !Number.isFinite(main)) return '—';
  return (staff || 0) > 0 ? `${main}+${staff}` : String(main);
}

export function validRoomCounts(main: number, staff: number | undefined = 0) {
  return Number.isSafeInteger(main) && main >= 0 && Number.isSafeInteger(staff) && staff >= 0;
}
