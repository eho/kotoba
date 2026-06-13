# @edwinho/kotoba-core

## 0.2.4

### Patch Changes

- Bump the enrichment prompt version, realign provider study-token spans when Japanese offsets are byte-like, infer observed form-table cells from metadata surfaces, and drop bogus morphology metadata from isolated copula tokens without dropping full adjective-copula surfaces.
- Repair split Japanese adjective auxiliary sequences so forms like `静かでした`, `高くないです`, and `静かではなかった` can still generate and mark form-table metadata.

## 0.2.3

### Patch Changes

- Add structured Japanese form-table matrices with plain and polite core forms plus separate other-form rows for mobile grammar popovers.

## 0.2.2

### Patch Changes

- Strengthen Japanese study-token morphology metadata generation for confident verb and adjective forms, including full polite verb surfaces, and bump the enrichment prompt version so cached translations can refresh.

## 0.2.1

### Patch Changes

- Require rich Gemini response fields in structured output and bump the enrichment prompt version so sparse cached translations refresh.
