// Public language direction and profile helpers.
export { detectDirection } from "./languages/detectLanguage";
export {
  allTTSLocales,
  chineseProfile,
  getLanguageProfile,
  japaneseProfile,
  koreanProfile,
  resolveLanguageProfile,
  resolveSTTLocale,
  resolveTTSLocale,
} from "./languages/languageProfiles";
export type {
  LanguageCapabilityProfile,
  LanguageProfile,
} from "./languages/languageProfiles";

// Public learning data contracts and validation/normalization helpers.
export {
  buildFallbackStudyTokens,
  CHINESE_VARIANT_PROFILES,
  alignReadingSegmentsToTargetText,
  deriveChineseVariantFromLegacy,
  getChineseReadingSystemLabel,
  hasStudyTokenNoteContent,
  isChineseLearningVariant,
  isChineseReadingSystem,
  isKoreanReadingSystem,
  isReadingSystem,
  normalizeChineseReadingMetadata,
  normalizeReadingSupport,
  promoteGrammarNotesToStudyTokens,
  resolveActiveLanguageContext,
  resolveChineseDisplayText,
  resolveChineseReadingSystemMetadata,
  resolveChineseVariantProfile,
  resolveLibraryScope,
  sanitizeEnrichmentData,
  sanitizeStudyTokens,
  validateReadingSegments,
} from "./learning/learningTypes";
export { generateJapaneseFormTable } from "./learning/japaneseFormTables";
export type {
  JapaneseFormTableCoreCell,
  JapaneseFormTableCoreRow,
  JapaneseFormTableCoreRowKey,
  JapaneseFormTable,
  JapaneseFormTableOptions,
  JapaneseFormTableRow,
} from "./learning/japaneseFormTables";
export type {
  ActiveLanguageContext,
  AlignedReadingSegment,
  CachedPhraseFragmentDetail,
  CharacterBreakdown,
  ChineseLearningVariant,
  ChineseReadingSystem,
  ChineseVariantProfile,
  EnrichmentData,
  GrammarToken,
  InputMode,
  JapaneseAdjectiveMorphologyMetadata,
  JapaneseObservedForm,
  JapaneseStudyTokenMetadata,
  JapaneseVerbClass,
  JapaneseVerbMorphologyMetadata,
  KoreanEnrichmentMetadata,
  KoreanReadingSystem,
  LanguageChoice,
  LearningEntry,
  LearningEntryDraft,
  LearningLanguage,
  LibraryScope,
  MetadataConfidence,
  NaturalnessLabel,
  ProficiencyLevel,
  ReadingSegment,
  ReadingSystem,
  RegisterLevel,
  RegisterVariant,
  RegisterVariantRole,
  ScriptCode,
  SourceLanguage,
  StructuredExample,
  StudyTokenMetadata,
  StudyToken,
  StudyTokenKind,
  StudyTokenNote,
  SupportedLearningLanguage,
  TextVariants,
  TranslationCapabilities,
  TranslationCompleteness,
  TranslationDraft,
  TranslationSource,
  UsageContrast,
  UsageContrastKind,
} from "./learning/learningTypes";

// Public phrase-fragment extraction helpers used by note and playback surfaces.
export {
  buildPhraseFragmentKey,
  extractPhrasePlayableFragments,
  getPhraseFragmentUsageContrastNotes,
  normalizePhraseFragmentCacheText,
  stripPhraseFragmentTTSAnnotation,
} from "./learning/phraseFragments";
export type {
  PhraseFragmentScope,
  PhrasePlayableFragment,
} from "./learning/phraseFragments";
export type {
  PhraseFragmentKind,
  PhraseFragmentSourcePath,
} from "./learning/phraseFragmentTypes";

// Public library category helpers.
export {
  CATEGORY_LABELS,
  CATEGORY_MENU_LABELS,
  CATEGORY_VALUES,
  isCategory,
  normalizePhraseCategories,
  primaryCategory,
  togglePhraseCategory,
} from "./library/categories";
export type { Category } from "./library/categories";

// Public cache-key and translation-version helpers.
export {
  createTTSCacheKey,
  createTranslationCacheKey,
  normalizeCacheText,
} from "./translation/cacheKeys";
export {
  inferTranslationCompleteness,
  normalizeTranslationDraft,
} from "./translation/normalizeTranslationDraft";
export type { NormalizeTranslationDraftOptions } from "./translation/normalizeTranslationDraft";
export {
  CURRENT_ENRICHMENT_PROMPT_VERSION,
  CURRENT_TRANSLATION_SCHEMA_VERSION,
  getTranslationCacheStaleReason,
  isDraftFreshForSavedPhraseReplacement,
  isPositiveIntegerVersion,
  isSavedPhraseStaleForTranslationUpdate,
  resolveTranslationVersionRequirement,
} from "./translation/versions";
export type {
  ResolvedTranslationVersionRequirement,
  TranslationRefreshPolicy,
  TranslationStaleReason,
  TranslationVersionMetadata,
  TranslationVersionRequirement,
} from "./translation/versions";
