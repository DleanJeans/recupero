import type { Category } from '../types/behavior';

/** Category names that show the Cook a batch button until the user picks their own in Settings. */
const DEFAULT_COOK_BATCH_CATEGORY_NAMES = ['food'];

/**
 * Category ids that show the Cook a batch button. `configured` is the saved Settings list, or null when the user
 * never chose (then categories with a default name apply).
 */
export function getCookBatchCategoryIds(categories: Category[], configured: string[] | null): string[] {
  if (configured) return configured.filter(id => categories.some(c => c.id === id));
  return categories.filter(c => DEFAULT_COOK_BATCH_CATEGORY_NAMES.includes(c.name.trim().toLowerCase())).map(c => c.id);
}

export function shouldShowCookBatchButton(
  selectedCategoryId: string | null | undefined,
  categories: Category[],
  configured: string[] | null,
): boolean {
  if (!selectedCategoryId) return false;
  return getCookBatchCategoryIds(categories, configured).includes(selectedCategoryId);
}

export function toggleCookBatchCategory(current: string[], id: string): string[] {
  return current.includes(id) ? current.filter(x => x !== id) : [...current, id];
}
