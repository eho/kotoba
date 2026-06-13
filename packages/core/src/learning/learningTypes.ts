// ─── Canonical Domain Types ──────────────────────────────────────────────────
// These types form the stable contract for the language-aware learning entry
// model. They do not replace app-owned runtime stores or persistence schemas.

import type { Category } from "../library/categories";
import type {
  PhraseFragmentKind,
  PhraseFragmentSourcePath,
} from "./phraseFragmentTypes";

// ─── Language & Script ──────────────────────────────────────────────────────

/** Supported learning languages in the public core model. English is always the source language. */
export type SupportedLearningLanguage = "ja" | "zh" | "ko";

/** Learning languages currently exposed by production product surfaces. */
export type LearningLanguage = "ja" | "zh";

/** User-facing top-level language choices shown throughout the app. */
export type LanguageChoice = "ja" | ChineseLearningVariant;

/** Stable persisted library buckets used for saved-phrase partitioning. */
export type LibraryScope = "ja" | "zh-mandarin" | "zh-cantonese";

/** ISO 15924 / BCP-47 script codes used for prompt-building and locale resolution. */
export type ScriptCode = "jpan" | "zh-Hans" | "zh-Hant" | "hang";

export type ReadingSystem =
  | "furigana"
  | "romaji"
  | "pinyin"
  | "jyutping"
  | "hangul"
  | "revised_romanization";

/** English is the only source language in this phase. */
export type SourceLanguage = "en";

// ─── Chinese Variant Model ──────────────────────────────────────────────────

/**
 * The user-facing Chinese variant. Determines display script, playback dialect,
 * reading system, and locale resolution in a single selection.
 */
export type ChineseLearningVariant =
  | "mandarin-simplified"
  | "mandarin-traditional-taiwan"
  | "cantonese-traditional";

/**
 * The phonetic annotation system used for Chinese readings.
 * - `pinyin`    — Mandarin romanization (both Simplified and Traditional)
 * - `jyutping`  — Cantonese romanization
 */
export type ChineseReadingSystem = "pinyin" | "jyutping";

export type KoreanReadingSystem = "hangul" | "revised_romanization";

/** Fully resolved profile for a Chinese variant selection. */
export interface ChineseVariantProfile {
  variant: ChineseLearningVariant;
  displayScript: "zh-Hans" | "zh-Hant";
  playbackDialect: "mandarin" | "cantonese";
  readingSystem: ChineseReadingSystem;
  ttsLocale: "zh-CN" | "zh-TW" | "zh-HK";
  sttLocale: "zh-CN" | "zh-TW" | "zh-HK";
  cloudTTSLanguageCode: "cmn-CN" | "yue-HK";
  label: string;
  compactLabel: string;
}

/** Fully resolved runtime context for the current active language selection. */
export interface ActiveLanguageContext {
  languageChoice: LanguageChoice;
  learningLanguage: "ja" | "zh";
  libraryScope: LibraryScope;
  chineseVariant: ChineseLearningVariant | null;
  chineseDisplayScript: "zh-Hans" | "zh-Hant" | null;
  chinesePlaybackDialect: "mandarin" | "cantonese" | null;
}

/** Canonical profiles for each Chinese variant. */
export const CHINESE_VARIANT_PROFILES: Record<
  ChineseLearningVariant,
  ChineseVariantProfile
> = {
  "mandarin-simplified": {
    variant: "mandarin-simplified",
    displayScript: "zh-Hans",
    playbackDialect: "mandarin",
    readingSystem: "pinyin",
    ttsLocale: "zh-CN",
    sttLocale: "zh-CN",
    cloudTTSLanguageCode: "cmn-CN",
    label: "Mandarin (简)",
    compactLabel: "简",
  },
  "mandarin-traditional-taiwan": {
    variant: "mandarin-traditional-taiwan",
    displayScript: "zh-Hant",
    playbackDialect: "mandarin",
    readingSystem: "pinyin",
    ttsLocale: "zh-TW",
    sttLocale: "zh-TW",
    cloudTTSLanguageCode: "cmn-CN",
    label: "Mandarin (繁/台)",
    compactLabel: "繁",
  },
  "cantonese-traditional": {
    variant: "cantonese-traditional",
    displayScript: "zh-Hant",
    playbackDialect: "cantonese",
    readingSystem: "jyutping",
    ttsLocale: "zh-HK",
    sttLocale: "zh-HK",
    cloudTTSLanguageCode: "yue-HK",
    label: "Cantonese",
    compactLabel: "粵",
  },
};

/**
 * Resolve a Chinese variant to its full profile. This is the single source of
 * truth for all downstream consumers that need variant-specific behaviour.
 */
export function resolveChineseVariantProfile(
  variant: ChineseLearningVariant,
): ChineseVariantProfile {
  return CHINESE_VARIANT_PROFILES[variant];
}

/**
 * Derive the best `ChineseLearningVariant` from legacy settings that only
 * persisted `chineseDisplayScript` and `chinesePlaybackDialect`.
 *
 * Migration rules:
 * - `zh-Hans` (any dialect) → `mandarin-simplified`
 * - `zh-Hant` + `cantonese` → `cantonese-traditional`
 * - `zh-Hant` + `mandarin` → `mandarin-traditional-taiwan`
 */
export function deriveChineseVariantFromLegacy(
  displayScript: "zh-Hans" | "zh-Hant",
  playbackDialect: "mandarin" | "cantonese",
): ChineseLearningVariant {
  if (displayScript === "zh-Hans") {
    return "mandarin-simplified";
  }
  if (playbackDialect === "cantonese") {
    return "cantonese-traditional";
  }
  return "mandarin-traditional-taiwan";
}

export function resolveLibraryScope(
  languageChoice: LanguageChoice,
): LibraryScope {
  if (languageChoice === "ja") {
    return "ja";
  }

  return languageChoice === "cantonese-traditional"
    ? "zh-cantonese"
    : "zh-mandarin";
}

export function resolveActiveLanguageContext(params: {
  learningLanguage: "ja" | "zh";
  chineseVariant?: ChineseLearningVariant | null;
  chineseDisplayScript?: "zh-Hans" | "zh-Hant" | null;
  chinesePlaybackDialect?: "mandarin" | "cantonese" | null;
}): ActiveLanguageContext {
  if (params.learningLanguage === "ja") {
    return {
      languageChoice: "ja",
      learningLanguage: "ja",
      libraryScope: "ja",
      chineseVariant: null,
      chineseDisplayScript: null,
      chinesePlaybackDialect: null,
    };
  }

  const chineseDisplayScript =
    params.chineseDisplayScript === "zh-Hant" ? "zh-Hant" : "zh-Hans";
  const chinesePlaybackDialect =
    params.chinesePlaybackDialect === "cantonese" ? "cantonese" : "mandarin";
  const chineseVariant =
    params.chineseVariant ??
    deriveChineseVariantFromLegacy(
      chineseDisplayScript,
      chinesePlaybackDialect,
    );
  const profile = resolveChineseVariantProfile(chineseVariant);

  return {
    languageChoice: chineseVariant,
    learningLanguage: "zh",
    libraryScope: resolveLibraryScope(chineseVariant),
    chineseVariant,
    chineseDisplayScript: profile.displayScript,
    chinesePlaybackDialect: profile.playbackDialect,
  };
}

// ─── Input Mode ─────────────────────────────────────────────────────────────

/**
 * Canonical replacement for the legacy `Direction` type.
 * - `en_to_target` — user typed English, translate to learning language
 * - `target_to_en` — user typed learning-language text, translate to English
 */
export type InputMode = "en_to_target" | "target_to_en";

// ─── Translation Result Contract ───────────────────────────────────────────

/** Where a normalized translation draft came from. */
export type TranslationSource = "local_cache" | "on_device" | "cloud";

/** Whether the draft is a weak on-device preview or a fully enriched result. */
export type TranslationCompleteness = "basic" | "enriched";

/** Capability metadata describing which enrichment fields are present. */
export interface TranslationCapabilities {
  hasReadingSegments: boolean;
  hasRomanization: boolean;
  hasRegister: boolean;
  hasAlternateForm: boolean;
  hasUsage: boolean;
  canRegenerateWithCloud: boolean;
}

// ─── Register ───────────────────────────────────────────────────────────────

/** Formality level of the target text. Null when not applicable (e.g. Chinese). */
export type RegisterLevel = "casual" | "polite" | "formal" | null;

// ─── Text Structures ────────────────────────────────────────────────────────

