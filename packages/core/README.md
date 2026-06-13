# @edwinho/kotoba-core

Framework-neutral data contracts and utilities for Kotoba learning entries,
translation drafts, language profiles, cache keys, and sanitizers.

This package is intentionally pure. It does not import Expo, React Native,
Gemini provider code, CLI code, app storage, service policy, or runtime
transport helpers.

`@edwinho/kotoba-core` is the shared data-contract package used by Kotoba
providers, CLI tools, and app integrations. It does not translate text by itself
and it does not call Gemini or hosted services.

## Install

Inside this monorepo, depend on the package by version. Bun workspaces link the
local package when the workspace version satisfies the range:

```json
{
  "dependencies": {
    "@edwinho/kotoba-core": "^0.2.0"
  }
}
```

For external consumers:

```bash
bun add @edwinho/kotoba-core
```

## Concepts

Version `0.2.0` includes optional Japanese study-token metadata, the
`StudyTokenMetadata` contract, and the `generateJapaneseFormTable()` helper for
rendering deterministic verb and adjective form tables from trusted metadata.

`TranslationDraft` is the normalized shape returned by translation providers
before a phrase is saved. It carries source and target text, optional reading
support, enrichment data, study tokens, freshness metadata, and capability
flags that describe which enrichments are present. It keeps the same field
shape while supporting future-language drafts through a generic language
parameter. App consumers can keep using the default Japanese/Chinese draft
type, while core/provider tests can infer `TranslationDraft<"ko">` from
`normalizeTranslationDraft({ targetLanguage: "ko", ... })`.

`LearningEntry` and `LearningEntryDraft` are the saved-entry contracts used by
library and note surfaces.

Language helpers such as `detectDirection`, `resolveLanguageProfile`,
`resolveActiveLanguageContext`, and Chinese variant helpers keep language,
script, reading-system, and cache-scope decisions centralized.

Language support is represented through capability profiles. `LearningLanguage`
tracks product surfaces that only expose Japanese and Chinese today, while
`SupportedLearningLanguage` also includes package-level languages such as
Korean. Each `LanguageCapabilityProfile` declares language, script,
reading-system, locale, register, romanization, and variant support.

Japanese and Chinese profiles preserve the existing locale, reading,
romanization, and variant behavior. Korean is included with Hangul/Revised
Romanization, `ko-KR` speech locale metadata, and register support.

Validators and normalizers accept provider-like or imported data defensively:
malformed sections are dropped and reported through `droppedSections`; valid
sections are normalized into the public contracts. For example,
`sanitizeStudyTokens` rejects out-of-range tokens and tokens whose surface text
does not match the target text. `sanitizeEnrichmentData` drops malformed nested
sections such as invalid grammar breakdowns, examples, contrasts, and cached
note details. `normalizeTranslationDraft` derives completeness and capability
metadata after reading support, Chinese metadata, and study tokens are
normalized.

Japanese study tokens can optionally carry trusted morphology metadata under
`StudyToken.metadata`. Phase 1 supports Japanese verb and adjective metadata
only:

```ts
import type { StudyTokenMetadata } from "@edwinho/kotoba-core";

const metadata: StudyTokenMetadata = {
  language: "ja",
  category: "morphology",
  kind: "verb",
  surface: "飲んだ",
  lemma: "飲む",
  verbClass: "godan-mu",
  observedForm: "past",
  confidence: "high",
};
```

`sanitizeStudyTokens` preserves valid metadata and drops only malformed
metadata while keeping the token. Dropped metadata is reported through a
metadata-specific path such as `studyTokens[0].metadata`.

## Package Boundary

The public package set is intentionally split:

- `@edwinho/kotoba-core` owns framework-neutral language profiles, draft contracts,
  validators, normalizers, cache/version helpers, and learning-entry utilities.
- `@edwinho/kotoba-gemini` owns Gemini prompt/schema/provider logic and requires a
  caller-provided Gemini API key.
- `@edwinho/kotoba-cli` is a terminal consumer of the public packages. It sends the
  user's input text to Gemini through `@edwinho/kotoba-gemini` using the user's Gemini
  API key.
- App integrations own runtime policy, persistence, and product-specific
  behavior around these contracts.

## Examples

Normalize a cloud translation result:

