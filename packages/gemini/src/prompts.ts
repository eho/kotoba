import type {
  ChineseLearningVariant,
  InputMode,
  ScriptCode,
  SupportedLearningLanguage,
  TranslationDraft,
} from "@edwinho/kotoba-core";
import {
  getLanguageProfile,
  resolveChineseVariantProfile,
} from "@edwinho/kotoba-core";
import {
  CANTONESE_ENRICHMENT_REQUIREMENTS,
  CANTONESE_STANDARD_STRUCTURED_GUIDANCE,
  CANTONESE_STANDARD_VARIANT_GUIDANCE,
  JAPANESE_TOKEN_NOTE_GUIDANCE,
  KOREAN_ENRICHMENT_REQUIREMENTS,
  KOREAN_STANDARD_STRUCTURED_GUIDANCE,
  KOREAN_TOKEN_NOTE_GUIDANCE,
  MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE,
  MANDARIN_STANDARD_STRUCTURED_GUIDANCE,
  TAIWAN_MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE,
  TAIWAN_MANDARIN_STANDARD_STRUCTURED_GUIDANCE,
  buildEnrichmentFieldGuidance,
  buildStudyTokenGuidance,
} from "./promptFragments";

export interface BuildStandardTranslationPromptParams {
  inputText: string;
  inputMode: InputMode;
  learningLanguage: SupportedLearningLanguage;
  script?: ScriptCode;
  chineseVariant?: ChineseLearningVariant;
}

export interface OnDeviceDraftForGemini {
  sourceText: string;
  targetText: string;
  targetTextVariants?: TranslationDraft["targetTextVariants"] | null;
  translationText: string;
}

export interface BuildEnrichmentPromptParams {
  inputText: string;
  inputMode: InputMode;
  learningLanguage: SupportedLearningLanguage;
  chineseDisplayScript?: "zh-Hans" | "zh-Hant";
  chineseVariant?: ChineseLearningVariant;
  onDeviceDraft: OnDeviceDraftForGemini;
}

function buildJapaneseStandardTranslationPrompt(
  inputText: string,
  inputMode: InputMode,
): string {
  if (inputMode === "en_to_target") {
    return `Translate the following English phrase into Japanese and provide linguistic enrichment.

Input: "${inputText}"
Direction: English to Japanese

Return a JSON object with these exact fields:
- targetLanguage: "ja"
- sourceLanguage: "en"
- sourceText: the original English phrase (copy input verbatim)
- targetText: the full Japanese phrase
- targetTextVariants: null (must be null for Japanese)
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is the furigana reading (null for kana-only segments)
- romanization: romaji reading of the full phrase
- translationText: the English translation or meaning
- register: "casual", "polite", or "formal"
- alternateForm: the phrase expressed in a different register, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "ja" })}
${buildEnrichmentFieldGuidance({ promptMode: "standard", language: "ja" })}

${JAPANESE_TOKEN_NOTE_GUIDANCE}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Omit low-confidence grammar instead of guessing.`;
  }

  return `Translate the following Japanese phrase into English and provide linguistic enrichment.

Input: "${inputText}"
Direction: Japanese to English

Return a JSON object with these exact fields:
- targetLanguage: "ja"
- sourceLanguage: "en"
- sourceText: the English translation
- targetText: the Japanese phrase (normalized canonical form)
- targetTextVariants: null (must be null for Japanese)
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is the furigana reading (null for kana-only segments)
- romanization: romaji reading of the full phrase
- translationText: the English translation
- register: "casual", "polite", or "formal"
- alternateForm: the phrase expressed in a different register, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "ja" })}
${buildEnrichmentFieldGuidance({ promptMode: "standard", language: "ja" })}

${JAPANESE_TOKEN_NOTE_GUIDANCE}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Omit low-confidence grammar instead of guessing.`;
}

