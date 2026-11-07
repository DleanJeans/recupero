import type { MetadataField, MetadataFieldListDisplay } from '../types/behavior';

export interface MetadataDisplayValue {
  field: MetadataField;
  /** Named `amount`, not `value`: Reanimated's Babel plugin warns on `.value` inside inline styles. */
  amount: number;
  text: string;
}

export interface LogMetadataDisplay {
  big?: MetadataDisplayValue;
  bars: MetadataDisplayValue[];
  texts: MetadataDisplayValue[];
}

export function getMetadataFieldListDisplay(field: MetadataField): MetadataFieldListDisplay {
  return field.listDisplay ?? 'text';
}

/** Rounds to 1 decimal and drops a trailing ".0" (95.94 → "95.9", 9.0 → "9"). */
export function formatMetadataDisplayNumber(value: number): string {
  return String(Math.round(value * 10) / 10);
}

function toNumber(raw: string | number | undefined): number | undefined {
  if (raw == null || raw === '') return undefined;
  const value = typeof raw === 'number' ? raw : Number(raw);
  return Number.isFinite(value) ? value : undefined;
}

/**
 * Splits a log's metadata into the big value, bar segments and the muted text line,
 * following each field's listDisplay and the saved field order. Zero values are skipped
 * in the bar and text line so sparse fields (e.g. micronutrients) only show when present.
 */
export function buildLogMetadataDisplay(
  fields: MetadataField[] | undefined,
  metadata: Record<string, string | number> | undefined,
): LogMetadataDisplay {
  const display: LogMetadataDisplay = { bars: [], texts: [] };
  if (!fields || !metadata) return display;

  for (const field of fields) {
    const value = toNumber(metadata[field.key]);
    if (value == null) continue;
    const item = { field, amount: value, text: formatMetadataDisplayNumber(value) };
    const role = getMetadataFieldListDisplay(field);
    if (role === 'big') {
      if (!display.big) display.big = item;
      else if (value !== 0) display.texts.push(item);
    } else if (role === 'bar') {
      if (value > 0) display.bars.push(item);
    } else if (role === 'text') {
      if (value !== 0) display.texts.push(item);
    }
  }

  return display;
}

/** Sets a field's list display. Only one field can be big: an older big field goes back to text. */
export function setMetadataFieldListDisplay(
  fields: MetadataField[],
  index: number,
  listDisplay: MetadataFieldListDisplay,
): MetadataField[] {
  return fields.map((field, i) => {
    if (i === index) return { ...field, listDisplay: listDisplay === 'text' ? undefined : listDisplay };
    if (listDisplay === 'big' && field.listDisplay === 'big') return { ...field, listDisplay: undefined };
    return field;
  });
}
