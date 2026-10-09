const formatter = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Parses user input like "120.5" into satang. Returns null for empty/invalid input. */
export function parseToSatang(input: string): number | null {
  const trimmed = input.trim().replace(/,/g, '');
  if (trimmed === '') {
    return null;
  }

  const value = Number(trimmed);
  if (!Number.isFinite(value) || value < 0) {
    return null;
  }

  return Math.round(value * 100);
}

export function formatSatang(satang: number): string {
  return formatter.format(satang / 100);
}

/** For pre-filling edit inputs: 12050 -> "120.5", 0 -> "". */
export function satangToInput(satang: number): string {
  if (!satang) {
    return '';
  }
  return String(satang / 100);
}
