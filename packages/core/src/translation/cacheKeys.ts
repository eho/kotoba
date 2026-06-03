import type {
  ChineseLearningVariant,
  InputMode,
} from "../learning/learningTypes";

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeTag(value: string): string {
  return normalizeWhitespace(value).toLowerCase();
}

function normalizeVoiceName(value: string | undefined): string {
  return value ? normalizeWhitespace(value) : "default";
}

export function normalizeCacheText(value: string): string {
  return normalizeWhitespace(value);
}

export function createTranslationCacheKey(params: {
  learningLanguage: "ja" | "zh";
  chineseDisplayScript?: "zh-Hans" | "zh-Hant" | null;
  chineseVariant?: ChineseLearningVariant | null;
  inputText: string;
  mode?: "translate" | "enrich_on_device_draft";
  inputMode?: InputMode | null;
  canonicalTargetText?: string | null;
}): string {
  const script = params.chineseDisplayScript ?? "none";
  const variant = params.learningLanguage === "zh" ? (params.chineseVariant ?? "none") : "none";
  const mode = params.mode ?? "translate";

  if (mode === "enrich_on_device_draft") {
    return [
      "translation",
      "enrich",
      normalizeTag(params.learningLanguage),
      script === "none" ? script : normalizeTag(script),
      variant === "none" ? variant : normalizeTag(variant),
      normalizeTag(params.inputMode ?? "en_to_target"),
      normalizeCacheText(params.canonicalTargetText ?? ""),
      normalizeCacheText(params.inputText),
    ].join(":");
  }

  return [
    "translation",
    normalizeTag(params.learningLanguage),
    script === "none" ? script : normalizeTag(script),
    variant === "none" ? variant : normalizeTag(variant),
    normalizeTag(params.inputMode ?? "en_to_target"),
    normalizeCacheText(params.inputText),
  ].join(":");
}

export function createTTSCacheKey(params: {
  targetLanguage: "ja" | "zh";
  language: string;
  voiceName?: string;
  text: string;
}): string {
  return [
    "tts",
    normalizeTag(params.targetLanguage),
    normalizeTag(params.language),
    normalizeVoiceName(params.voiceName),
    normalizeCacheText(params.text),
  ].join(":");
}
