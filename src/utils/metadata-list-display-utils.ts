import type { LogEntry, MetadataField, MetadataFieldCalculation, MetadataFieldListDisplay } from '../types/behavior';

export interface MetadataDisplayValue {
  field: MetadataField;
  /** Named `amount`, not `value`: Reanimated's Babel plugin warns on `.value` inside inline styles. */
  amount: number;
  text: string;
}

export interface LogMetadataDisplay {
  big?: MetadataDisplayValue;
  /** colorIndex is the field's position among all Bar fields, so a 0 value never shifts the colours. */
  bars: (MetadataDisplayValue & { colorIndex: number })[];
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

  let barIndex = 0;
  for (const field of fields) {
    const role = getMetadataFieldListDisplay(field);
    const colorIndex = role === 'bar' ? barIndex++ : 0;
    const value = toNumber(metadata[field.key]);
    if (value == null) continue;
    const item = { field, amount: value, text: formatMetadataDisplayNumber(value) };
    if (role === 'big') {
      if (!display.big) display.big = item;
      else if (value !== 0) display.texts.push(item);
    } else if (role === 'bar') {
      if (value > 0) display.bars.push({ ...item, colorIndex });
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

export const METADATA_CALCULATION_LABELS: Record<MetadataFieldCalculation, string> = {
  manual: 'Manual',
  amount: 'Amount',
  per100: 'Per 100',
};

export const METADATA_LIST_DISPLAY_LABELS: Record<MetadataFieldListDisplay, string> = {
  big: 'Big',
  bar: 'Bar',
  text: 'Text',
  hidden: 'Hidden',
};

/** Colour of each Bar field by key, in field order (same assignment as the log card bar). */
export function getMetadataBarColors(fields: MetadataField[], palette: readonly string[]): Record<string, string> {
  const colors: Record<string, string> = {};
  let barIndex = 0;
  for (const field of fields) {
    if (getMetadataFieldListDisplay(field) === 'bar') colors[field.key] = palette[barIndex++ % palette.length];
  }
  return colors;
}

/** Latest log among the behaviors that has a value for any of the fields, for the editor's preview card. */
export function getLatestLogWithMetadata<B extends { logs: L[] }, L extends LogEntry>(
  behaviors: B[],
  fields: MetadataField[],
): { behavior: B; log: L } | undefined {
  let latest: { behavior: B; log: L } | undefined;
  for (const behavior of behaviors) {
    for (const log of behavior.logs) {
      if (latest && log.timestamp <= latest.log.timestamp) continue;
      if (fields.some(field => log.metadata?.[field.key] != null)) latest = { behavior, log };
    }
  }
  return latest;
}
