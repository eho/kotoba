import type {
  ChineseLearningVariant,
  ChineseReadingSystem,
  EnrichmentData,
  LearningEntryDraft,
  LearningLanguage,
  ReadingSegment,
  RegisterLevel,
  RegisterVariant,
  StructuredExample,
  TextVariants,
  UsageContrast,
} from "./learningTypes";
import type {
  PhraseFragmentKind,
  PhraseFragmentSourcePath,
} from "./phraseFragmentTypes";
export type {
  PhraseFragmentKind,
  PhraseFragmentSourcePath,
} from "./phraseFragmentTypes";

export interface PhrasePlayableFragment {
  fragmentKey: string;
  sourcePath: PhraseFragmentSourcePath;
  id: string;
  kind: PhraseFragmentKind;
  label: string;
  text: string;
  speechText: string;
  language: LearningLanguage;
  chineseVariant: ChineseLearningVariant | null;
  readingSystem: ChineseReadingSystem | null;
  targetTextVariants: TextVariants | null;
  reading: string | null;
  readingSegments: ReadingSegment[];
  translation: string | null;
  relationNote: string | null;
  description: string | null;
}

export type PhraseFragmentScope = "expanded" | "preview";

type PhraseFragmentSource = Pick<
  LearningEntryDraft,
  | "alternateForm"
  | "enrichment"
  | "targetLanguage"
  | "targetTextVariants"
  | "chineseVariant"
  | "readingSystem"
>;

function hasText(value: string | null | undefined) {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string) {
  return value.trim();
}

export function normalizePhraseFragmentCacheText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function formatRole(role: RegisterVariant["role"]) {
  return role.replace(/_/g, " ");
}

function formatRegister(register: RegisterLevel | undefined) {
  return register ? `${register} register` : null;
}

function joinParts(parts: Array<string | null | undefined>) {
  return parts.filter(hasText).join(" ");
}

export function stripPhraseFragmentTTSAnnotation(value: string) {
  return value
    .replace(/\s*(?:\([^)]{1,40}\)|（[^）]{1,40}）)\s*$/u, "")
    .trim();
}

function isTargetLanguageText(value: string) {
  const text = value.trim();

  if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(text)) {
    return false;
  }

  return !(
    /^\p{Script=Latin}[\p{Script=Latin}\s_-]{1,24}[:：-]/u.test(text) ||
    /\((?:casual|polite|formal|spoken|written|cantonese|mandarin|colloquial)[^)]*\)\s*$/iu.test(
      text,
    )
  );
}

function getFragmentReading(params: {
  targetLanguage: LearningLanguage;
  reading?: string | null;
  romanization?: string | null;
}) {
  if (params.targetLanguage === "ja") {
    return params.romanization ?? params.reading ?? null;
  }

  return params.reading ?? params.romanization ?? null;
}

function getRegisterVariantDescription(variant: RegisterVariant) {
  return joinParts([
    formatRegister(variant.register),
    variant.translationText,
    variant.usageNote,
  ]);
}

function getContrastDescription(contrast: UsageContrast) {
  return joinParts([
    contrast.meaning,
    contrast.whenToUse ? `Use: ${contrast.whenToUse}` : null,
    contrast.avoidWhen ? `Avoid: ${contrast.avoidWhen}` : null,
    contrast.contrastNote,
  ]);
}

function getExampleDescription(example: StructuredExample) {
  return joinParts([example.translationText, example.note]);
}

function getRegisterVariants(enrichment: EnrichmentData | null | undefined) {
  return getRegisterVariantEntries(enrichment).map((entry) => entry.variant);
}

function getRegisterVariantEntries(enrichment: EnrichmentData | null | undefined) {
  return (enrichment?.registerVariants ?? [])
    .map((variant, sourceIndex) => ({ variant, sourceIndex }))
    .filter(
      (entry) => hasText(entry.variant.text) && entry.variant.role !== "primary",
    );
}

