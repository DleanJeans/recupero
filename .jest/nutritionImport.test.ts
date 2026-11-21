import type { MetadataField } from '../src/types/behavior';
import {
  canonicalNutrientKey,
  isGramAmountField,
  mapNutritionToMetadata,
  parseFoodSearchHtml,
  parseNutritionHtml,
} from '../src/utils/nutrition-import-utils';

const fields: MetadataField[] = [
  { key: 'field_1', label: 'Weight', unit: 'g', calculation: 'amount' },
  { key: 'field_2', label: 'Calories', unit: 'kcal', calculation: 'per100' },
  { key: 'field_3', label: 'Protein', unit: 'g', calculation: 'per100' },
  { key: 'field_4', label: 'Fat', unit: 'g', calculation: 'per100' },
  { key: 'field_5', label: 'Carbohydrates', unit: 'g', calculation: 'per100' },
  { key: 'field_6', label: 'Sodium', unit: 'mg', calculation: 'per100' },
  { key: 'field_7', label: 'Caffeine', unit: 'mg', calculation: 'per100' },
  { key: 'field_8', label: 'Mood', calculation: 'manual' },
];

// Mirrors the server-rendered eatthismuch.com food page layout.
const eatThisMuchHtml = `
<html><head><script>window.x = "Protein 99g"</script></head><body>
<h1>Sunflower Seed Kernels</h1>
<p>For 1 tbsp of sunflower seed kernels (9g), the nutrition facts are:</p>
<table>
  <tr><th>Nutrient</th><th>Value</th><th>%DV</th></tr>
  <tr><td>Calories</td><td>51</td><td></td></tr>
  <tr><td>Fats</td><td>4g</td><td>6%</td></tr>
  <tr><td>Saturated fats</td><td>0.5g</td><td>2%</td></tr>
  <tr><td>Trans fats</td><td>&ndash;</td><td></td></tr>
  <tr><td>Sodium</td><td>0.3mg</td><td>0%</td></tr>
  <tr><td>Carbs</td><td>2g</td><td>1%</td></tr>
  <tr><td>Net carbs</td><td>1g</td><td></td></tr>
  <tr><td>Protein</td><td>2g</td><td></td></tr>
</table>
<p>This has a relatively high calorie density, with 582 Calories per 100g.</p>
<table><tr><td>Fats</td><td>9g</td></tr></table>
</body></html>`;

describe('nutrition URL import', () => {
  it('parses an eatthismuch page and converts per-serving values to per-100g rates', () => {
    const parsed = parseNutritionHtml(eatThisMuchHtml);
    expect(parsed.servingGrams).toBe(9);
    expect(parsed.caloriesPer100g).toBe(582);

    const result = mapNutritionToMetadata(parsed, fields);
    expect(result.values).toEqual({
      field_2: '582',
      field_3: '22.22',
      field_4: '44.44',
      field_5: '22.22',
      field_6: '3.33',
    });
    expect(result.unmatchedFields.map(field => field.label)).toEqual(['Caffeine']);
  });

  it('converts to rates per a custom portion weight', () => {
    const result = mapNutritionToMetadata(parseNutritionHtml(eatThisMuchHtml), fields, 9);
    expect(result.values.field_3).toBe('2');
    expect(result.values.field_2).toBe('52.38');
  });

  it('reads schema.org NutritionInformation and converts units', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'Recipe',
      nutrition: {
        '@type': 'NutritionInformation',
        servingSize: '50 g',
        calories: '100 kcal',
        proteinContent: '5 g',
        sodiumContent: '0.1 g',
      },
    })}</script>`;
    const result = mapNutritionToMetadata(parseNutritionHtml(html), fields);
    expect(result.values).toEqual({ field_2: '200', field_3: '10', field_6: '200' });
  });

  it('uses values as-is for pages that list nutrition per 100 g', () => {
    const html = `<div>Nutrition facts per 100 g</div><div>Energy</div><div>2092 kJ</div><div>Protein</div><div>20,5 g</div>`;
    const result = mapNutritionToMetadata(parseNutritionHtml(html), fields);
    expect(result.values).toEqual({ field_2: '500', field_3: '20.5' });
  });

  it('reads the gram weight of a non-gram default unit like "medium whole"', () => {
    const html = `
      <h2>For <span>1</span> <span>medium whole</span>
      <div>of tomatoes</div> <span>(<b>123</b> g)</span></h2>
      <table><tr><td>Calories</td><td>22</td></tr><tr><td>Protein</td><td>1g</td></tr></table>
      <p>This has a relatively low calorie density, with 18 Calories per 100g.</p>`;
    const parsed = parseNutritionHtml(html);
    expect(parsed.servingGrams).toBe(123);
    expect(mapNutritionToMetadata(parsed, fields).values).toEqual({ field_2: '18', field_3: '0.81' });
  });

  it('reads the serving when the page unit is switched to grams', () => {
    const html = `<p>For 100 grams of tomatoes</p>
      <table><tr><td>Calories</td><td>18</td></tr><tr><td>Protein</td><td>1g</td></tr></table>`;
    const parsed = parseNutritionHtml(html);
    expect(parsed.servingGrams).toBe(100);
    expect(mapNutritionToMetadata(parsed, fields).values).toEqual({ field_2: '18', field_3: '1' });
  });

  it('derives the serving weight from calories when the page gives no grams', () => {
    const html = `<p>For 1 medium whole of tomatoes</p>
      <table><tr><td>Calories</td><td>22</td></tr><tr><td>Protein</td><td>1g</td></tr></table>
      <p>with 18 Calories per 100g.</p>`;
    expect(parseNutritionHtml(html).servingGrams).toBe(122.2);
  });

  it('fails clearly when the serving weight is missing', () => {
    expect(() => mapNutritionToMetadata(parseNutritionHtml('<p>Protein 2g</p>'), fields)).toThrow(/serving weight/);
  });

  it('matches common nutrient label variants', () => {
    expect(canonicalNutrientKey('Total Carbohydrate')).toBe('carbs');
    expect(canonicalNutrientKey('Dietary Fibre')).toBe('fiber');
    expect(canonicalNutrientKey('Fat (g)')).toBe('fat');
    expect(canonicalNutrientKey('Energy')).toBe('calories');
    expect(isGramAmountField({ key: 'a', label: 'Weight', unit: 'g' })).toBe(true);
    expect(isGramAmountField({ key: 'a', label: 'Volume', unit: 'ml' })).toBe(false);
  });

  it('reads potassium and beta carotene from the table when JSON-LD lacks them', () => {
    const html = `<script type="application/ld+json">${JSON.stringify({
      '@type': 'NutritionInformation',
      servingSize: '100 g',
      calories: '34 kcal',
      proteinContent: '2.2 g',
    })}</script>
