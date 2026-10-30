import type { MetadataField } from '../types/behavior';
import { getCalculatedMetadataFields } from './metadata-calculation-utils';
import { roundTo2 } from './number-utils';

export interface ParsedNutrient {
  label: string;
  value: number;
  unit?: string;
}

export interface ParsedNutrition {
  /** Gram weight the nutrient values are given for. 100 when the page lists values per 100 g. */
  servingGrams?: number;
  /** Exact calories per 100 g when the page states it, which beats scaling a rounded per-serving value. */
  caloriesPer100g?: number;
  nutrients: ParsedNutrient[];
}

export interface NutritionImportResult {
  values: Record<string, string>;
  matchedFields: MetadataField[];
  unmatchedFields: MetadataField[];
  servingGrams: number;
}

const NUMBER = String.raw`(\d+(?:[.,]\d+)?)`;
const UNIT = String.raw`(kcal|kj|cal|mcg|µg|μg|ug|mg|g|iu)?(?![a-zµμ])`;
const NUTRIENT_LINE = new RegExp(String.raw`^([a-z][a-z ,()/-]{0,40}?)\s*(?:\|\s*)*${NUMBER}\s*${UNIT}`, 'i');
const VALUE_ONLY_LINE = new RegExp(String.raw`^${NUMBER}\s*${UNIT}`, 'i');
const LABEL_ONLY_LINE = /^[a-z][a-z ,()/-]{0,40}$/i;

const SERVING_GRAMS_PATTERNS = [
  // eatthismuch: "For 1 tbsp of sunflower seed kernels (9g)"
  /\bfor\s+[^()\n|]{1,80}\((\d+(?:[.,]\d+)?)\s*g\)/i,
  // "Serving size 1 cup (140 g)"
  /serving\s+size[^\n]{0,60}?\((\d+(?:[.,]\d+)?)\s*g\)/i,
  // "Serving size: 30 g"
  /serving\s+size[\s:|]*(\d+(?:[.,]\d+)?)\s*g(?![a-z])/i,
];
const PER_100G_TABLE = /(?:amount|nutrition(?:\s+facts)?|values?|nutrients?)\s+per\s+100\s*g(?![a-z])/i;
const CALORIES_PER_100G = /(\d+(?:[.,]\d+)?)\s*(?:k?cal(?:ories)?)\s+per\s+100\s*g(?![a-z])/i;

const ALIASES: Record<string, string> = {
  calorie: 'calories',
  energy: 'calories',
  kcal: 'calories',
  cal: 'calories',
  fat: 'fat',
  totalfat: 'fat',
  lipid: 'fat',
  carb: 'carbs',
  carbohydrate: 'carbs',
  totalcarbohydrate: 'carbs',
  totalcarb: 'carbs',
  netcarb: 'netcarbs',
  fibre: 'fiber',
  dietaryfiber: 'fiber',
  dietaryfibre: 'fiber',
  totalsugar: 'sugar',
  saturatedfat: 'saturatedfat',
  satfat: 'saturatedfat',
  transfat: 'transfat',
};

const SCHEMA_NUTRITION_LABELS: Record<string, string> = {
  calories: 'Calories',
  proteinContent: 'Protein',
  fatContent: 'Fat',
  saturatedFatContent: 'Saturated fat',
  transFatContent: 'Trans fat',
  unsaturatedFatContent: 'Unsaturated fat',
  carbohydrateContent: 'Carbs',
  fiberContent: 'Fiber',
  sugarContent: 'Sugar',
  sodiumContent: 'Sodium',
  cholesterolContent: 'Cholesterol',
};

const MASS_IN_GRAMS: Record<string, number> = { g: 1, mg: 1e-3, mcg: 1e-6, µg: 1e-6, μg: 1e-6, ug: 1e-6 };
const ENERGY_IN_KCAL: Record<string, number> = { kcal: 1, cal: 1, kj: 1 / 4.184 };
const GRAM_UNITS = new Set(['g', 'gr', 'gram', 'grams']);

function parseNumber(value: string): number {
  return Number(value.replace(',', '.'));
}

export function canonicalNutrientKey(label: string): string {
  const normalized = label
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z]/g, '')
    .replace(/s$/, '');
  return ALIASES[normalized] ?? normalized;
}

export function htmlToText(html: string): string {
  return html
    .replace(/<(script|style|noscript)[^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<\/t[dh]>/gi, ' | ')
    .replace(/<(br|\/tr|\/p|\/div|\/li|\/h\d|\/dt|\/dd)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&micro;|&mu;|&#181;|&#956;/gi, 'µ')
    .replace(/&amp;/gi, '&')
    .split('\n')
    .map(line => line.replace(/\s+/g, ' ').replace(/^[\s|]+|[\s|]+$/g, ''))
    .filter(Boolean)
    .join('\n');
}

function parseTextNutrients(text: string): ParsedNutrient[] {
  const lines = text.split('\n');
  const nutrients: ParsedNutrient[] = [];
  lines.forEach((line, index) => {
    const match = line.match(NUTRIENT_LINE);
    if (match) {
      nutrients.push({ label: match[1].trim(), value: parseNumber(match[2]), unit: match[3]?.toLowerCase() });
      return;
    }
    // Label and value rendered as separate blocks, e.g. <div>Protein</div><div>2g</div>
    const next = lines[index + 1];
    const valueMatch = next?.match(VALUE_ONLY_LINE);
    if (LABEL_ONLY_LINE.test(line) && valueMatch) {
      nutrients.push({ label: line.trim(), value: parseNumber(valueMatch[1]), unit: valueMatch[2]?.toLowerCase() });
    }
  });
  return nutrients;
}

function parseQuantity(value: unknown): { value: number; unit?: string } | undefined {
  if (typeof value === 'number') return { value };
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(VALUE_ONLY_LINE);
  return match ? { value: parseNumber(match[1]), unit: match[2]?.toLowerCase() } : undefined;
}

function findSchemaNutrition(node: unknown): Record<string, unknown> | undefined {
  if (!node || typeof node !== 'object') return undefined;
  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findSchemaNutrition(item);
      if (found) return found;
    }
    return undefined;
  }
  const record = node as Record<string, unknown>;
  if (record['@type'] === 'NutritionInformation') return record;
  for (const value of Object.values(record)) {
    const found = findSchemaNutrition(value);
    if (found) return found;
  }
  return undefined;
}