function getStructuredExamples(enrichment: EnrichmentData | null | undefined) {
  return getStructuredExampleEntries(enrichment).map((entry) => entry.example);
}

function getStructuredExampleEntries(
  enrichment: EnrichmentData | null | undefined,
) {
  return (enrichment?.examples ?? [])
    .map((example, sourceIndex) => ({ example, sourceIndex }))
    .filter(
      (entry) =>
        hasText(entry.example.text) &&
        (hasText(entry.example.translationText) || hasText(entry.example.note)),
    );
}

function getUsageContrasts(enrichment: EnrichmentData | null | undefined) {
  return getUsageContrastEntries(enrichment).map((entry) => entry.contrast);
}

function getUsageContrastEntries(enrichment: EnrichmentData | null | undefined) {
  return (enrichment?.usageContrasts ?? [])
    .map((contrast, sourceIndex) => ({ contrast, sourceIndex }))
    .filter(
      (entry) => hasText(entry.contrast.text) && hasText(entry.contrast.contrastNote),
    );
}

function getConfusableAlternativeEntries(
  enrichment: EnrichmentData | null | undefined,
) {
  return (enrichment?.confusableAlternatives ?? [])
    .map((alternative, sourceIndex) => ({ alternative, sourceIndex }))
    .filter((entry) => hasText(entry.alternative));
}

export function buildPhraseFragmentKey(input: {
  kind: PhraseFragmentKind;
  language: LearningLanguage;
  chineseVariant?: ChineseLearningVariant | null;
  text: string;
  speechText?: string | null;
}) {
  const text = normalizePhraseFragmentCacheText(input.text);
  const speechText = normalizePhraseFragmentCacheText(input.speechText ?? input.text);

  return [
    "fragment:v1",
    input.kind,
    input.language,
    input.chineseVariant ?? "none",
    text,
    speechText,
  ].join(":");
}

function buildFragment(
  source: PhraseFragmentSource,
  params: {
    id: string;
    sourcePath: PhraseFragmentSourcePath;
    kind: PhraseFragmentKind;
    label: string;
    text: string;
    targetTextVariants?: TextVariants | null;
    readingSegments?: ReadingSegment[] | null;
    reading?: string | null;
    translation?: string | null;
    relationNote?: string | null;
    description?: string | null;
  },
): PhrasePlayableFragment {
  const speechText = stripPhraseFragmentTTSAnnotation(params.text);
  const normalizedSpeechText = speechText.length > 0 ? speechText : params.text;

  return {
    fragmentKey: buildPhraseFragmentKey({
      kind: params.kind,
      language: source.targetLanguage,
      chineseVariant: source.chineseVariant ?? null,
      text: params.text,
      speechText: normalizedSpeechText,
    }),
    sourcePath: params.sourcePath,
    id: params.id,
    kind: params.kind,
    label: params.label,
    text: params.text,
    speechText: normalizedSpeechText,
    language: source.targetLanguage,
    chineseVariant: source.chineseVariant ?? null,
    readingSystem: source.readingSystem ?? null,
    targetTextVariants: params.targetTextVariants ?? null,
    reading: params.reading ?? null,
    readingSegments: params.readingSegments ?? [],
    translation: params.translation ?? null,
    relationNote: params.relationNote ?? null,
    description: params.description ?? null,
  };
}

