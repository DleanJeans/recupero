/** Colours stored without the leading "#": 6 digits (RRGGBB), or 8 with alpha (RRGGBBAA). */
const HEX_PATTERN = /^[0-9a-f]{6}([0-9a-f]{2})?$/i;

export function isHexColor(value: string): boolean {
  return HEX_PATTERN.test(value);
}

/** "#aabbcc", "ABC" style input -> "aabbcc" (lowercase, no #), or null when it isn't a colour. */
export function normalizeHex(input: string): string | null {
  const raw = input.trim().replace(/^#/, '').toLowerCase();
  if (/^[0-9a-f]{3}$/.test(raw)) return raw.replace(/./g, c => c + c);
  return isHexColor(raw) ? raw : null;
}

export interface Hsl {
  /** 0-359 */
  h: number;
  /** 0-100 */
  s: number;
  /** 0-100 */
  l: number;
}

export function hslToHex({ h, s, l }: Hsl): string {
  const sat = s / 100;
  const light = l / 100;
  const a = sat * Math.min(light, 1 - light);
  const channel = (n: number) => {
    const k = (n + h / 30) % 12;
    const value = light - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(value * 255)
      .toString(16)
      .padStart(2, '0');
  };
  return `${channel(0)}${channel(8)}${channel(4)}`;
}

export function hexToHsl(hex: string): Hsl {
  const r = Number.parseInt(hex.slice(0, 2), 16) / 255;
  const g = Number.parseInt(hex.slice(2, 4), 16) / 255;
  const b = Number.parseInt(hex.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (d === 0) return { h: 0, s: 0, l: Math.round(l * 100) };
  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;
  return { h: Math.round((h * 60 + 360) % 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/** CSS-style colour for a stored hex ("rrggbb" or "rrggbbaa"). */
export function hexToColor(hex: string): string {
  return `#${hex}`;
}
