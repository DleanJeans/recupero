# Regression Contracts

These are user-visible metadata regressions to guard against:

- Keep the order saved in `category.metadataFields` everywhere; do not add a per-behavior order or screen-specific calculation sort.
- Propagate metadata additions and default/calculation changes to existing logs and summaries without requiring users to reopen and save every log, while preserving old-log compatibility.
- When a category has multiple `amount` fields, show and calculate only the behavior’s selected Amount field, with a safe fallback for legacy selections.
- Keep Manual and Amount inputs full-width; only calculated metadata uses the default two-column grid and its one-column toggle.