function getExpandedStructuredFragments(source: PhraseFragmentSource) {
  const fragments: PhrasePlayableFragment[] = [];

  getRegisterVariantEntries(source.enrichment).forEach(
    ({ variant, sourceIndex }, displayIndex) => {
      fragments.push(
        buildFragment(source, {
          id: `register-variant-${variant.role}-${displayIndex}`,
          sourcePath: `enrichment.registerVariants.${sourceIndex}`,
          kind: "register_variant",
          label: "Variants",
          text: normalizeText(variant.text),
          readingSegments: variant.readingSegments,
          reading: getFragmentReading({
            targetLanguage: source.targetLanguage,
            reading: variant.reading,
            romanization: variant.romanization,
          }),
          translation: variant.translationText ?? null,
          relationNote:
            variant.usageNote ?? `${formatRole(variant.role)} variant of this phrase.`,
          description: getRegisterVariantDescription(variant),
        }),
      );
    },
  );

  getUsageContrastEntries(source.enrichment).forEach(
    ({ contrast, sourceIndex }, displayIndex) => {
      const text = normalizeText(contrast.text);
      if (!isTargetLanguageText(text)) {
        return;
      }

      fragments.push(
        buildFragment(source, {
          id: `usage-contrast-${displayIndex}`,
          sourcePath: `enrichment.usageContrasts.${sourceIndex}`,
          kind: "usage_contrast",
          label: contrast.label ?? "Contrast",
          text,
          readingSegments: contrast.readingSegments,
          reading: getFragmentReading({
            targetLanguage: source.targetLanguage,
            reading: contrast.reading,
            romanization: contrast.romanization,
          }),
          translation: contrast.meaning ?? null,
          relationNote: contrast.contrastNote,
          description: getContrastDescription(contrast),
        }),
      );
    },
  );

  getStructuredExampleEntries(source.enrichment).forEach(
    ({ example, sourceIndex }, displayIndex) => {
      fragments.push(
        buildFragment(source, {
          id: `structured-example-${displayIndex}`,
          sourcePath: `enrichment.examples.${sourceIndex}`,
          kind: "structured_example",
          label: "Example",
          text: normalizeText(example.text),
          readingSegments: example.readingSegments,
          reading: getFragmentReading({
            targetLanguage: source.targetLanguage,
            reading: example.reading,
            romanization: example.romanization,
          }),
          translation: example.translationText ?? null,
          relationNote: example.note ?? "Example sentence using this phrase.",
          description: getExampleDescription(example),
        }),
      );
    },
  );

  return fragments;
}

function getLegacyFallbackFragments(source: PhraseFragmentSource) {
  const fragments: PhrasePlayableFragment[] = [];
  const variants = getRegisterVariants(source.enrichment);
  const contrasts = getUsageContrasts(source.enrichment);
  const examples = getStructuredExamples(source.enrichment);
  const variantTexts = new Set(variants.map((variant) => normalizeText(variant.text)));
  const contrastTexts = new Set(contrasts.map((contrast) => normalizeText(contrast.text)));
  const hasStructuredCantoneseItems = variants.length > 0 || contrasts.length > 0;

  if (hasText(source.alternateForm) && variants.length === 0) {
    fragments.push(
      buildFragment(source, {
        id: "alternate-form",
        sourcePath: "alternateForm",
        kind: "alternate",
        label: "Also",
        text: source.alternateForm!,
      }),
    );
  }

  if (hasText(source.enrichment?.exampleSentence) && examples.length === 0) {
    fragments.push(
      buildFragment(source, {
        id: "example-sentence",
        sourcePath: "enrichment.exampleSentence",
        kind: "example",
        label: "Example",
        text: source.enrichment!.exampleSentence!,
      }),
    );
  }

  getConfusableAlternativeEntries(source.enrichment).forEach(
    ({ alternative, sourceIndex }, displayIndex) => {
      if (contrastTexts.has(normalizeText(alternative))) {
        return;
      }

      fragments.push(
        buildFragment(source, {
          id: `confusable-${displayIndex}`,
          sourcePath: `enrichment.confusableAlternatives.${sourceIndex}`,
          kind: "confusable",
          label: "Don't mix",
          text: alternative,
        }),
      );
    },
  );

  if (
    hasText(source.enrichment?.cantoneseExamples?.colloquial) &&
    !hasStructuredCantoneseItems &&
    !variantTexts.has(normalizeText(source.enrichment!.cantoneseExamples!.colloquial!))
  ) {
    fragments.push(
      buildFragment(source, {
        id: "cantonese-colloquial",
        sourcePath: "enrichment.cantoneseExamples.colloquial",
        kind: "cantonese_colloquial",
        label: "Cantonese",
        text: source.enrichment!.cantoneseExamples!.colloquial!,
      }),
    );
  }

  if (
    hasText(source.enrichment?.cantoneseExamples?.formalWritten) &&
    !hasStructuredCantoneseItems &&
    !variantTexts.has(
      normalizeText(source.enrichment!.cantoneseExamples!.formalWritten!),
    )
  ) {
    fragments.push(
      buildFragment(source, {
        id: "cantonese-formal-written",
        sourcePath: "enrichment.cantoneseExamples.formalWritten",
        kind: "formal_written",
        label: "Formal written",
        text: source.enrichment!.cantoneseExamples!.formalWritten!,
      }),
    );
  }

  return fragments;
}

