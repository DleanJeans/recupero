# Regression Contracts

These are user-visible metadata behaviors that have regressed before. Check them when changing category metadata, behavior forms, behavior logs, or day summaries.

## Metadata order is category-owned

The order saved in `category.metadataFields` is the source of truth. The same order must be used by the category metadata editor, behavior form, behavior log form, behavior log items, and day screen metadata summaries.

Do not introduce a separate per-behavior order or sort fields by calculation type in one screen. Adding or reordering a category field must not silently change the order shown elsewhere.

## Metadata changes update existing logs

Adding a behavior metadata field or changing its default/calculation value must be reflected in all relevant behavior log items and calculated summaries immediately. Users must not need to open and save every old log to refresh it.

Keep compatibility with logs written by previous versions. Missing metadata should remain safe to read, and calculated values should be derived or synchronized through the shared metadata utilities/store path.

## Only the selected Amount field is editable

A category may define multiple fields with `calculation: 'amount'`, but each behavior selects one Amount field. The behavior log form must render one Amount input: the selected field, with the existing fallback when a behavior has no valid selection.

The other Amount fields must not appear as duplicate inputs or be used as the behavior's calculation source.

## Behavior log metadata layout

Metadata inputs and calculated metadata cards use a two-column grid by default. The layout toggle may switch the form to one column and back without changing field order, values, calculations, or which Amount field is selected.

## Focused checks

For metadata changes, run:

```sh
pnpm format:imports <touched-files-paths>
pnpm format:changed
pnpm exec tsc --noEmit
pnpm exec jest .jest/metadataCalculation.test.ts .jest/behaviorUtils.test.ts --watchman=false --runInBand
```