```ts
import { normalizeTranslationDraft, sanitizeEnrichmentData } from "@edwinho/kotoba-core";

const { enrichment, droppedSections } = sanitizeEnrichmentData(providerPayload.enrichment);

const draft = normalizeTranslationDraft(
  {
    targetLanguage: "ja",
    sourceLanguage: "en",
    sourceText: "I'm hungry",
    targetText: "お腹が空きました。",
    readingSegments: [{ text: "お腹", reading: "おなか" }],
    romanization: "onaka ga sukimashita",
    translationText: "I'm hungry.",
    register: "polite",
    enrichment,
    studyTokens: providerPayload.studyTokens,
  },
  {
    source: "cloud",
    canRegenerateWithCloud: true,
  }
);

console.log(draft.completeness, draft.capabilities, droppedSections);
```

Resolve language behavior:

```ts
import {
  detectDirection,
  resolveActiveLanguageContext,
  resolveLanguageProfile,
  resolveTTSLocale,
} from "@edwinho/kotoba-core";

const context = resolveActiveLanguageContext({
  learningLanguage: "zh",
  chineseVariant: "cantonese-traditional",
});

const profile = resolveLanguageProfile(context.learningLanguage);
const inputMode = detectDirection("我肚餓", context.learningLanguage);
const ttsLocale = resolveTTSLocale(
  context.learningLanguage,
  context.chineseDisplayScript ?? undefined,
  context.chineseVariant ?? undefined
);

console.log(profile.defaultScript, inputMode, ttsLocale);
```

Generate Japanese form tables from trusted metadata:

```ts
import { generateJapaneseFormTable } from "@edwinho/kotoba-core";

const table = generateJapaneseFormTable({
  language: "ja",
  category: "morphology",
  kind: "verb",
  surface: "飲んだ",
  lemma: "飲む",
  verbClass: "godan-mu",
  observedForm: "past",
  confidence: "high",
});

console.log(table?.coreRows);
// [
//   {
//     key: "non-past",
//     label: "Non-past",
//     plain: { value: "飲む" },
//     polite: { value: "飲みます" },
//   },
//   {
//     key: "past",
//     label: "Past",
//     plain: { value: "飲んだ", observed: true, note: "Seen here" },
//     polite: { value: "飲みました" },
//   },
//   ...
// ]

console.log(table?.otherRows);
// [
//   { label: "Te-form", value: "飲んで" },
//   { label: "Potential", value: "飲める" },
// ]
```

By default, only high-confidence metadata generates a table. Medium-confidence
metadata can be enabled explicitly:

```ts
generateJapaneseFormTable(metadata, { minConfidence: "medium" });
```

Resolve Korean as a future-language fixture:

```ts
import { normalizeTranslationDraft, resolveLanguageProfile } from "@edwinho/kotoba-core";

const profile = resolveLanguageProfile("ko");

const draft = normalizeTranslationDraft(
  {
    targetLanguage: "ko",
    sourceLanguage: "en",
    sourceText: "I'm going now",
    targetText: "저 지금 가요.",
    readingSystem: "revised_romanization",
    readingSegments: [
      { text: "저", reading: "jeo" },
      { text: "지금", reading: "jigeum" },
      { text: "가요", reading: "gayo" },
    ],
    romanization: "jeo jigeum gayo",
    translationText: "I'm going now.",
    register: "polite",
  },
  {
    source: "cloud",
    canRegenerateWithCloud: false,
  }
);

console.log(profile.defaultTTSLocale, draft.readingSystem, draft.register);
```

## New-Language Checklist

Add future languages through bounded metadata and tests rather than changing the
`TranslationDraft` field shape:

1. Add profile metadata in `src/languages/languageProfiles.ts`, including
   scripts, reading systems, locale metadata, register support, and variant
   support.
2. Add script metadata to `ScriptCode` and reading metadata to `ReadingSystem`
   or a language-specific reading-system alias.
3. Add detection fixtures for `detectDirection` when the target script can be
   detected locally.
4. Add provider prompt guidance and response-schema additions in the provider
   package for language-specific reading, romanization, register, and
   enrichment expectations.
5. Add normalization and sanitizer fixtures that prove language-specific
   metadata survives and unsupported fields are dropped.
6. Add public API tests for profile resolution and any new runtime exports.
7. Add product work separately if the language should appear in settings,
   navigation, add phrase, library, TTS/STT, or persistence flows.

## Verification

Run package-level checks from the repository root:

```bash
bun run --cwd packages/core typecheck
bun run --cwd packages/core test
bun run --cwd packages/core build
```

From the repository root, `bun run build`, `bun run typecheck`, and
`bun run test` run all package checks.