export function extractPhrasePlayableFragments(
  source: PhraseFragmentSource,
  options: { scope?: PhraseFragmentScope } = {},
): PhrasePlayableFragment[] {
  if (options.scope === "preview") {
    const variants = getRegisterVariantEntries(source.enrichment).map(
      ({ variant, sourceIndex }, displayIndex) =>
        buildFragment(source, {
          id: `preview-register-variant-${variant.role}-${displayIndex}`,
          sourcePath: `enrichment.registerVariants.${sourceIndex}`,
          kind: "register_variant",
          label: "Variants",
          text: normalizeText(variant.text),
          readingSegments: variant.readingSegments,
          reading: getFragmentReading({
            targetLanguage: source.targetLanguage,
            reading: variant.reading,
            romanization: variant.romanization,
          }),
          translation: variant.translationText ?? null,
          relationNote:
            variant.usageNote ?? `${formatRole(variant.role)} variant of this phrase.`,
          description: getRegisterVariantDescription(variant),
        }),
    );
    const firstExample = getStructuredExampleEntries(source.enrichment)[0];

    return firstExample
      ? [
          ...variants,
          buildFragment(source, {
            id: "preview-structured-example-0",
            sourcePath: `enrichment.examples.${firstExample.sourceIndex}`,
            kind: "structured_example",
            label: "Example",
            text: normalizeText(firstExample.example.text),
            readingSegments: firstExample.example.readingSegments,
            reading: getFragmentReading({
              targetLanguage: source.targetLanguage,
              reading: firstExample.example.reading,
              romanization: firstExample.example.romanization,
            }),
            translation: firstExample.example.translationText ?? null,
            relationNote:
              firstExample.example.note ?? "Example sentence using this phrase.",
            description: getExampleDescription(firstExample.example),
          }),
        ]
      : variants;
  }

  return [
    ...getExpandedStructuredFragments(source),
    ...getLegacyFallbackFragments(source),
  ];
}

export function getPhraseFragmentUsageContrastNotes(source: PhraseFragmentSource) {
  return getUsageContrastEntries(source.enrichment).map(
    ({ contrast, sourceIndex }, displayIndex) => {
      const label = contrast.label ?? "Contrast";
      const description = getContrastDescription(contrast);
      const text = normalizeText(contrast.text);

      if (isTargetLanguageText(text)) {
        return {
          kind: "playable" as const,
          label,
          fragment: buildFragment(source, {
            id: `usage-contrast-${displayIndex}`,
            sourcePath: `enrichment.usageContrasts.${sourceIndex}`,
            kind: "usage_contrast",
            label,
            text,
            readingSegments: contrast.readingSegments,
            reading: getFragmentReading({
              targetLanguage: source.targetLanguage,
              reading: contrast.reading,
              romanization: contrast.romanization,
            }),
            translation: contrast.meaning ?? null,
            relationNote: contrast.contrastNote,
            description,
          }),
        };
      }

      return {
        kind: "prose" as const,
        label,
        text: description || contrast.contrastNote,
      };
    },
  );
}
