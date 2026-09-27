// Cameroon mobile numbers: 9 digits starting with 6 (e.g. 6 77 12 34 56).
export function normalizePhone(input: string): string | null {
  let d = input.replace(/\D/g, '');
  if (d.startsWith('00237')) d = d.slice(5);
  else if (d.startsWith('237') && d.length === 12) d = d.slice(3);
  return /^6\d{8}$/.test(d) ? '+237' + d : null;
}

export const isValidPin = (pin: string) => /^\d{6}$/.test(pin);