/**
 * A segment of target-language text with an optional phonetic reading.
 * For Japanese: token-level furigana. For Chinese: phrase/word-level pinyin.
 */
export interface ReadingSegment {
  text: string;
  reading: string | null;
}

export interface AlignedReadingSegment extends ReadingSegment {
  start: number;
  end: number;
}

export type StudyTokenKind = "word" | "grammar" | "phrase";

export interface StudyTokenNote {
  partOfSpeech?: string | null;
  meaning?: string | null;
  note?: string | null;
}

export type StudyTokenMetadata = JapaneseStudyTokenMetadata;

export type JapaneseStudyTokenMetadata =
  | JapaneseVerbMorphologyMetadata
  | JapaneseAdjectiveMorphologyMetadata;

export type MetadataConfidence = "high" | "medium" | "low";

export type JapaneseObservedForm =
  | "dictionary"
  | "plain"
  | "polite"
  | "polite-negative"
  | "polite-past"
  | "polite-past-negative"
  | "negative"
  | "past"
  | "past-negative"
  | "te-form"
  | "potential"
  | "before-noun"
  | "adverbial"
  | "conditional"
  | "unknown";

export type JapaneseVerbClass =
  | "ichidan"
  | "godan-u"
  | "godan-ku"
  | "godan-gu"
  | "godan-su"
  | "godan-tsu"
  | "godan-nu"
  | "godan-bu"
  | "godan-mu"
  | "godan-ru"
  | "suru"
  | "kuru"
  | "irregular";

export interface JapaneseVerbMorphologyMetadata {
  language: "ja";
  category: "morphology";
  kind: "verb";
  surface: string;
  lemma: string;
  verbClass: JapaneseVerbClass;
  observedForm?: JapaneseObservedForm | null;
  confidence: MetadataConfidence;
}

export interface JapaneseAdjectiveMorphologyMetadata {
  language: "ja";
  category: "morphology";
  kind: "adjective";
  surface: string;
  lemma: string;
  adjectiveClass: "i" | "na";
  observedForm?: JapaneseObservedForm | null;
  confidence: MetadataConfidence;
}

export interface StudyToken {
  id: string;
  surface: string;
  start: number;
  end: number;
  reading?: string | null;
  audioText: string;
  kind: StudyTokenKind;
  note: StudyTokenNote | null;
  metadata?: StudyTokenMetadata | null;
}

/**
 * Optional script variants for Chinese entries.
 * `primary` is the canonical display text and should equal the stored `targetText`.
 */
export interface TextVariants {
  primary: string;
  simplified?: string | null;
  traditional?: string | null;
}

export type NaturalnessLabel =
  | "common"
  | "neutral"
  | "bookish"
  | "rare"
  | "stiff";

export type ProficiencyLevel =
  | { framework: "jlpt"; level: "N5" | "N4" | "N3" | "N2" | "N1" }
  | { framework: "hsk"; level: "1" | "2" | "3" | "4" | "5" | "6" | "7-9" }
  | { framework: "topik"; level: "1" | "2" | "3" | "4" | "5" | "6" };

export type RegisterVariantRole =
  | "primary"
  | "casual"
  | "polite"
  | "formal"
  | "colloquial"
  | "formal_written"
  | "regional"
  | "nearby";

export interface RegisterVariant {
  text: string;
  role: RegisterVariantRole;
  register?: RegisterLevel;
  readingSegments?: ReadingSegment[];
  reading?: string | null;
  romanization?: string | null;
  translationText?: string | null;
  usageNote?: string | null;
}

export type UsageContrastKind =
  | "register"
  | "naturalness"
  | "meaning"
  | "grammar"
  | "regional"
  | "script"
  | "cantonese_colloquial_vs_formal";

export interface UsageContrast {
  text: string;
  kind: UsageContrastKind;
  label?: string | null;
  register?: RegisterLevel;
  readingSegments?: ReadingSegment[];
  reading?: string | null;
  romanization?: string | null;
  meaning?: string | null;
  whenToUse?: string | null;
  avoidWhen?: string | null;
  contrastNote: string;
}

export interface StructuredExample {
  text: string;
  readingSegments?: ReadingSegment[];
  reading?: string | null;
  romanization?: string | null;
  translationText?: string | null;
  register?: RegisterLevel;
  note?: string | null;
}

export interface CachedPhraseFragmentDetail {
  fragmentKey: string;
  kind: PhraseFragmentKind;
  sourcePath: PhraseFragmentSourcePath | null;
  text: string;
  speechText: string;
  targetLanguage: LearningLanguage;
  chineseVariant?: ChineseLearningVariant | null;
  readingSystem?: ChineseReadingSystem | null;
  targetTextVariants?: TextVariants | null;
  reading?: string | null;
  readingSegments: ReadingSegment[];
  translationText: string;
  register: RegisterLevel;
  source: TranslationSource;
  updatedAt: string;
}

export interface GrammarToken {
  token: string;
  partOfSpeech: string;
  meaning: string;
}

export interface CharacterBreakdown {
  character: string;
  meaning: string;
  components: string[];
}

export interface EnrichmentData {
  literalTranslation?: string | null;
  grammarBreakdown?: {
    confidence: "high" | "medium" | "low";
    tokens: GrammarToken[];
  } | null;
  characterBreakdown?: CharacterBreakdown[] | null;
  naturalness?: NaturalnessLabel | null;
  bestUsedWhen?: string | null;
  avoidWhen?: string | null;
  confusableAlternatives?: string[] | null;
  exampleSentence?: string | null;
  keywordTags?: string[] | null;
  proficiencyLevel?: ProficiencyLevel | null;
  cantoneseExamples?: {
    colloquial?: string | null;
    formalWritten?: string | null;
  } | null;
  korean?: KoreanEnrichmentMetadata | null;
  registerVariants?: RegisterVariant[] | null;
  usageContrasts?: UsageContrast[] | null;
  examples?: StructuredExample[] | null;
  noteFragmentDetails?: CachedPhraseFragmentDetail[] | null;
}

export interface KoreanEnrichmentMetadata {
  speechLevel?: "plain" | "casual" | "polite" | "formal" | null;
  registerLabel?: string | null;
  romanizationSystem?: "revised_romanization" | null;
  note?: string | null;
}

// ─── Learning Entry ─────────────────────────────────────────────────────────

/** A persisted learning entry in the canonical shape. */
export interface LearningEntry {
  id: number;
  targetLanguage: LearningLanguage;
  sourceLanguage: SourceLanguage;
  sourceText: string;
  targetText: string;
  targetTextVariants: TextVariants | null;
  chineseVariant?: ChineseLearningVariant | null;
  readingSystem?: ChineseReadingSystem | null;
  readingSegments: ReadingSegment[];
  romanization: string | null;
  translationText: string;
  register: RegisterLevel;
  alternateForm: string | null;
  usage: string | null;
  enrichment?: EnrichmentData | null;
  studyTokens: StudyToken[];
  category: Category;
  inputText: string;
  inputMode: InputMode;
  createdAt: number;
}

/** Draft shape produced by the translation service before persistence. */
export interface LearningEntryDraft {
  targetLanguage: LearningLanguage;
  sourceLanguage: SourceLanguage;
  sourceText: string;
  targetText: string;
  targetTextVariants: TextVariants | null;
  chineseVariant?: ChineseLearningVariant | null;
  readingSystem?: ChineseReadingSystem | null;
  readingSegments: ReadingSegment[];
  romanization: string | null;
  translationText: string;
  register: RegisterLevel;
  alternateForm: string | null;
  usage: string | null;
  enrichment?: EnrichmentData | null;
  studyTokens: StudyToken[];
}

/**
 * Normalized translation draft returned by the translation service.
 * It preserves the legacy draft fields while adding provider metadata.
 */
export interface TranslationDraft<
  TLanguage extends SupportedLearningLanguage = LearningLanguage,
>
  extends Omit<LearningEntryDraft, "targetLanguage" | "readingSystem"> {
  targetLanguage: TLanguage;
  readingSystem?: TLanguage extends "ko"
    ? ReadingSystem | null
    : ChineseReadingSystem | null;
  source: TranslationSource;
  completeness: TranslationCompleteness;
  capabilities: TranslationCapabilities;
  translationSchemaVersion?: number | null;
  enrichmentPromptVersion?: number | null;
  isStale?: boolean;
}

// ─── Pure Helpers ───────────────────────────────────────────────────────────

