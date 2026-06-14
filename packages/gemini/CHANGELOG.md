# @edwinho/kotoba-gemini

## 0.3.4

### Patch Changes

- Add explicit Japanese morphology `observedSurface` support for deterministic split verb/adjective repairs, preserve `metadata.surface` as the owning study-token surface, and cover bounded polite verb endings plus contrastive adjective negatives such as `高くはなかった`.
- Updated dependencies
  - @edwinho/kotoba-core@0.2.5

## 0.3.3

### Patch Changes

- Add retries for invalid JSON responses and Japanese verb/adjective study tokens missing morphology metadata, refine godan polite verb guidance, and bump the enrichment prompt version so stale cached translations refresh.
- Updated dependencies
  - @edwinho/kotoba-core@0.2.4

## 0.3.2

### Patch Changes

- Strengthen Japanese study-token morphology metadata generation for confident verb and adjective forms, including full polite verb surfaces, and bump the enrichment prompt version so cached translations can refresh.
- Updated dependencies
  - @edwinho/kotoba-core@0.2.2

## 0.3.1

### Patch Changes

- Require non-null Gemini enrichment with schema-required learning guidance in structured output, send the SDK schema through the enforced `responseSchema` config, and bump the enrichment prompt version so sparse cached translations refresh.
- Updated dependencies
  - @edwinho/kotoba-core@0.2.1
