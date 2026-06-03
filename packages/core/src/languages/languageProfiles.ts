// ─── Language Profile Contract ──────────────────────────────────────────────
// Defines the per-language configuration interface used by core normalization,
// provider prompts, and runtime locale decisions.

import type {
  ChineseLearningVariant,
  ReadingSystem,
  ScriptCode,
  SupportedLearningLanguage,
} from "../learning/learningTypes";
import { resolveChineseVariantProfile } from "../learning/learningTypes";

// ─── Interface ──────────────────────────────────────────────────────────────

export interface LanguageCapabilityProfile {
  /** The learning language this profile describes. */
  language: SupportedLearningLanguage;

  /** Default script code for this language (e.g. `"jpan"` for Japanese). */
  defaultScript: ScriptCode;

  /** Scripts this language can represent in normalized Kotoba data. */
  supportedScripts: ScriptCode[];

  /** Reading or romanization systems accepted for this language. */
  readingSystems: ReadingSystem[];

  /** Default reading metadata when provider output omits a valid value. */
  defaultReadingSystem: ReadingSystem | null;

  /** Whether this language supports register or speech-level metadata. */
  supportsRegister: boolean;

  /** Whether this language has first-class script or dialect variants. */
  supportsVariants: boolean;

  /** BCP-47 locale tag used by default for text-to-speech. */
  defaultTTSLocale: string;

  /** BCP-47 locale tag used for text-to-speech. */
  ttsLocale: string;

  /** BCP-47 locale tags accepted by speech-to-text engines. */
  sttLocales: string[];

  /** Whether the language supports token-level reading segments (furigana / pinyin). */
  supportsReadingSegments: boolean;

  /** Whether the language supports romanization output (romaji / pinyin). */
  supportsRomanization: boolean;
}

export type LanguageProfile = LanguageCapabilityProfile;

// ─── Japanese Profile ───────────────────────────────────────────────────────

export const japaneseProfile: LanguageProfile = {
  language: "ja",
  defaultScript: "jpan",
  supportedScripts: ["jpan"],
  readingSystems: ["furigana", "romaji"],
  defaultReadingSystem: "furigana",
  supportsRegister: true,
  supportsVariants: false,
  defaultTTSLocale: "ja-JP",
  ttsLocale: "ja-JP",
  sttLocales: ["ja-JP"],
  supportsReadingSegments: true,
  supportsRomanization: true,
};

// ─── Chinese Profile ────────────────────────────────────────────────────────

export const chineseProfile: LanguageProfile = {
  language: "zh",
  defaultScript: "zh-Hans",
  supportedScripts: ["zh-Hans", "zh-Hant"],
  readingSystems: ["pinyin", "jyutping"],
  defaultReadingSystem: "pinyin",
  supportsRegister: false,
  supportsVariants: true,
  defaultTTSLocale: "zh-CN",
  ttsLocale: "zh-CN",
  sttLocales: ["zh-CN", "zh-TW"],
  supportsReadingSegments: true,
  supportsRomanization: true,
};

// ─── Korean Profile ────────────────────────────────────────────────────────

export const koreanProfile: LanguageProfile = {
  language: "ko",
  defaultScript: "hang",
  supportedScripts: ["hang"],
  readingSystems: ["hangul", "revised_romanization"],
  defaultReadingSystem: "hangul",
  supportsRegister: true,
  supportsVariants: false,
  defaultTTSLocale: "ko-KR",
  ttsLocale: "ko-KR",
  sttLocales: ["ko-KR"],
  supportsReadingSegments: true,
  supportsRomanization: true,
};

// ─── Profile Registry ───────────────────────────────────────────────────────

const profiles: Record<SupportedLearningLanguage, LanguageProfile> = {
  ja: japaneseProfile,
  zh: chineseProfile,
  ko: koreanProfile,
};

/**
 * Retrieve the language profile for a given learning language.
 * Throws if the language is not registered.
 */
export function getLanguageProfile(
  language: SupportedLearningLanguage
): LanguageProfile {
  const profile = profiles[language];
  if (profile == null) {
    throw new Error(`No language profile registered for "${language}"`);
  }
  return profile;
}

/** Resolve the public language profile for a supported learning language. */
export function resolveLanguageProfile(
  language: SupportedLearningLanguage
): LanguageProfile {
  return getLanguageProfile(language);
}

/**
 * Resolve the BCP-47 locale to use for TTS playback.
 *
 * Japanese remains fixed to `ja-JP`.
 * Chinese resolves to `zh-CN` or `zh-TW` based on the active display-script
 * preference, falling back to the profile default when the preference is not
 * available.
 */
export function resolveTTSLocale(
  language: SupportedLearningLanguage,
  chineseDisplayScript?: "zh-Hans" | "zh-Hant",
  chineseVariant?: ChineseLearningVariant
): string {
  if (language === "zh") {
    if (chineseVariant) {
      return resolveChineseVariantProfile(chineseVariant).ttsLocale;
    }

    if (chineseDisplayScript === "zh-Hant") {
      return "zh-TW";
    }
    return chineseProfile.ttsLocale;
  }

  return getLanguageProfile(language).ttsLocale;
}

/**
 * Resolve the BCP-47 locale to use for speech-to-text recognition.
 *
 * Chinese resolves to `zh-CN` (Simplified) or `zh-TW` (Traditional) based on
 * the active display-script preference. When no script is provided, defaults
 * to `zh-CN`. All other languages fall through to the first entry in
 * `sttLocales`.
 */
export function resolveSTTLocale(
  language: SupportedLearningLanguage,
  chineseDisplayScript?: "zh-Hans" | "zh-Hant",
  chineseVariant?: ChineseLearningVariant
): string {
  if (language === "zh") {
    if (chineseVariant) {
      return resolveChineseVariantProfile(chineseVariant).sttLocale;
    }

    if (chineseDisplayScript === "zh-Hant") {
      return "zh-TW";
    }
    return "zh-CN";
  }

  return getLanguageProfile(language).sttLocales[0];
}

/**
 * Return every possible TTS locale for a given learning language.
 *
 * Japanese has one locale (`ja-JP`). Chinese has two (`zh-CN`, `zh-TW`)
 * because the cache key encodes the locale and the user may have changed
 * their script preference since the entry was saved.
 */
export function allTTSLocales(language: SupportedLearningLanguage): string[] {
  if (language === "zh") {
    return ["zh-CN", "zh-TW"];
  }
  return [getLanguageProfile(language).ttsLocale];
}
