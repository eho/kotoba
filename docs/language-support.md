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