/**
 * Resolve the best display text for a Chinese entry given a script preference.
 *
 * Resolution order:
 * 1. The requested script variant from `targetTextVariants`
 * 2. `targetTextVariants.primary`
 * 3. `targetText` (fallback)
 *
 * For Japanese entries (or when `targetTextVariants` is null), returns `targetText`.
 */
export function resolveChineseDisplayText(
  targetText: string,
  targetTextVariants: TextVariants | null,
  preferredScript: "zh-Hans" | "zh-Hant"
): string {
  if (targetTextVariants == null) {
    return targetText;
  }

  const variant =
    preferredScript === "zh-Hans"
      ? targetTextVariants.simplified
      : targetTextVariants.traditional;

  if (variant != null && variant.length > 0) {
    return variant;
  }

  if (
    targetTextVariants.primary != null &&
    targetTextVariants.primary.length > 0
  ) {
    return targetTextVariants.primary;
  }

  return targetText;
}

/**
 * Validate that a `ReadingSegment[]` is structurally well-formed.
 *
 * Rules:
 * - Array must not be empty.
 * - Every segment must have a non-empty `text` field.
 * - `reading` may be `null` (e.g. kana-only segments), but when present must be non-empty.
 *
 * Returns `true` if valid, `false` otherwise.
 */
export function validateReadingSegments(
  segments: ReadingSegment[]
): boolean {
  if (!Array.isArray(segments) || segments.length === 0) {
    return false;
  }

  return segments.every((segment) => {
    if (typeof segment.text !== "string" || segment.text.length === 0) {
      return false;
    }
    if (
      segment.reading !== null &&
      (typeof segment.reading !== "string" || segment.reading.length === 0)
    ) {
      return false;
    }
    return true;
  });
}

export function normalizeReadingSupport(params: {
  targetText: string;
  readingSegments: ReadingSegment[] | null | undefined;
  romanization?: string | null;
}): {
  readingSegments: ReadingSegment[];
  romanization: string | null;
  preservesTargetText: boolean;
} {
  const alignedReadingSegments = alignReadingSegmentsToTargetText(
    params.targetText,
    params.readingSegments
  );
  const romanization =
    typeof params.romanization === "string" && params.romanization.trim().length > 0
      ? params.romanization
      : null;
  const preservesTargetText =
    alignedReadingSegments.length > 0 &&
    alignedReadingSegments.map((segment) => segment.text).join("") === params.targetText;

  return {
    readingSegments: alignedReadingSegments.map(({ start: _start, end: _end, ...segment }) => segment),
    romanization,
    preservesTargetText,
  };
}

export function isChineseLearningVariant(
  value: unknown
): value is ChineseLearningVariant {
  return (
    value === "mandarin-simplified" ||
    value === "mandarin-traditional-taiwan" ||
    value === "cantonese-traditional"
  );
}

export function isChineseReadingSystem(
  value: unknown
): value is ChineseReadingSystem {
  return value === "pinyin" || value === "jyutping";
}

export function isKoreanReadingSystem(
  value: unknown
): value is KoreanReadingSystem {
  return value === "hangul" || value === "revised_romanization";
}

export function isReadingSystem(value: unknown): value is ReadingSystem {
  return (
    value === "furigana" ||
    value === "romaji" ||
    isChineseReadingSystem(value) ||
    isKoreanReadingSystem(value)
  );
}

export function getChineseReadingSystemLabel(
  readingSystem: ChineseReadingSystem
): "Pinyin" | "Jyutping" {
  return readingSystem === "jyutping" ? "Jyutping" : "Pinyin";
}

export function resolveChineseReadingSystemMetadata(params: {
  targetLanguage: LearningLanguage;
  chineseVariant?: ChineseLearningVariant | null;
  readingSystem?: unknown;
}): ChineseReadingSystem | null {
  if (params.targetLanguage !== "zh") {
    return null;
  }

  if (isChineseReadingSystem(params.readingSystem)) {
    return params.readingSystem;
  }

  if (isChineseLearningVariant(params.chineseVariant)) {
    return resolveChineseVariantProfile(params.chineseVariant).readingSystem;
  }

  return "pinyin";
}

export function normalizeChineseReadingMetadata(params: {
  targetLanguage: LearningLanguage;
  chineseVariant?: unknown;
  readingSystem?: unknown;
  targetTextVariants?: TextVariants | null;
}): {
  chineseVariant: ChineseLearningVariant | null;
  readingSystem: ChineseReadingSystem | null;
};
export function normalizeChineseReadingMetadata(params: {
  targetLanguage: SupportedLearningLanguage;
  chineseVariant?: unknown;
  readingSystem?: unknown;
  targetTextVariants?: TextVariants | null;
}): {
  chineseVariant: ChineseLearningVariant | null;
  readingSystem: ReadingSystem | null;
};
export function normalizeChineseReadingMetadata(params: {
  targetLanguage: SupportedLearningLanguage;
  chineseVariant?: unknown;
  readingSystem?: unknown;
  targetTextVariants?: TextVariants | null;
}): {
  chineseVariant: ChineseLearningVariant | null;
  readingSystem: ReadingSystem | null;
} {
  if (params.targetLanguage !== "zh") {
    if (params.targetLanguage === "ko") {
      return {
        chineseVariant: null,
        readingSystem: isKoreanReadingSystem(params.readingSystem)
          ? params.readingSystem
          : "hangul",
      };
    }

    return {
      chineseVariant: null,
      readingSystem: isReadingSystem(params.readingSystem)
        ? params.readingSystem
        : null,
    };
  }

  const chineseVariant = isChineseLearningVariant(params.chineseVariant)
    ? params.chineseVariant
    : params.targetTextVariants?.traditional &&
        !params.targetTextVariants?.simplified
      ? "mandarin-traditional-taiwan"
      : "mandarin-simplified";
  const expectedReadingSystem =
    resolveChineseVariantProfile(chineseVariant).readingSystem;

  return {
    chineseVariant,
    readingSystem: isChineseReadingSystem(params.readingSystem)
      ? params.readingSystem
      : expectedReadingSystem,
  };
}

function isReadingSegmentRecord(value: unknown): value is ReadingSegment {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { text?: unknown }).text === "string" &&
    (typeof (value as { reading?: unknown }).reading === "string" ||
      (value as { reading?: unknown }).reading === null)
  );
}

function sanitizeReadingSegments(
  readingSegments: ReadingSegment[] | null | undefined
): ReadingSegment[] {
  if (!Array.isArray(readingSegments)) {
    return [];
  }

  return readingSegments.flatMap((segment): ReadingSegment[] => {
    if (!isReadingSegmentRecord(segment)) {
      return [];
    }

    const text = segment.text.trim();
    if (text.length === 0) {
      return [];
    }

    if (segment.reading === null) {
      return [{ text, reading: null }];
    }

    const reading = segment.reading.trim();
    if (reading.length === 0) {
      return [];
    }

    return [{ text, reading }];
  });
}

