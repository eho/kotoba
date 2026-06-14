# Language Support

Kotoba exposes language-learning contracts for Japanese, Chinese, and Korean
workflows.

## Japanese

Japanese support includes:

- Japanese language profile metadata
- `ja-JP` locale metadata
- kana/kanji reading support
- romanization fields
- register metadata for casual, polite, and formal variants when provider data includes them
- translation draft, study-token, and enrichment normalization
- optional verb and adjective morphology metadata for generating deterministic form tables

### Japanese Morphology Reliability

Japanese verb and adjective form tables are built from normalized study-token
metadata. The Gemini provider is asked to return morphology metadata for
confident Japanese verb, i-adjective, and na-adjective tokens, but Kotoba does
not rely on the provider being perfect.

The reliability model has three layers:

1. Provider guidance and retries ask Gemini for full inflected verb/adjective
   surfaces, validate the structured JSON response, retry malformed JSON up to
   two times, and retry once when surviving verb/adjective tokens are missing
   metadata.
2. Core normalization repairs deterministic provider mistakes such as
   byte-like Japanese offsets, malformed metadata attached to isolated copulas,
   and missing `observedForm` values when the observed surface exactly matches a
   generated form.
3. Core morphology repair handles common split verb and adjective sequences,
   for example split polite verb stems like `食べ` + `ました`, and adjective
   sequences like
   `静か` + `でした`, `高く` + `ない` + `です`, and `静か` + `では` + `なかった`.
   These repairs keep `metadata.surface` aligned to the owning study token and
   set `metadata.observedSurface` to the full repaired phrase when it differs.
   The patterns are bounded and require contiguous tokens plus adjective
   metadata or clear adjective part-of-speech notes.

This means Kotoba does make bounded linguistic inferences. It does not attempt
open-ended morphological analysis for every Japanese expression. A form table is
intended to be shown only when there is enough evidence to identify the lemma,
adjective or verb class, observed form, and confidence.

The generated table rows are deterministic for the supported metadata classes,
but upstream translation and metadata can still be wrong. Treat the output as
AI-assisted grammar support rather than an authoritative grammar dictionary.
It is strongest for common ichidan/godan verbs and common i-adjective and
na-adjective plain, polite, negative, and past forms. Some bounded contrastive
i-adjective negatives such as `高くはなかった` are repaired when token evidence is
clear, but be cautious with rare irregular forms, idioms, and cases where the
provider chooses a different translation or register.

## Chinese

Chinese support is variant-aware. The logical learning language is Chinese, while variant metadata controls script, reading, and locale behavior.

Supported variants:

| Variant | Script | Reading | Locale Metadata | Label |
| --- | --- | --- | --- | --- |
| `mandarin-simplified` | Simplified Chinese | Pinyin | `zh-CN` / `cmn-CN` | Simplified Chinese |
| `mandarin-traditional-taiwan` | Traditional Chinese | Pinyin | `zh-TW` / `cmn-CN` | Traditional Chinese |
| `cantonese-traditional` | Traditional Chinese | Jyutping | `zh-HK` / `yue-HK` | Cantonese |

Chinese drafts can carry variant metadata, reading-system metadata, target text variants, study tokens, and enrichment fields.

## Korean

Korean is supported in the package model and CLI/provider path.

Korean support includes:

- Korean profile metadata
- Hangul script metadata
- Revised Romanization reading metadata
- `ko-KR` locale metadata
- register-support metadata
- provider and CLI target support through `--to ko`
- normalization tests that prove Korean drafts do not require Chinese-only fields

Product surfaces built with Kotoba may choose their own language rollout order.
The packages keep the data model and provider path ready for Korean-capable
integrations.

## Adding A Future Language

Future languages should be added through bounded metadata and tests rather than by changing the translation draft shape.

Checklist:

1. Add language profile metadata in `packages/core/src/languages/languageProfiles.ts`.
2. Add or reuse script and reading-system metadata.
3. Add detection fixtures if local script detection is possible.
4. Add provider prompt guidance and schema expectations in `packages/gemini`.
5. Add sanitizer and normalizer fixtures proving language metadata survives and unsupported fields are dropped.
6. Add public API tests for profile resolution and exported types.
7. Add CLI flag coverage if the language should be available from the terminal.
