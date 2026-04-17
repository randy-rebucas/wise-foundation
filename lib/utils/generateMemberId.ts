/**
 * Generates a unique member ID in format: MBR-YYYYMM-XXXXX
 * where XXXXX is a zero-padded sequential or random number
 */
export function generateMemberId(sequence?: number): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const seq = sequence
    ? String(sequence).padStart(5, "0")
    : String(Math.floor(Math.random() * 99999)).padStart(5, "0");
  return `MBR-${year}${month}-${seq}`;
}