export function alignReadingSegmentsToTargetText(
  targetText: string,
  readingSegments: ReadingSegment[] | null | undefined
): AlignedReadingSegment[] {
  const sanitizedReadingSegments = sanitizeReadingSegments(readingSegments);
  if (sanitizedReadingSegments.length === 0 || targetText.length === 0) {
    return [];
  }

  const alignedSegments: AlignedReadingSegment[] = [];
  let cursor = 0;

  for (const segment of sanitizedReadingSegments) {
    const start = targetText.indexOf(segment.text, cursor);
    if (start === -1) {
      continue;
    }

    const end = start + segment.text.length;
    alignedSegments.push({
      ...segment,
      start,
      end,
    });
    cursor = end;
  }

  return alignedSegments;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toOptionalString(value: unknown): string | null | undefined {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function toNullableString(value: unknown): string | null | undefined {
  if (value == null) {
    return null;
  }
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function sanitizeStringArray(value: unknown): string[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);

  return items.length > 0 ? items : null;
}

function hasWordLikeCharacters(value: string): boolean {
  return /[\p{L}\p{N}]/u.test(value);
}

function containsNativeLearningScript(value: string): boolean {
  return /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u.test(value);
}

function isLatinRomanizationLike(value: string): boolean {
  return /^[\p{Script=Latin}\p{M}\p{N}\s'’\-.:]+$/u.test(value);
}

function sanitizeStudyTokenNote(value: unknown): StudyTokenNote | null | undefined {
  if (value == null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const partOfSpeech = toOptionalString(value.partOfSpeech);
  const meaning = toOptionalString(value.meaning);
  const note = toOptionalString(value.note);

  if (
    partOfSpeech === undefined ||
    meaning === undefined ||
    note === undefined
  ) {
    return undefined;
  }

  if (partOfSpeech == null && meaning == null && note == null) {
    return null;
  }

  return {
    partOfSpeech,
    meaning,
    note,
  };
}

const METADATA_CONFIDENCES: MetadataConfidence[] = ["high", "medium", "low"];
const JAPANESE_OBSERVED_FORMS: JapaneseObservedForm[] = [
  "dictionary",
  "plain",
  "polite",
  "polite-negative",
  "polite-past",
  "polite-past-negative",
  "negative",
  "past",
  "past-negative",
  "te-form",
  "potential",
  "before-noun",
  "adverbial",
  "conditional",
  "unknown",
];
const JAPANESE_VERB_CLASSES: JapaneseVerbClass[] = [
  "ichidan",
  "godan-u",
  "godan-ku",
  "godan-gu",
  "godan-su",
  "godan-tsu",
  "godan-nu",
  "godan-bu",
  "godan-mu",
  "godan-ru",
  "suru",
  "kuru",
  "irregular",
];

function isMetadataConfidence(value: unknown): value is MetadataConfidence {
  return (
    typeof value === "string" &&
    METADATA_CONFIDENCES.includes(value as MetadataConfidence)
  );
}

function isJapaneseObservedForm(value: unknown): value is JapaneseObservedForm {
  return (
    typeof value === "string" &&
    JAPANESE_OBSERVED_FORMS.includes(value as JapaneseObservedForm)
  );
}

function isJapaneseVerbClass(value: unknown): value is JapaneseVerbClass {
  return (
    typeof value === "string" &&
    JAPANESE_VERB_CLASSES.includes(value as JapaneseVerbClass)
  );
}

function sanitizeJapaneseObservedForm(
  value: unknown
): JapaneseObservedForm | null | undefined {
  if (value == null) {
    return null;
  }
  return isJapaneseObservedForm(value) ? value : undefined;
}

function sanitizeStudyTokenMetadata(
  value: unknown,
  tokenSurface: string
): StudyTokenMetadata | null | undefined {
  if (value == null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }
  if (value.language !== "ja" || value.category !== "morphology") {
    return undefined;
  }

  const metadataSurface = toOptionalString(value.surface);
  const lemma = toOptionalString(value.lemma);
  const observedForm = sanitizeJapaneseObservedForm(value.observedForm);
  if (
    metadataSurface == null ||
    metadataSurface !== tokenSurface.trim() ||
    lemma == null ||
    observedForm === undefined ||
    !isMetadataConfidence(value.confidence)
  ) {
    return undefined;
  }

  if (value.kind === "verb" && isJapaneseVerbClass(value.verbClass)) {
    return {
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: metadataSurface,
      lemma,
      verbClass: value.verbClass,
      observedForm,
      confidence: value.confidence,
    };
  }

  if (
    value.kind === "adjective" &&
    (value.adjectiveClass === "i" || value.adjectiveClass === "na")
  ) {
    return {
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: metadataSurface,
      lemma,
      adjectiveClass: value.adjectiveClass,
      observedForm,
      confidence: value.confidence,
    };
  }

  return undefined;
}

const ISOLATED_JAPANESE_COPULA_SURFACES = new Set(["だ", "です", "だった", "でした"]);
const JAPANESE_COPULA_LEMMAS = new Set(["だ", "です"]);

interface JapaneseAdjectiveMetadataSeed {
  adjectiveClass: "i" | "na";
  lemma: string;
  confidence: MetadataConfidence;
}

interface JapaneseAdjectiveAuxiliaryMatch {
  surface: string;
  observedForm: JapaneseObservedForm;
  consumedIndexes: number[];
}

function isUnsupportedIsolatedJapaneseMetadata(
  metadata: StudyTokenMetadata | null | undefined,
  note: StudyTokenNote | null | undefined
): boolean {
  if (metadata == null || metadata.kind !== "adjective") {
    return false;
  }

  const surface = metadata.surface.trim();
  const lemma = metadata.lemma.trim();
  const hasIsolatedCopulaShape =
    ISOLATED_JAPANESE_COPULA_SURFACES.has(surface) || JAPANESE_COPULA_LEMMAS.has(lemma);
  if (!hasIsolatedCopulaShape) {
    return false;
  }

  const partOfSpeech = note?.partOfSpeech?.trim().toLowerCase() ?? "";
  return (
    partOfSpeech.includes("copula") ||
    partOfSpeech.includes("auxiliary") ||
    ISOLATED_JAPANESE_COPULA_SURFACES.has(surface) ||
    JAPANESE_COPULA_LEMMAS.has(lemma)
  );
}

function isJapaneseAdjectiveMetadata(
  metadata: StudyTokenMetadata | null | undefined
): metadata is JapaneseAdjectiveMorphologyMetadata {
  return (
    metadata != null &&
    metadata.language === "ja" &&
    metadata.category === "morphology" &&
    metadata.kind === "adjective"
  );
}

function isJapaneseAdjectivePartOfSpeech(
  note: StudyTokenNote | null | undefined
): boolean {
  const partOfSpeech = note?.partOfSpeech?.trim().toLowerCase() ?? "";
  return (
    partOfSpeech.includes("adjective") ||
    partOfSpeech.includes("形容詞") ||
    partOfSpeech.includes("形容動詞")
  );
}

function isJapaneseNaAdjectivePartOfSpeech(
  note: StudyTokenNote | null | undefined
): boolean {
  const partOfSpeech = note?.partOfSpeech?.trim().toLowerCase() ?? "";
  return (
    partOfSpeech.includes("na-adjective") ||
    partOfSpeech.includes("adjectival noun") ||
    partOfSpeech.includes("形容動詞")
  );
}

function stripTrailingJapaneseNa(value: string): string {
  return value.endsWith("な") ? value.slice(0, -1) : value;
}

function inferIAdjectiveLemmaFromSurface(surface: string): string | null {
  const pastNegativeSuffix = "くなかった";
  const negativeSuffix = "くない";
  const pastSuffix = "かった";

  if (surface.endsWith(pastNegativeSuffix)) {
    return `${surface.slice(0, surface.length - pastNegativeSuffix.length)}い`;
  }
  if (surface.endsWith(negativeSuffix)) {
    return `${surface.slice(0, surface.length - negativeSuffix.length)}い`;
  }
  if (surface.endsWith(pastSuffix)) {
    return `${surface.slice(0, surface.length - pastSuffix.length)}い`;
  }
  if (surface.endsWith("く")) {
    return `${surface.slice(0, -1)}い`;
  }
  if (surface.endsWith("い")) {
    return surface;
  }
  return null;
}

function inferJapaneseAdjectiveMetadataSeed(
  token: StudyToken
): JapaneseAdjectiveMetadataSeed | null {
  if (isJapaneseAdjectiveMetadata(token.metadata)) {
    return {
      adjectiveClass: token.metadata.adjectiveClass,
      lemma: token.metadata.lemma,
      confidence: token.metadata.confidence,
    };
  }

  if (!isJapaneseAdjectivePartOfSpeech(token.note)) {
    return null;
  }

  if (isJapaneseNaAdjectivePartOfSpeech(token.note)) {
    const lemma = stripTrailingJapaneseNa(token.surface.trim());
    return lemma.length === 0
      ? null
      : { adjectiveClass: "na", lemma, confidence: "high" };
  }

  const lemma = inferIAdjectiveLemmaFromSurface(token.surface.trim());
  return lemma == null || lemma.length === 0
    ? null
    : { adjectiveClass: "i", lemma, confidence: "high" };
}

function getIAdjectiveStem(lemma: string): string | null {
  if (lemma === "いい") {
    return "よ";
  }
  if (!lemma.endsWith("い")) {
    return null;
  }
  return lemma.slice(0, -1);
}

function getJapaneseAdjectiveAuxiliaryPatterns(
  tokenSurface: string,
  seed: JapaneseAdjectiveMetadataSeed
): Array<{ suffix: string; observedForm: JapaneseObservedForm }> {
  if (seed.adjectiveClass === "na") {
    const base = stripTrailingJapaneseNa(seed.lemma);
    if (tokenSurface !== base) {
      return [];
    }
    return [
      { suffix: "じゃありませんでした", observedForm: "polite-past-negative" },
      { suffix: "ではありませんでした", observedForm: "polite-past-negative" },
      { suffix: "じゃなかった", observedForm: "past-negative" },
      { suffix: "ではなかった", observedForm: "past-negative" },
      { suffix: "じゃありません", observedForm: "polite-negative" },
      { suffix: "ではありません", observedForm: "polite-negative" },
      { suffix: "じゃない", observedForm: "negative" },
      { suffix: "ではない", observedForm: "negative" },
      { suffix: "でした", observedForm: "polite-past" },
      { suffix: "だった", observedForm: "past" },
      { suffix: "です", observedForm: "polite" },
      { suffix: "で", observedForm: "te-form" },
    ];
  }

  const stem = getIAdjectiveStem(seed.lemma);
  if (stem == null) {
    return [];
  }

  if (tokenSurface === seed.lemma) {
    return [{ suffix: "です", observedForm: "polite" }];
  }

  if (tokenSurface === `${stem}かった`) {
    return [{ suffix: "です", observedForm: "polite-past" }];
  }

  if (tokenSurface === `${stem}くなかった`) {
    return [{ suffix: "です", observedForm: "polite-past-negative" }];
  }

  if (tokenSurface === `${stem}くない`) {
    return [{ suffix: "です", observedForm: "polite-negative" }];
  }

  if (tokenSurface !== `${stem}く`) {
    return [];
  }

  return [
    { suffix: "ありませんでした", observedForm: "polite-past-negative" },
    { suffix: "なかったです", observedForm: "polite-past-negative" },
    { suffix: "ありません", observedForm: "polite-negative" },
    { suffix: "ないです", observedForm: "polite-negative" },
    { suffix: "なかった", observedForm: "past-negative" },
    { suffix: "ない", observedForm: "negative" },
  ];
}

function findContiguousSuffixTokenIndexes(
  studyTokens: StudyToken[],
  tokenIndex: number,
  suffix: string
): number[] | null {
  let cursor = 0;
  let expectedStart = studyTokens[tokenIndex]?.end;
  const indexes: number[] = [];

  for (let index = tokenIndex + 1; index < studyTokens.length; index += 1) {
    const token = studyTokens[index];
    if (expectedStart == null || token.start !== expectedStart) {
      return null;
    }
    if (!suffix.startsWith(token.surface, cursor)) {
      return null;
    }

    cursor += token.surface.length;
    expectedStart = token.end;
    indexes.push(index);

    if (cursor === suffix.length) {
      return indexes;
    }
  }

  return null;
}

function findJapaneseAdjectiveAuxiliaryMatch(
  studyTokens: StudyToken[],
  tokenIndex: number
): JapaneseAdjectiveAuxiliaryMatch | null {
  const token = studyTokens[tokenIndex];
  const seed = inferJapaneseAdjectiveMetadataSeed(token);
  if (seed == null) {
    return null;
  }

  const patterns = getJapaneseAdjectiveAuxiliaryPatterns(token.surface, seed).sort(
    (left, right) => right.suffix.length - left.suffix.length
  );

  for (const pattern of patterns) {
    const consumedIndexes = findContiguousSuffixTokenIndexes(
      studyTokens,
      tokenIndex,
      pattern.suffix
    );
    if (consumedIndexes != null && consumedIndexes.length > 0) {
      return {
        surface: `${token.surface}${pattern.suffix}`,
        observedForm: pattern.observedForm,
        consumedIndexes,
      };
    }
  }

  return null;
}

function removeStudyTokenMetadata(token: StudyToken): StudyToken {
  const { metadata: _metadata, ...rest } = token;
  return {
    ...rest,
    kind: rest.kind === "word" ? "grammar" : rest.kind,
  };
}

function repairSplitJapaneseAdjectiveMetadata(studyTokens: StudyToken[]): StudyToken[] {
  const replacements = new Map<number, StudyToken>();
  const consumedAuxiliaryIndexes = new Set<number>();

  for (let index = 0; index < studyTokens.length; index += 1) {
    if (consumedAuxiliaryIndexes.has(index)) {
      continue;
    }

    const token = studyTokens[index];
    const match = findJapaneseAdjectiveAuxiliaryMatch(studyTokens, index);
    if (match == null) {
      continue;
    }

    const existingMetadata = isJapaneseAdjectiveMetadata(token.metadata)
      ? token.metadata
      : null;
    const seed = inferJapaneseAdjectiveMetadataSeed(token);
    if (seed == null) {
      continue;
    }

    const metadata: JapaneseAdjectiveMorphologyMetadata =
      existingMetadata == null
        ? {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: match.surface,
            lemma: seed.lemma,
            adjectiveClass: seed.adjectiveClass,
            observedForm: match.observedForm,
            confidence: seed.confidence,
          }
        : {
            ...existingMetadata,
            surface: match.surface,
            observedForm: match.observedForm,
          };

    replacements.set(index, { ...token, metadata });
    for (const consumedIndex of match.consumedIndexes) {
      consumedAuxiliaryIndexes.add(consumedIndex);
    }
  }

  if (replacements.size === 0 && consumedAuxiliaryIndexes.size === 0) {
    return studyTokens;
  }

  return studyTokens.map((token, index) => {
    const replacement = replacements.get(index);
    if (replacement != null) {
      return replacement;
    }
    if (consumedAuxiliaryIndexes.has(index)) {
      return removeStudyTokenMetadata(token);
    }
    return token;
  });
}

function normalizeComparableToken(value: string) {
  return value.replace(/[。、，,！!？?：:；;"'”“「」『』（）()\s]/g, "").trim();
}

export function hasStudyTokenNoteContent(note: StudyTokenNote | null | undefined) {
  return (
    (typeof note?.partOfSpeech === "string" && note.partOfSpeech.trim().length > 0) ||
    (typeof note?.meaning === "string" && note.meaning.trim().length > 0) ||
    (typeof note?.note === "string" && note.note.trim().length > 0)
  );
}

function resolveStudyTokenSpan(params: {
  targetText: string;
  surface: string;
  start: number;
  end: number;
  searchCursor: number;
}): { start: number; end: number } | null {
  if (
    Number.isInteger(params.start) &&
    Number.isInteger(params.end) &&
    params.start >= 0 &&
    params.end > params.start &&
    params.end <= params.targetText.length &&
    params.targetText.slice(params.start, params.end) === params.surface
  ) {
    return { start: params.start, end: params.end };
  }

  const alignedStart = params.targetText.indexOf(params.surface, params.searchCursor);
  const start =
    alignedStart >= 0 ? alignedStart : params.targetText.indexOf(params.surface);

  if (start < 0) {
    return null;
  }

  return {
    start,
    end: start + params.surface.length,
  };
}

export function promoteGrammarNotesToStudyTokens(params: {
  studyTokens: StudyToken[];
  enrichment: EnrichmentData | null;
}): StudyToken[] {
  const grammarTokens = params.enrichment?.grammarBreakdown?.tokens ?? [];
  if (grammarTokens.length === 0 || params.studyTokens.length === 0) {
    return params.studyTokens;
  }

  return params.studyTokens.map((studyToken) => {
    if (hasStudyTokenNoteContent(studyToken.note)) {
      return studyToken;
    }

    const normalizedSurface = normalizeComparableToken(studyToken.surface);
    if (!normalizedSurface) {
      return studyToken;
    }

    const grammarMatch = grammarTokens.find((grammarToken) => {
      return normalizeComparableToken(grammarToken.token) === normalizedSurface;
    });

    if (!grammarMatch) {
      return studyToken;
    }

    return {
      ...studyToken,
      note: {
        partOfSpeech: grammarMatch.partOfSpeech,
        meaning: grammarMatch.meaning,
        note: null,
      },
    };
  });
}

export function sanitizeStudyTokens(
  value: unknown,
  targetText: string
): { studyTokens: StudyToken[]; droppedSections: string[] } {
  if (value == null) {
    return { studyTokens: [], droppedSections: [] };
  }
  if (!Array.isArray(value)) {
    return { studyTokens: [], droppedSections: ["studyTokens"] };
  }

  const droppedSections: string[] = [];
  const dedupe = new Set<string>();
  let searchCursor = 0;
  const studyTokens = value.flatMap((item, index): StudyToken[] => {
    if (!isRecord(item)) {
      droppedSections.push(`studyTokens:${index}`);
      return [];
    }

    const start = typeof item.start === "number" ? item.start : Number.NaN;
    const end = typeof item.end === "number" ? item.end : Number.NaN;
    const surface = toOptionalString(item.surface);
    const reading = toOptionalString(item.reading);
    const rawAudioText = toOptionalString(item.audioText);
    const note = sanitizeStudyTokenNote(item.note);
    const hasMetadata = Object.prototype.hasOwnProperty.call(item, "metadata");
    const metadata = hasMetadata
      ? sanitizeStudyTokenMetadata(item.metadata, surface ?? "")
      : undefined;

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      typeof surface !== "string" ||
      surface.length === 0 ||
      reading === undefined ||
      rawAudioText === undefined ||
      note === undefined
    ) {
      droppedSections.push(`studyTokens:${index}`);
      return [];
    }

    if (hasMetadata && metadata === undefined) {
      droppedSections.push(`studyTokens[${index}].metadata`);
    }
    const safeMetadata = isUnsupportedIsolatedJapaneseMetadata(metadata, note)
      ? undefined
      : metadata;
    if (metadata != null && safeMetadata === undefined) {
      droppedSections.push(`studyTokens[${index}].metadata`);
    }

    const span = resolveStudyTokenSpan({
      targetText,
      surface,
      start,
      end,
      searchCursor,
    });
    if (span == null) {
      droppedSections.push(`studyTokens:${index}`);
      return [];
    }

    const canonicalSurface = targetText.slice(span.start, span.end);
    if (canonicalSurface !== surface || !hasWordLikeCharacters(surface)) {
      droppedSections.push(`studyTokens:${index}`);
      return [];
    }

    const normalizedRawAudioText = rawAudioText?.trim() || surface;
    const audioText =
      containsNativeLearningScript(surface) && isLatinRomanizationLike(normalizedRawAudioText)
        ? surface
        : normalizedRawAudioText;
    const kind =
      item.kind === "word" || item.kind === "grammar" || item.kind === "phrase"
        ? item.kind
        : "word";
    const dedupeKey = `${span.start}:${span.end}:${audioText}`;
    if (dedupe.has(dedupeKey)) {
      droppedSections.push(`studyTokens:${index}`);
      return [];
    }
    dedupe.add(dedupeKey);
    searchCursor = span.end;

    return [
      {
        id:
          typeof item.id === "string" && item.id.length > 0
            ? item.id
            : `${span.start}:${span.end}:${surface}`,
        surface,
        start: span.start,
        end: span.end,
        reading,
        audioText,
        kind,
        note,
        ...(safeMetadata !== undefined ? { metadata: safeMetadata } : {}),
      },
    ];
  });

  return {
    studyTokens: repairSplitJapaneseAdjectiveMetadata(studyTokens),
    droppedSections,
  };
}

function createFallbackStudyToken(params: {
  surface: string;
  start: number;
  end: number;
  reading: string | null;
  kind: StudyTokenKind;
}): StudyToken {
  return {
    id: `${params.start}:${params.end}:${params.surface}`,
    surface: params.surface,
    start: params.start,
    end: params.end,
    reading: params.reading,
    audioText: params.surface,
    kind: params.kind,
    note: null,
  };
}

function createFullPhraseFallbackToken(targetText: string): StudyToken {
  return createFallbackStudyToken({
    surface: targetText,
    start: 0,
    end: targetText.length,
    reading: null,
    kind: "phrase",
  });
}

export function buildFallbackStudyTokens(params: {
  targetText: string;
  readingSegments: ReadingSegment[];
  targetLanguage: SupportedLearningLanguage;
}): StudyToken[] {
  const { targetText, readingSegments } = params;

  if (!hasWordLikeCharacters(targetText)) {
    return [];
  }

  if (!Array.isArray(readingSegments) || readingSegments.length === 0) {
    return [createFullPhraseFallbackToken(targetText)];
  }

  const studyTokens: StudyToken[] = [];
  let offset = 0;

  for (const segment of readingSegments) {
    if (typeof segment.text !== "string" || segment.text.length === 0) {
      return [createFullPhraseFallbackToken(targetText)];
    }

    const start = offset;
    const end = start + segment.text.length;
    const surface = targetText.slice(start, end);

    if (surface !== segment.text) {
      return [createFullPhraseFallbackToken(targetText)];
    }

    offset = end;
    if (!hasWordLikeCharacters(surface)) {
      continue;
    }

    studyTokens.push(
      createFallbackStudyToken({
        surface,
        start,
        end,
        reading: segment.reading,
        kind: "word",
      })
    );
  }

  if (offset !== targetText.length) {
    return [createFullPhraseFallbackToken(targetText)];
  }

  if (studyTokens.length > 0) {
    return studyTokens;
  }

  return [createFullPhraseFallbackToken(targetText)];
}

function sanitizeGrammarTokens(value: unknown): GrammarToken[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((token): GrammarToken[] => {
    if (!isRecord(token)) {
      return [];
    }

    const normalizedToken = toOptionalString(token.token);
    const partOfSpeech = toOptionalString(token.partOfSpeech);
    const meaning = toOptionalString(token.meaning);

    if (
      normalizedToken == null ||
      partOfSpeech == null ||
      meaning == null
    ) {
      return [];
    }

    return [
      {
        token: normalizedToken,
        partOfSpeech,
        meaning,
      },
    ];
  });
}

function sanitizeCharacterBreakdown(
  value: unknown
): CharacterBreakdown[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.flatMap((entry): CharacterBreakdown[] => {
    if (!isRecord(entry)) {
      return [];
    }

    const character = toOptionalString(entry.character);
    const meaning = toOptionalString(entry.meaning);
    const components = sanitizeStringArray(entry.components);

    if (character == null || meaning == null || components == null) {
      return [];
    }

    return [{ character, meaning, components }];
  });

  return items.length > 0 ? items : null;
}

function sanitizeProficiencyLevel(
  value: unknown
): ProficiencyLevel | null | undefined {
  if (value == null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  if (
    value.framework === "jlpt" &&
    ["N5", "N4", "N3", "N2", "N1"].includes(String(value.level))
  ) {
    return {
      framework: "jlpt",
      level: value.level as "N5" | "N4" | "N3" | "N2" | "N1",
    };
  }

  if (
    value.framework === "hsk" &&
    ["1", "2", "3", "4", "5", "6", "7-9"].includes(String(value.level))
  ) {
    return {
      framework: "hsk",
      level: value.level as "1" | "2" | "3" | "4" | "5" | "6" | "7-9",
    };
  }

  if (
    value.framework === "topik" &&
    ["1", "2", "3", "4", "5", "6"].includes(String(value.level))
  ) {
    return {
      framework: "topik",
      level: value.level as "1" | "2" | "3" | "4" | "5" | "6",
    };
  }

  return undefined;
}

const REGISTER_VARIANT_ROLES: RegisterVariantRole[] = [
  "primary",
  "casual",
  "polite",
  "formal",
  "colloquial",
  "formal_written",
  "regional",
  "nearby",
];

const USAGE_CONTRAST_KINDS: UsageContrastKind[] = [
  "register",
  "naturalness",
  "meaning",
  "grammar",
  "regional",
  "script",
  "cantonese_colloquial_vs_formal",
];
const PHRASE_FRAGMENT_KINDS: PhraseFragmentKind[] = [
  "alternate",
  "example",
  "confusable",
  "cantonese_colloquial",
  "formal_written",
  "register_variant",
  "usage_contrast",
  "structured_example",
];
const NOTE_FRAGMENT_DETAILS_CAP = 12;

function isRegisterLevelValue(value: unknown): value is Exclude<RegisterLevel, null> {
  return value === "casual" || value === "polite" || value === "formal";
}

function sanitizeNullableRegister(value: unknown): RegisterLevel | undefined {
  if (value == null) {
    return null;
  }

  return isRegisterLevelValue(value) ? value : undefined;
}

function isRegisterVariantRole(value: unknown): value is RegisterVariantRole {
  return (
    typeof value === "string" &&
    REGISTER_VARIANT_ROLES.includes(value as RegisterVariantRole)
  );
}

function isUsageContrastKind(value: unknown): value is UsageContrastKind {
  return (
    typeof value === "string" &&
    USAGE_CONTRAST_KINDS.includes(value as UsageContrastKind)
  );
}

function isPhraseFragmentKind(value: unknown): value is PhraseFragmentKind {
  return (
    typeof value === "string" &&
    PHRASE_FRAGMENT_KINDS.includes(value as PhraseFragmentKind)
  );
}

function isPhraseFragmentSourcePath(
  value: unknown
): value is PhraseFragmentSourcePath {
  return (
    value === "alternateForm" ||
    value === "enrichment.exampleSentence" ||
    value === "enrichment.cantoneseExamples.colloquial" ||
    value === "enrichment.cantoneseExamples.formalWritten" ||
    (typeof value === "string" &&
      /^enrichment\.(?:confusableAlternatives|registerVariants|usageContrasts|examples)\.\d+$/.test(
        value
      ))
  );
}

function isLearningLanguage(value: unknown): value is LearningLanguage {
  return value === "ja" || value === "zh";
}

function isTranslationSource(value: unknown): value is TranslationSource {
  return value === "local_cache" || value === "on_device" || value === "cloud";
}

function sanitizeTextVariants(value: unknown): TextVariants | null | undefined {
  if (value == null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const primary = toOptionalString(value.primary);
  const simplified = toNullableString(value.simplified);
  const traditional = toNullableString(value.traditional);
  if (
    primary == null ||
    simplified === undefined ||
    traditional === undefined
  ) {
    return undefined;
  }

  return {
    primary,
    simplified,
    traditional,
  };
}

function isTargetLanguageText(value: string): boolean {
  if (!containsNativeLearningScript(value)) {
    return false;
  }

  return !/[\p{Script=Latin}]/u.test(value);
}

function capStructuredItems<T>(params: {
  items: T[];
  cap: number;
  sectionName: string;
  droppedSections: string[];
}): T[] {
  if (params.items.length <= params.cap) {
    return params.items;
  }

  params.droppedSections.push(`${params.sectionName}:cap_exceeded`);
  return params.items.slice(0, params.cap);
}

function sanitizeRegisterVariants(
  value: unknown,
  droppedSections: string[]
): RegisterVariant[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.flatMap((entry, index): RegisterVariant[] => {
    if (!isRecord(entry)) {
      droppedSections.push(`registerVariants:${index}`);
      return [];
    }

    const text = toOptionalString(entry.text);
    if (text == null || !isTargetLanguageText(text)) {
      droppedSections.push(`registerVariants:${index}`);
      return [];
    }

    if (!isRegisterVariantRole(entry.role)) {
      droppedSections.push(`registerVariants:${index}`);
      return [];
    }

    const register = sanitizeNullableRegister(entry.register);
    if (register === undefined) {
      droppedSections.push(`registerVariants:${index}`);
      return [];
    }

    const reading = toNullableString(entry.reading);
    const romanization = toNullableString(entry.romanization);
    const readingSupport = normalizeReadingSupport({
      targetText: text,
      readingSegments: Array.isArray(entry.readingSegments)
        ? (entry.readingSegments as ReadingSegment[])
        : null,
      romanization: romanization ?? reading,
    });
    const translationText = toNullableString(entry.translationText);
    const usageNote = toNullableString(entry.usageNote);
    if (
      reading === undefined ||
      romanization === undefined ||
      translationText === undefined ||
      usageNote === undefined
    ) {
      droppedSections.push(`registerVariants:${index}`);
      return [];
    }

    return [
      {
        text,
        role: entry.role,
        register,
        readingSegments: readingSupport.readingSegments,
        reading,
        romanization,
        translationText,
        usageNote,
      },
    ];
  });

  const cappedItems = capStructuredItems({
    items,
    cap: 4,
    sectionName: "registerVariants",
    droppedSections,
  });
  return cappedItems.length > 0 ? cappedItems : null;
}

function sanitizeUsageContrasts(
  value: unknown,
  droppedSections: string[]
): UsageContrast[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.flatMap((entry, index): UsageContrast[] => {
    if (!isRecord(entry)) {
      droppedSections.push(`usageContrasts:${index}`);
      return [];
    }

    const text = toOptionalString(entry.text);
    if (text == null || !isTargetLanguageText(text)) {
      droppedSections.push(`usageContrasts:${index}`);
      return [];
    }

    if (!isUsageContrastKind(entry.kind)) {
      droppedSections.push(`usageContrasts:${index}`);
      return [];
    }

    const contrastNote = toOptionalString(entry.contrastNote);
    if (contrastNote == null) {
      droppedSections.push("usageContrasts:missing_contrastNote");
      return [];
    }

    const register = sanitizeNullableRegister(entry.register);
    if (register === undefined) {
      droppedSections.push(`usageContrasts:${index}`);
      return [];
    }

    const label = toNullableString(entry.label);
    const reading = toNullableString(entry.reading);
    const romanization = toNullableString(entry.romanization);
    const readingSupport = normalizeReadingSupport({
      targetText: text,
      readingSegments: Array.isArray(entry.readingSegments)
        ? (entry.readingSegments as ReadingSegment[])
        : null,
      romanization: romanization ?? reading,
    });
    const meaning = toNullableString(entry.meaning);
    const whenToUse = toNullableString(entry.whenToUse);
    const avoidWhen = toNullableString(entry.avoidWhen);
    if (
      label === undefined ||
      reading === undefined ||
      romanization === undefined ||
      meaning === undefined ||
      whenToUse === undefined ||
      avoidWhen === undefined
    ) {
      droppedSections.push(`usageContrasts:${index}`);
      return [];
    }

    return [
      {
        text,
        kind: entry.kind,
        label,
        register,
        readingSegments: readingSupport.readingSegments,
        reading,
        romanization,
        meaning,
        whenToUse,
        avoidWhen,
        contrastNote,
      },
    ];
  });

  const cappedItems = capStructuredItems({
    items,
    cap: 4,
    sectionName: "usageContrasts",
    droppedSections,
  });
  return cappedItems.length > 0 ? cappedItems : null;
}

function sanitizeStructuredExamples(
  value: unknown,
  droppedSections: string[]
): StructuredExample[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.flatMap((entry, index): StructuredExample[] => {
    if (!isRecord(entry)) {
      droppedSections.push(`examples:${index}`);
      return [];
    }

    const text = toOptionalString(entry.text);
    if (text == null || !isTargetLanguageText(text)) {
      droppedSections.push(`examples:${index}`);
      return [];
    }

    const register = sanitizeNullableRegister(entry.register);
    if (register === undefined) {
      droppedSections.push(`examples:${index}`);
      return [];
    }

    const reading = toNullableString(entry.reading);
    const romanization = toNullableString(entry.romanization);
    const readingSupport = normalizeReadingSupport({
      targetText: text,
      readingSegments: Array.isArray(entry.readingSegments)
        ? (entry.readingSegments as ReadingSegment[])
        : null,
      romanization: romanization ?? reading,
    });
    const translationText = toNullableString(entry.translationText);
    const note = toNullableString(entry.note);
    if (
      reading === undefined ||
      romanization === undefined ||
      translationText === undefined ||
      note === undefined
    ) {
      droppedSections.push(`examples:${index}`);
      return [];
    }

    return [
      {
        text,
        readingSegments: readingSupport.readingSegments,
        reading,
        romanization,
        translationText,
        register,
        note,
      },
    ];
  });

  const cappedItems = capStructuredItems({
    items,
    cap: 2,
    sectionName: "examples",
    droppedSections,
  });
  return cappedItems.length > 0 ? cappedItems : null;
}

function sanitizeCachedPhraseFragmentDetails(
  value: unknown,
  droppedSections: string[]
): CachedPhraseFragmentDetail[] | null | undefined {
  if (value == null) {
    return null;
  }
  if (!Array.isArray(value)) {
    return undefined;
  }

  const items = value.flatMap((entry, index): CachedPhraseFragmentDetail[] => {
    if (!isRecord(entry)) {
      droppedSections.push(`noteFragmentDetails:${index}`);
      return [];
    }

    const fragmentKey = toOptionalString(entry.fragmentKey);
    const text = toOptionalString(entry.text);
    const speechText = toOptionalString(entry.speechText);
    const translationText = toOptionalString(entry.translationText);
    const updatedAt = toOptionalString(entry.updatedAt);
    if (
      fragmentKey == null ||
      text == null ||
      speechText == null ||
      translationText == null ||
      updatedAt == null ||
      !isPhraseFragmentKind(entry.kind) ||
      !isLearningLanguage(entry.targetLanguage) ||
      !isTranslationSource(entry.source)
    ) {
      droppedSections.push(`noteFragmentDetails:${index}`);
      return [];
    }

    const sourcePath =
      entry.sourcePath == null
        ? null
        : isPhraseFragmentSourcePath(entry.sourcePath)
          ? entry.sourcePath
          : undefined;
    const register = sanitizeNullableRegister(entry.register);
    const chineseVariant =
      entry.chineseVariant == null
        ? null
        : isChineseLearningVariant(entry.chineseVariant)
          ? entry.chineseVariant
          : undefined;
    const readingSystem =
      entry.readingSystem == null
        ? null
        : isChineseReadingSystem(entry.readingSystem)
          ? entry.readingSystem
          : undefined;
    const targetTextVariants = sanitizeTextVariants(entry.targetTextVariants);
    const reading = toNullableString(entry.reading);
    if (
      sourcePath === undefined ||
      register === undefined ||
      chineseVariant === undefined ||
      readingSystem === undefined ||
      targetTextVariants === undefined ||
      reading === undefined
    ) {
      droppedSections.push(`noteFragmentDetails:${index}`);
      return [];
    }

    const readingSupport = normalizeReadingSupport({
      targetText: text,
      readingSegments: Array.isArray(entry.readingSegments)
        ? (entry.readingSegments as ReadingSegment[])
        : null,
      romanization: null,
    });

    return [
      {
        fragmentKey,
        kind: entry.kind,
        sourcePath,
        text,
        speechText,
        targetLanguage: entry.targetLanguage,
        chineseVariant,
        readingSystem,
        targetTextVariants,
        reading,
        readingSegments: readingSupport.readingSegments,
        translationText,
        register,
        source: entry.source,
        updatedAt,
      },
    ];
  });

  const cappedItems = capStructuredItems({
    items,
    cap: NOTE_FRAGMENT_DETAILS_CAP,
    sectionName: "noteFragmentDetails",
    droppedSections,
  });
  return cappedItems.length > 0 ? cappedItems : null;
}

function sanitizeKoreanEnrichmentMetadata(
  value: unknown
): KoreanEnrichmentMetadata | null | undefined {
  if (value == null) {
    return null;
  }
  if (!isRecord(value)) {
    return undefined;
  }

  const speechLevel =
    value.speechLevel == null
      ? null
      : value.speechLevel === "plain" ||
          value.speechLevel === "casual" ||
          value.speechLevel === "polite" ||
          value.speechLevel === "formal"
        ? value.speechLevel
        : undefined;
  const registerLabel = toNullableString(value.registerLabel);
  const romanizationSystem =
    value.romanizationSystem == null
      ? null
      : value.romanizationSystem === "revised_romanization"
        ? value.romanizationSystem
        : undefined;
  const note = toNullableString(value.note);

  if (
    speechLevel === undefined ||
    registerLabel === undefined ||
    romanizationSystem === undefined ||
    note === undefined
  ) {
    return undefined;
  }

  return {
    speechLevel,
    registerLabel,
    romanizationSystem,
    note,
  };
}

export function sanitizeEnrichmentData(value: unknown): {
  enrichment: EnrichmentData | null;
  droppedSections: string[];
} {
  if (value == null) {
    return { enrichment: null, droppedSections: [] };
  }
  if (!isRecord(value)) {
    return { enrichment: null, droppedSections: ["enrichment"] };
  }

  const droppedSections: string[] = [];
  const enrichment: EnrichmentData = {};

  const literalTranslation = toOptionalString(value.literalTranslation);
  if (literalTranslation === undefined) {
    droppedSections.push("literalTranslation");
  } else {
    enrichment.literalTranslation = literalTranslation;
  }

  if (value.grammarBreakdown == null) {
    enrichment.grammarBreakdown = null;
  } else if (!isRecord(value.grammarBreakdown)) {
    droppedSections.push("grammarBreakdown");
  } else {
    const confidence = value.grammarBreakdown.confidence;
    if (confidence !== "high" && confidence !== "medium" && confidence !== "low") {
      droppedSections.push("grammarBreakdown");
    } else if (confidence === "low") {
      enrichment.grammarBreakdown = null;
      droppedSections.push("grammarBreakdown:low_confidence");
    } else {
      const tokens = sanitizeGrammarTokens(value.grammarBreakdown.tokens);
      if (tokens.length === 0) {
        enrichment.grammarBreakdown = null;
        droppedSections.push("grammarBreakdown");
      } else {
        enrichment.grammarBreakdown = { confidence, tokens };
      }
    }
  }

  const characterBreakdown = sanitizeCharacterBreakdown(value.characterBreakdown);
  if (characterBreakdown === undefined) {
    droppedSections.push("characterBreakdown");
  } else {
    enrichment.characterBreakdown = characterBreakdown;
  }

  if (value.naturalness == null) {
    enrichment.naturalness = null;
  } else if (
    value.naturalness === "common" ||
    value.naturalness === "neutral" ||
    value.naturalness === "bookish" ||
    value.naturalness === "rare" ||
    value.naturalness === "stiff"
  ) {
    enrichment.naturalness = value.naturalness;
  } else {
    droppedSections.push("naturalness");
  }

  const bestUsedWhen = toOptionalString(value.bestUsedWhen);
  if (bestUsedWhen === undefined) {
    droppedSections.push("bestUsedWhen");
  } else {
    enrichment.bestUsedWhen = bestUsedWhen;
  }

  const avoidWhen = toOptionalString(value.avoidWhen);
  if (avoidWhen === undefined) {
    droppedSections.push("avoidWhen");
  } else {
    enrichment.avoidWhen = avoidWhen;
  }

  const confusableAlternatives = sanitizeStringArray(value.confusableAlternatives);
  if (confusableAlternatives === undefined) {
    droppedSections.push("confusableAlternatives");
  } else {
    enrichment.confusableAlternatives = confusableAlternatives;
  }

  const exampleSentence = toOptionalString(value.exampleSentence);
  if (exampleSentence === undefined) {
    droppedSections.push("exampleSentence");
  } else {
    enrichment.exampleSentence = exampleSentence;
  }

  const keywordTags = sanitizeStringArray(value.keywordTags);
  if (keywordTags === undefined) {
    droppedSections.push("keywordTags");
  } else {
    enrichment.keywordTags = keywordTags;
  }

  const proficiencyLevel = sanitizeProficiencyLevel(value.proficiencyLevel);
  if (proficiencyLevel === undefined) {
    droppedSections.push("proficiencyLevel");
  } else {
    enrichment.proficiencyLevel = proficiencyLevel;
  }

  if ("cantoneseExamples" in value) {
    if (value.cantoneseExamples == null) {
      enrichment.cantoneseExamples = null;
    } else if (!isRecord(value.cantoneseExamples)) {
      droppedSections.push("cantoneseExamples");
    } else {
      const colloquial = toOptionalString(value.cantoneseExamples.colloquial);
      const formalWritten = toOptionalString(value.cantoneseExamples.formalWritten);
      if (colloquial === undefined || formalWritten === undefined) {
        droppedSections.push("cantoneseExamples");
      } else if (colloquial != null || formalWritten != null) {
        enrichment.cantoneseExamples = {
          colloquial,
          formalWritten,
        };
      } else {
        enrichment.cantoneseExamples = null;
      }
    }
  }

  if ("korean" in value) {
    const korean = sanitizeKoreanEnrichmentMetadata(value.korean);
    if (korean === undefined) {
      droppedSections.push("korean");
    } else {
      enrichment.korean = korean;
    }
  }

  if ("registerVariants" in value) {
    const registerVariants = sanitizeRegisterVariants(
      value.registerVariants,
      droppedSections
    );
    if (registerVariants === undefined) {
      droppedSections.push("registerVariants");
    } else {
      enrichment.registerVariants = registerVariants;
    }
  }

  if ("usageContrasts" in value) {
    const usageContrasts = sanitizeUsageContrasts(
      value.usageContrasts,
      droppedSections
    );
    if (usageContrasts === undefined) {
      droppedSections.push("usageContrasts");
    } else {
      enrichment.usageContrasts = usageContrasts;
    }
  }

  if ("examples" in value) {
    const examples = sanitizeStructuredExamples(value.examples, droppedSections);
    if (examples === undefined) {
      droppedSections.push("examples");
    } else {
      enrichment.examples = examples;
    }
  }

  if ("noteFragmentDetails" in value) {
    const noteFragmentDetails = sanitizeCachedPhraseFragmentDetails(
      value.noteFragmentDetails,
      droppedSections
    );
    if (noteFragmentDetails === undefined) {
      droppedSections.push("noteFragmentDetails");
    } else {
      enrichment.noteFragmentDetails = noteFragmentDetails;
    }
  }

  return Object.keys(enrichment).length > 0
    ? { enrichment, droppedSections }
    : { enrichment: null, droppedSections };
}