function buildChineseStandardTranslationPrompt({
  inputText,
  inputMode,
  script,
  chineseVariant = script === "zh-Hant"
    ? "mandarin-traditional-taiwan"
    : "mandarin-simplified",
}: Omit<BuildStandardTranslationPromptParams, "learningLanguage">): string {
  const scriptLabel =
    script === "zh-Hant" ? "Traditional Chinese" : "Simplified Chinese";
  const isCantonese = chineseVariant === "cantonese-traditional";
  const isTaiwanTraditional =
    chineseVariant === "mandarin-traditional-taiwan";
  const targetDialectLabel = isCantonese
    ? "Cantonese"
    : isTaiwanTraditional
      ? "Taiwan-oriented Mandarin Chinese"
      : "standard Mandarin Chinese (Putonghua)";
  const romanizationLabel = isCantonese ? "Jyutping" : "diacritic-tone pinyin";
  const mandarinStructuredGuidance = isTaiwanTraditional
    ? TAIWAN_MANDARIN_STANDARD_STRUCTURED_GUIDANCE
    : MANDARIN_STANDARD_STRUCTURED_GUIDANCE;
  const variantGuidance = isCantonese
    ? CANTONESE_STANDARD_VARIANT_GUIDANCE
    : isTaiwanTraditional
      ? `Important: translate into Taiwan-oriented Mandarin Traditional Chinese. Use Taiwan-standard vocabulary and Traditional characters. Reading segments and romanization must use diacritic-tone pinyin. Include chineseVariant: "mandarin-traditional-taiwan" and readingSystem: "pinyin". ${mandarinStructuredGuidance}`
      : `Important: always translate into standard Mandarin (Putonghua), never Cantonese. Use Mainland-standard vocabulary written in Simplified Chinese characters. Reading segments and romanization must use diacritic-tone pinyin. Include chineseVariant: "mandarin-simplified" and readingSystem: "pinyin". ${mandarinStructuredGuidance}`;

  if (inputMode === "en_to_target") {
    return `Translate the following English phrase into ${targetDialectLabel} and provide linguistic enrichment.

Input: "${inputText}"
Direction: English to Chinese
Script: ${scriptLabel}
${variantGuidance}

Return a JSON object with these exact fields:
- targetLanguage: "zh"
- sourceLanguage: "en"
- sourceText: the original English phrase (copy input verbatim)
- targetText: the Chinese phrase in the preferred script (${scriptLabel})
- targetTextVariants: object with { primary: same as targetText, simplified: Simplified Chinese form, traditional: Traditional Chinese form }
- chineseVariant: "${chineseVariant}"
- readingSystem: "${isCantonese ? "jyutping" : "pinyin"}"
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is ${romanizationLabel}, or null if no reading applies
- romanization: full ${romanizationLabel} for the phrase
- translationText: the English translation or meaning
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: a meaningful alternate expression such as a more formal phrasing or fixed expression, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "zh" })}
${buildEnrichmentFieldGuidance({
  promptMode: "standard",
  language: "zh",
  scriptLabel,
  isCantonese,
})}

${isCantonese ? CANTONESE_STANDARD_STRUCTURED_GUIDANCE : `${mandarinStructuredGuidance} Structured fields are optional and should only be used when they teach a concrete distinction.`}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Do not force register or alternateForm to null. Omit low-confidence grammar instead of guessing.`;
  }

  return `Translate the following Chinese phrase into English and provide linguistic enrichment.

Input: "${inputText}"
Direction: Chinese to English

Return a JSON object with these exact fields:
- targetLanguage: "zh"
- sourceLanguage: "en"
- sourceText: the English translation
- targetText: the Chinese phrase (normalized canonical form)
- targetTextVariants: object with { primary: same as targetText, simplified: Simplified Chinese form, traditional: Traditional Chinese form }
- chineseVariant: "${chineseVariant}"
- readingSystem: "${isCantonese ? "jyutping" : "pinyin"}"
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is ${romanizationLabel}, or null if no reading applies
- romanization: full ${romanizationLabel} for the phrase
- translationText: the English translation
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: a meaningful alternate expression such as a more formal phrasing or fixed expression, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "zh" })}
${buildEnrichmentFieldGuidance({
  promptMode: "standard",
  language: "zh",
  scriptLabel: "Chinese",
  isCantonese,
})}

${isCantonese ? CANTONESE_STANDARD_STRUCTURED_GUIDANCE : `${mandarinStructuredGuidance} Structured fields are optional and should only be used when they teach a concrete distinction.`}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Do not force register or alternateForm to null. Omit low-confidence grammar instead of guessing.`;
}