<p>For 100 grams of shiitake mushrooms</p>
<table>
  <tr><td>Calories</td><td>34</td><td></td></tr>
  <tr><td>Potassium</td><td>304mg</td><td>6%</td></tr>
  <tr><td>Beta carotene</td><td>12&micro;g</td><td></td></tr>
  <tr><td>Alpha carotene</td><td>5&micro;g</td><td></td></tr>
</table>`;
    const extra: MetadataField[] = [
      { key: 'f_a', label: 'β-carotene', unit: 'mg', calculation: 'per100' },
      { key: 'f_b', label: 'Potassium', unit: 'mg', calculation: 'per100' },
    ];
    const result = mapNutritionToMetadata(parseNutritionHtml(html), extra);
    expect(result.values).toEqual({ f_a: '0.01', f_b: '304' });
    expect(canonicalNutrientKey('β-carotene')).toBe('betacarotene');
    expect(canonicalNutrientKey('Beta carotene')).toBe('betacarotene');
    expect(canonicalNutrientKey('Beta-Carotene (provitamin A)')).toBe('betacarotene');
  });

  it('reads name, subtext, image and link from a search results page', () => {
    const html = `<table>
<tr><td><img src="https://images.eatthismuch.com/thmb/451_a.png" alt=""></td><td><a href="/calories/chicken-breast-451">Chicken breast</a><div>raw, skinless</div></td><td>142</td></tr>
<tr><td><a href="/calories/chicken-breast-453"><img src="https://images.eatthismuch.com/thmb/453_b.jpg"><span>Chicken breast</span></a><div>cooked, roasted, skinless</div></td><td>142</td></tr>
<tr><td><a href="/calories/chicken-breast-451">dup</a></td></tr>
<tr><td><a href="/calories/baked-chicken-breasts-3200328?a=1:0">Baked Chicken Breasts</a></td><td>347</td></tr>
</table><a href="/food/browse?q=x">Next</a>`;
    expect(parseFoodSearchHtml(html)).toEqual([
      {
        name: 'Chicken breast',
        description: 'raw, skinless',
        imageUrl: 'https://images.eatthismuch.com/thmb/451_a.png',
        url: 'https://www.eatthismuch.com/calories/chicken-breast-451',
      },
      {
        name: 'Chicken breast',
        description: 'cooked, roasted, skinless',
        imageUrl: 'https://images.eatthismuch.com/thmb/453_b.jpg',
        url: 'https://www.eatthismuch.com/calories/chicken-breast-453',
      },
      {
        name: 'Baked Chicken Breasts',
        description: undefined,
        imageUrl: undefined,
        url: 'https://www.eatthismuch.com/calories/baked-chicken-breasts-3200328',
      },
    ]);
  });
});
