import {
  normalizeReadingSupport,
  normalizeChineseReadingMetadata,
  sanitizeStudyTokens,
  type EnrichmentData,
  type ReadingSegment,
  type RegisterLevel,
  type SourceLanguage,
  type SupportedLearningLanguage,
  type StudyToken,
  type TranslationCapabilities,
  type TranslationCompleteness,
  type TranslationDraft,
  type TranslationSource,
  type TextVariants,
} from "../learning/learningTypes";

type TranslationDraftCore<
  TLanguage extends SupportedLearningLanguage = SupportedLearningLanguage,
> = Omit<
  TranslationDraft<TLanguage>,
  "source" | "completeness" | "capabilities"
>;

export interface NormalizeTranslationDraftOptions {
  source: TranslationSource;
  completeness?: TranslationCompleteness;
  canRegenerateWithCloud: boolean;
}

function hasText(value: string | null | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

function hasEnrichment(core: TranslationDraftCore): boolean {
  return (
    core.readingSegments.length > 0 ||
    hasText(core.romanization) ||
    core.register !== null ||
    hasText(core.alternateForm) ||
    hasText(core.usage) ||
    core.enrichment != null ||
    core.targetTextVariants !== null
  );
}

function deriveCapabilities(
  core: TranslationDraftCore,
  canRegenerateWithCloud: boolean
): TranslationCapabilities {
  return {
    hasReadingSegments: core.readingSegments.length > 0,
    hasRomanization: hasText(core.romanization),
    hasRegister: core.register !== null,
    hasAlternateForm: hasText(core.alternateForm),
    hasUsage: hasText(core.usage),
    canRegenerateWithCloud,
  };
}

function normalizeTargetTextVariants(
  targetLanguage: TranslationDraftCore["targetLanguage"],
  targetTextVariants: TextVariants | null | undefined
): TextVariants | null {
  return targetLanguage === "zh" ? targetTextVariants ?? null : null;
}

function normalizeLanguageEnrichment(
  targetLanguage: TranslationDraftCore["targetLanguage"],
  enrichment: EnrichmentData | null | undefined
): EnrichmentData | null {
  if (enrichment == null) {
    return null;
  }

  const { cantoneseExamples, korean, ...sharedEnrichment } = enrichment;
  const normalized: EnrichmentData = {
    ...sharedEnrichment,
    ...(targetLanguage === "zh" && cantoneseExamples !== undefined
      ? { cantoneseExamples }
      : {}),
    ...(targetLanguage === "ko" && korean !== undefined ? { korean } : {}),
  };

  return Object.entries(normalized).some(
    ([_key, value]) => value !== undefined
  )
    ? normalized
    : null;
}

export function inferTranslationCompleteness(
  core: TranslationDraftCore
): TranslationCompleteness {
  return hasEnrichment(core) ? "enriched" : "basic";
}

export function normalizeTranslationDraft<
  TLanguage extends SupportedLearningLanguage,
>(
  core: {
    targetLanguage: TLanguage;
    sourceLanguage: SourceLanguage;
    sourceText: string;
    targetText: string;
    targetTextVariants?: TextVariants | null;
    chineseVariant?: unknown;
    readingSystem?: unknown;
    readingSegments?: ReadingSegment[];
    romanization?: string | null;
    translationText: string;
    register?: RegisterLevel;
    alternateForm?: string | null;
    usage?: string | null;
    enrichment?: EnrichmentData | null;
    studyTokens?: StudyToken[] | unknown;
    translationSchemaVersion?: number | null;
    enrichmentPromptVersion?: number | null;
    isStale?: boolean;
  },
  options: NormalizeTranslationDraftOptions
): TranslationDraft<TLanguage> {
  const { studyTokens } = sanitizeStudyTokens(core.studyTokens, core.targetText);
  const readingSupport = normalizeReadingSupport({
    targetText: core.targetText,
    readingSegments: core.readingSegments,
    romanization: core.romanization,
  });
  const readingMetadata = normalizeChineseReadingMetadata({
    targetLanguage: core.targetLanguage,
    chineseVariant: core.chineseVariant,
    readingSystem: core.readingSystem,
    targetTextVariants: normalizeTargetTextVariants(
      core.targetLanguage,
      core.targetTextVariants
    ),
  });

  const normalizedCore = {
    targetLanguage: core.targetLanguage,
    sourceLanguage: core.sourceLanguage,
    sourceText: core.sourceText,
    targetText: core.targetText,
    targetTextVariants: normalizeTargetTextVariants(
      core.targetLanguage,
      core.targetTextVariants
    ),
    ...(readingMetadata.chineseVariant != null
      ? { chineseVariant: readingMetadata.chineseVariant }
      : {}),
    ...(readingMetadata.readingSystem != null
      ? { readingSystem: readingMetadata.readingSystem }
      : {}),
    readingSegments: readingSupport.readingSegments,
    romanization: readingSupport.romanization,
    translationText: core.translationText,
    register: core.register ?? null,
    alternateForm: core.alternateForm ?? null,
    usage: core.usage ?? null,
    enrichment: normalizeLanguageEnrichment(core.targetLanguage, core.enrichment),
    studyTokens,
    ...(core.translationSchemaVersion !== undefined
      ? { translationSchemaVersion: core.translationSchemaVersion }
      : {}),
    ...(core.enrichmentPromptVersion !== undefined
      ? { enrichmentPromptVersion: core.enrichmentPromptVersion }
      : {}),
    ...(core.isStale !== undefined ? { isStale: core.isStale } : {}),
  } as TranslationDraftCore<TLanguage>;

  return {
    ...normalizedCore,
    source: options.source,
    completeness: options.completeness ?? inferTranslationCompleteness(normalizedCore),
    capabilities: deriveCapabilities(
      normalizedCore,
      options.canRegenerateWithCloud && options.source !== "cloud"
    ),
  } as TranslationDraft<TLanguage>;
}