function buildKoreanStandardTranslationPrompt(
  inputText: string,
  inputMode: InputMode,
): string {
  if (inputMode === "en_to_target") {
    return `Translate the following English phrase into Korean and provide linguistic enrichment.

Input: "${inputText}"
Direction: English to Korean

Return a JSON object with these exact fields:
- targetLanguage: "ko"
- sourceLanguage: "en"
- sourceText: the original English phrase (copy input verbatim)
- targetText: the full Korean phrase in Hangul
- targetTextVariants: null (must be null for Korean)
- readingSystem: "hangul"
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is null unless a pronunciation note is necessary
- romanization: Revised Romanization for the full phrase, or null only when unreliable
- translationText: the English translation or meaning
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: the phrase expressed in a different speech level or nearby wording, or null; Korean text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "ko" })}
${buildEnrichmentFieldGuidance({ promptMode: "standard", language: "ko" })}

${KOREAN_TOKEN_NOTE_GUIDANCE}
${KOREAN_STANDARD_STRUCTURED_GUIDANCE}
${KOREAN_ENRICHMENT_REQUIREMENTS}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Omit low-confidence grammar instead of guessing.`;
  }

  return `Translate the following Korean phrase into English and provide linguistic enrichment.

Input: "${inputText}"
Direction: Korean to English

Return a JSON object with these exact fields:
- targetLanguage: "ko"
- sourceLanguage: "en"
- sourceText: the English translation
- targetText: the Korean phrase (normalized canonical form)
- targetTextVariants: null (must be null for Korean)
- readingSystem: "hangul"
- readingSegments: array of optional {text, reading} enrichment segments aligned to spans inside targetText; each segment text must appear exactly in targetText in left-to-right order; reading is null unless a pronunciation note is necessary
- romanization: Revised Romanization for the full phrase, or null only when unreliable
- translationText: the English translation
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: the phrase expressed in a different speech level or nearby wording, or null; Korean text only with no English labels, explanations, or parenthetical annotations
- usage: a one-line usage context note, or null
${buildStudyTokenGuidance({ promptMode: "standard", language: "ko" })}
${buildEnrichmentFieldGuidance({ promptMode: "standard", language: "ko" })}

${KOREAN_TOKEN_NOTE_GUIDANCE}
${KOREAN_STANDARD_STRUCTURED_GUIDANCE}
${KOREAN_ENRICHMENT_REQUIREMENTS}

Keep all guidance short and concrete. Make study token notes dense and useful for tap popovers. Omit low-confidence grammar instead of guessing.`;
}

export function buildStandardTranslationPrompt(
  params: BuildStandardTranslationPromptParams,
): string {
  if (params.learningLanguage === "ja") {
    return buildJapaneseStandardTranslationPrompt(params.inputText, params.inputMode);
  }

  if (params.learningLanguage === "ko") {
    return buildKoreanStandardTranslationPrompt(params.inputText, params.inputMode);
  }

  return buildChineseStandardTranslationPrompt(params);
}