function parseJsonLdNutrition(html: string): ParsedNutrition | undefined {
  const scripts = html.matchAll(/<script[^>]*application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi);
  for (const [, json] of scripts) {
    let nutrition: Record<string, unknown> | undefined;
    try {
      nutrition = findSchemaNutrition(JSON.parse(json));
    } catch {
      continue;
    }
    if (!nutrition) continue;

    const nutrients = Object.entries(SCHEMA_NUTRITION_LABELS).flatMap(([property, label]) => {
      const quantity = parseQuantity(nutrition[property]);
      return quantity ? [{ label, ...quantity }] : [];
    });
    if (nutrients.length === 0) continue;

    const servingSize = typeof nutrition.servingSize === 'string' ? nutrition.servingSize : '';
    const servingMatch = servingSize.match(/(\d+(?:[.,]\d+)?)\s*g(?![a-z])/i);
    return { servingGrams: servingMatch ? parseNumber(servingMatch[1]) : undefined, nutrients };
  }
  return undefined;
}

function findServingGrams(text: string): number | undefined {
  if (PER_100G_TABLE.test(text)) return 100;
  for (const pattern of SERVING_GRAMS_PATTERNS) {
    const match = text.match(pattern);
    if (match) return parseNumber(match[1]);
  }
  return undefined;
}

export function parseNutritionHtml(html: string): ParsedNutrition {
  const text = htmlToText(html);
  const caloriesMatch = text.match(CALORIES_PER_100G);
  const caloriesPer100g = caloriesMatch ? parseNumber(caloriesMatch[1]) : undefined;

  const jsonLd = parseJsonLdNutrition(html);
  if (jsonLd) return { ...jsonLd, servingGrams: jsonLd.servingGrams ?? findServingGrams(text), caloriesPer100g };

  return { servingGrams: findServingGrams(text), caloriesPer100g, nutrients: parseTextNutrients(text) };
}

function convertUnit(value: number, fromUnit: string | undefined, toUnit: string | undefined): number {
  const from = fromUnit?.toLowerCase();
  const to = toUnit?.toLowerCase();
  if (!from || !to || from === to) return value;
  if (from in MASS_IN_GRAMS && to in MASS_IN_GRAMS) return (value * MASS_IN_GRAMS[from]) / MASS_IN_GRAMS[to];
  if (from in ENERGY_IN_KCAL && to in ENERGY_IN_KCAL) return (value * ENERGY_IN_KCAL[from]) / ENERGY_IN_KCAL[to];
  return value;
}

export function isGramAmountField(field: MetadataField | undefined): boolean {
  return GRAM_UNITS.has(field?.unit?.trim().toLowerCase() ?? '');
}

/** Converts parsed page values to per-100 g rates keyed by the category's `per100` fields. */
export function mapNutritionToMetadata(parsed: ParsedNutrition, fields: MetadataField[]): NutritionImportResult {
  const servingGrams = parsed.servingGrams;
  if (!servingGrams || servingGrams <= 0) throw new Error("Couldn't find the serving weight in grams on that page.");

  const nutrientByKey = new Map<string, ParsedNutrient>();
  for (const nutrient of parsed.nutrients) {
    const key = canonicalNutrientKey(nutrient.label);
    if (key && Number.isFinite(nutrient.value) && !nutrientByKey.has(key)) nutrientByKey.set(key, nutrient);
  }

  const values: Record<string, string> = {};
  const matchedFields: MetadataField[] = [];
  const unmatchedFields: MetadataField[] = [];
  for (const field of getCalculatedMetadataFields(fields)) {
    const key = canonicalNutrientKey(field.label);
    const nutrient = nutrientByKey.get(key);
    if (!nutrient) {
      unmatchedFields.push(field);
      continue;
    }
    const per100 =
      key === 'calories' && parsed.caloriesPer100g != null && convertUnit(1, 'kcal', field.unit) === 1
        ? parsed.caloriesPer100g
        : (convertUnit(nutrient.value, nutrient.unit, field.unit) * 100) / servingGrams;
    values[field.key] = String(roundTo2(per100));
    matchedFields.push(field);
  }

  return { values, matchedFields, unmatchedFields, servingGrams };
}

export async function fetchNutritionFromUrl(url: string, fields: MetadataField[]): Promise<NutritionImportResult> {
  const response = await fetch(url, {
    headers: {
      Accept: 'text/html,application/xhtml+xml',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36',
    },
  });
  if (!response.ok) throw new Error(`The page returned an error (${response.status}).`);
  return mapNutritionToMetadata(parseNutritionHtml(await response.text()), fields);
}