export function buildEnrichmentPrompt(params: BuildEnrichmentPromptParams): string {
  const profile = getLanguageProfile(params.learningLanguage);
  const chineseVariant =
    params.learningLanguage === "zh"
      ? params.chineseVariant ??
        ((params.chineseDisplayScript ?? "zh-Hans") === "zh-Hant"
          ? "mandarin-traditional-taiwan"
          : "mandarin-simplified")
      : undefined;
  const scriptCode =
    params.learningLanguage === "zh"
      ? chineseVariant != null
        ? resolveChineseVariantProfile(chineseVariant).displayScript
        : (params.chineseDisplayScript ?? "zh-Hans") === "zh-Hant"
          ? ("zh-Hant" as const)
          : ("zh-Hans" as const)
      : profile.defaultScript;
  const scriptLabel =
    params.learningLanguage === "zh"
      ? scriptCode === "zh-Hant"
        ? "Traditional Chinese"
        : "Simplified Chinese"
      : params.learningLanguage === "ko"
        ? "Korean"
        : "Japanese";
  const mandarinStructuredGuidance =
    chineseVariant === "mandarin-traditional-taiwan"
      ? TAIWAN_MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE
      : MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE;
  const fieldGuidance =
    params.learningLanguage === "ja"
      ? `Return a JSON object with these exact fields:
- targetLanguage: "ja"
- sourceLanguage: "en"
- sourceText: best English source gloss for the preserved canonical phrase
- targetText: exactly "${params.onDeviceDraft.targetText}"
- targetTextVariants: null (must be null for Japanese)
- readingSegments: array of {text, reading} spans aligned to substrings inside targetText
  - return readingSegments whenever you can confidently align them to the canonical targetText
  - prefer covering as much of the phrase as possible with meaningful lexical spans
  - every segment text must appear exactly in targetText in left-to-right order
  - use [] only when reliable aligned readings are genuinely unavailable
  - reading is furigana; use null only for kana-only spans that do not need furigana
- romanization: romaji for the full preserved phrase, or null only when unreliable
- translationText: concise English meaning for the preserved canonical phrase
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: a different register or nearby alternate wording, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: one-line usage context for the preserved phrase, or null
${buildStudyTokenGuidance({ promptMode: "enrichment", language: "ja" })}
${buildEnrichmentFieldGuidance({ promptMode: "enrichment", language: "ja" })}
${JAPANESE_TOKEN_NOTE_GUIDANCE}`
      : params.learningLanguage === "ko"
        ? `Return a JSON object with these exact fields:
- targetLanguage: "ko"
- sourceLanguage: "en"
- sourceText: best English source gloss for the preserved canonical phrase
- targetText: exactly "${params.onDeviceDraft.targetText}"
- targetTextVariants: null (must be null for Korean)
- readingSystem: "hangul"
- readingSegments: array of {text, reading} spans aligned to substrings inside targetText
  - return readingSegments whenever you can confidently align them to the canonical targetText
  - prefer covering as much of the phrase as possible with meaningful lexical spans
  - every segment text must appear exactly in targetText in left-to-right order
  - use [] only when reliable aligned readings are genuinely unavailable
  - reading is null unless a pronunciation note is necessary
- romanization: Revised Romanization for the full preserved phrase, or null only when unreliable
- translationText: concise English meaning for the preserved canonical phrase
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: a different speech level or nearby alternate wording, or null; Korean text only with no English labels, explanations, or parenthetical annotations
- usage: one-line usage context for the preserved phrase, or null
${buildStudyTokenGuidance({ promptMode: "enrichment", language: "ko" })}
${buildEnrichmentFieldGuidance({ promptMode: "enrichment", language: "ko" })}
${KOREAN_TOKEN_NOTE_GUIDANCE}
${KOREAN_ENRICHMENT_REQUIREMENTS}`
        : `Return a JSON object with these exact fields:
- targetLanguage: "zh"
- sourceLanguage: "en"
- sourceText: best English source gloss for the preserved canonical phrase
- targetText: exactly "${params.onDeviceDraft.targetText}"
- targetTextVariants: object with { primary: same as targetText, simplified: Simplified Chinese form, traditional: Traditional Chinese form }
- chineseVariant: "${chineseVariant ?? "mandarin-simplified"}"
- readingSystem: "${chineseVariant === "cantonese-traditional" ? "jyutping" : "pinyin"}"
- readingSegments: array of {text, reading} spans aligned to substrings inside targetText
  - return readingSegments whenever you can confidently align them to the canonical targetText
  - prefer covering as much of the phrase as possible with meaningful lexical spans
  - every segment text must appear exactly in targetText in left-to-right order
  - use [] only when reliable aligned readings are genuinely unavailable
  - reading is ${chineseVariant === "cantonese-traditional" ? "Jyutping" : "diacritic-tone pinyin (e.g. \"nǐ hǎo\")"}
- romanization: full ${chineseVariant === "cantonese-traditional" ? "Jyutping" : "diacritic-tone pinyin"} for the preserved phrase, or null only when unreliable
- translationText: concise English meaning for the preserved canonical phrase
- register: "casual", "polite", or "formal", or null when not useful
- alternateForm: a different register or nearby alternate wording, or null; target-language text only with no English labels, explanations, or parenthetical annotations
- usage: one-line usage context for the preserved phrase, or null
${buildStudyTokenGuidance({ promptMode: "enrichment", language: "zh" })}
${buildEnrichmentFieldGuidance({
  promptMode: "enrichment",
  language: "zh",
  scriptLabel,
})}
${chineseVariant === "cantonese-traditional" ? "Structured fields are optional for Chinese and should only be used for meaningful polite/formal, regional, or naturalness distinctions." : `${mandarinStructuredGuidance} Structured fields are optional and should only be used when they teach a concrete distinction.`}`;
  const variantGuidance =
    params.learningLanguage !== "zh"
      ? params.learningLanguage === "ko"
        ? `
${KOREAN_ENRICHMENT_REQUIREMENTS}`
        : ""
      : chineseVariant === "cantonese-traditional"
        ? `
${CANTONESE_ENRICHMENT_REQUIREMENTS}`
        : chineseVariant === "mandarin-traditional-taiwan"
          ? `
Traditional Chinese requirements:
- Treat the preserved phrase as Taiwan-oriented Mandarin Traditional Chinese.
- Use Taiwan-standard wording in examples where possible.
- Use Mandarin-specific structured variants, contrasts, and examples when they add concrete learner value.
- readingSegments and romanization must use pinyin.`
          : `
Simplified Chinese requirements:
- Treat the preserved phrase as standard Mandarin Simplified Chinese.
- Use Mandarin-specific structured variants, contrasts, and examples when they add concrete learner value.
- readingSegments and romanization must use pinyin.`;

  return `Enrich an existing ${profile.language === "ja" ? "Japanese" : profile.language === "ko" ? "Korean" : "Chinese"} learning draft without changing its canonical phrase.

User input: "${params.inputText}"
Direction: ${params.inputMode}
Canonical target text to preserve exactly: "${params.onDeviceDraft.targetText}"
Existing source text: "${params.onDeviceDraft.sourceText}"
Existing translation text: "${params.onDeviceDraft.translationText}"
Existing target text variants: ${JSON.stringify(params.onDeviceDraft.targetTextVariants ?? null)}

The on-device translation already decided the canonical target phrase. Do not translate from scratch, do not improve the wording, and do not replace the phrase with your preferred translation.
${variantGuidance}

${fieldGuidance}

Hard requirements:
- targetLanguage must be "${params.learningLanguage}"
- targetText must remain exactly "${params.onDeviceDraft.targetText}"
- do not silently rewrite the canonical phrase even if you prefer another wording
- readingSegments must be returned whenever you can confidently align them to the canonical targetText; only use [] when reliable readings are genuinely unavailable
- readingSegments must stay in left-to-right order and every segment text must appear exactly in targetText
- readingSegments, romanization, studyTokens, grammarBreakdown, and usage notes must describe the preserved canonical targetText only
- if you prefer a different wording, keep targetText unchanged and put the alternative in alternateForm or confusableAlternatives instead
- speakable fields (alternateForm, confusableAlternatives, exampleSentence, and Cantonese examples) must contain target-language text only; do not append readings, romanization, English translations, glosses, labels, or parenthetical explanations
- translationText should stay semantically aligned with the existing draft; small gloss cleanup is allowed
- keep sourceText as the best English source gloss for the preserved phrase
- generate rich studyTokens, readings, usage, and enrichment for the preserved phrase
- malformed or low-confidence enrichment should be omitted instead of guessed
- for Chinese, targetTextVariants.primary must equal targetText and use ${scriptLabel} for examples when possible
- for Japanese, targetTextVariants must be null${params.learningLanguage === "ko" ? "\n- for Korean, targetTextVariants must be null" : ""}
`;
}
