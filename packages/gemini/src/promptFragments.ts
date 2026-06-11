export type PromptLanguage = "ja" | "zh" | "ko";

export type PromptMode = "standard" | "enrichment";

interface StudyTokenGuidanceParams {
  promptMode: PromptMode;
  language: PromptLanguage;
}

interface EnrichmentFieldGuidanceParams {
  promptMode: PromptMode;
  language: PromptLanguage;
  scriptLabel?: string;
  isCantonese?: boolean;
}

export const JAPANESE_TOKEN_NOTE_GUIDANCE =
  "Japanese token notes should explain Japanese-specific form choices when present, including particles, です/ます, plain form, dictionary form, だ, omitted subjects, sentence endings, and common contractions.";

const JAPANESE_VERB_CLASSES =
  "ichidan, godan-u, godan-ku, godan-gu, godan-su, godan-tsu, godan-nu, godan-bu, godan-mu, godan-ru, suru, kuru, irregular";

const JAPANESE_OBSERVED_FORMS =
  "dictionary, plain, polite, negative, past, past-negative, te-form, potential, before-noun, adverbial, conditional, unknown";

export const JAPANESE_STUDY_TOKEN_METADATA_GUIDANCE = [
  "  - metadata is optional and Japanese-only; include it only for confident verb or adjective tokens, otherwise omit metadata or use null",
  "  - do not add metadata to particles, counters, nouns, auxiliaries, grammar-only spans, phrases, Chinese, or Korean tokens",
  '  - metadata.surface must exactly match the token surface, category must be "morphology", language must be "ja", and confidence must be "high" or "medium"; omit low-confidence morphology instead of guessing',
  `  - verb metadata shape: { language: "ja", category: "morphology", kind: "verb", surface, lemma, verbClass, observedForm, confidence }; verbClass is one of ${JAPANESE_VERB_CLASSES}`,
  `  - adjective metadata shape: { language: "ja", category: "morphology", kind: "adjective", surface, lemma, adjectiveClass, observedForm, confidence }; adjectiveClass is "i" or "na"`,
  `  - observedForm is optional/null and must be one of ${JAPANESE_OBSERVED_FORMS}`,
].join("\n");

export const MANDARIN_STANDARD_STRUCTURED_GUIDANCE =
  "For Mandarin, use structured variants and contrasts when they teach useful politeness, naturalness, particles, aspect markers such as 了/过/着, result complements, classifiers, sentence patterns, simplified-vs-traditional script awareness, or near-synonym distinctions. Examples should use Mainland-standard Simplified Chinese when possible.";

export const TAIWAN_MANDARIN_STANDARD_STRUCTURED_GUIDANCE =
  "For Taiwan Mandarin, use structured variants and contrasts when they teach useful Taiwan-vs-Mainland wording, politeness, naturalness, particles, aspect markers such as 了/過/著, result complements, classifiers, sentence patterns, or near-synonym distinctions. Examples should use Traditional characters and Taiwan-oriented wording when possible.";

export const MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE =
  "Use structured registerVariants, usageContrasts, and examples when they teach concrete Mandarin distinctions: politeness, naturalness, particles, aspect markers such as 了/过/着, result complements, classifiers, sentence patterns, simplified-vs-traditional script awareness, or near-synonyms. Examples should use Mainland-standard Simplified Chinese when possible.";

export const TAIWAN_MANDARIN_ENRICHMENT_STRUCTURED_GUIDANCE =
  "Use structured registerVariants, usageContrasts, and examples when they teach concrete Taiwan Mandarin distinctions: Taiwan-vs-Mainland wording, politeness, naturalness, particles, aspect markers such as 了/過/著, result complements, classifiers, sentence patterns, or near-synonyms. Examples should use Traditional characters and Taiwan-oriented wording when possible.";

export const CANTONESE_STANDARD_VARIANT_GUIDANCE =
  'Important: translate into natural Cantonese written in Traditional Chinese. Prefer colloquial Cantonese where natural for targetText; include concise formal written Chinese examples when helpful. Reading segments and romanization must use Jyutping, not pinyin. Include chineseVariant: "cantonese-traditional", readingSystem: "jyutping", and enrichment.cantoneseExamples with colloquial and formalWritten when you can do so confidently.';

export const CANTONESE_STANDARD_STRUCTURED_GUIDANCE =
  "For Cantonese, use structured variants and contrasts for colloquial Cantonese versus formal written Chinese when helpful; readings and romanization must be Jyutping.";

export const CANTONESE_ENRICHMENT_REQUIREMENTS = `Cantonese requirements:
- Preserve the canonical phrase exactly, but describe it as Cantonese in Traditional Chinese.
- Use colloquial Cantonese where natural and formal written Chinese examples where helpful.
- Use structured registerVariants and usageContrasts for colloquial Cantonese versus formal written Chinese when helpful.
- readingSegments and romanization must use Jyutping, not pinyin.
- readings and romanization inside structured items must use Jyutping, not pinyin.
- enrichment.cantoneseExamples should include colloquial and formalWritten when confidently available.`;

export const KOREAN_TOKEN_NOTE_GUIDANCE =
  "Korean token notes should explain Korean-specific form choices when present, including particles, verb endings, speech levels, honorific markers, contractions, counters, and spacing.";

export const KOREAN_STANDARD_STRUCTURED_GUIDANCE =
  "For Korean, use structured variants and contrasts when they teach useful speech-level, honorific, particle, spacing, naturalness, or near-synonym distinctions. Examples should use Hangul.";

export const KOREAN_ENRICHMENT_REQUIREMENTS = `Korean requirements:
- Preserve the canonical phrase exactly, but describe it as Korean in Hangul.
- readingSegments should use Hangul spans from targetText and readings should be null unless a pronunciation note is necessary.
- romanization should use Revised Romanization when confidently available.
- enrichment.korean should include speechLevel, registerLabel, romanizationSystem, or note when useful.
- Do not populate Chinese-only fields such as chineseVariant, readingSystem pinyin/jyutping, targetTextVariants, or cantoneseExamples.`;

export function buildStudyTokenGuidance({
  promptMode,
  language,
}: StudyTokenGuidanceParams): string {
  const phrase = promptMode === "enrichment" ? "the preserved phrase" : "the phrase";
  const lines = [
    "- studyTokens: array of tappable token spans aligned to targetText; each item must include { id, surface, start, end, reading, audioText, kind, note }",
    `  - include meaningful learning spans within ${phrase}; avoid punctuation-only tokens`,
  ];

  if (promptMode === "enrichment") {
    lines.push("  - surface and token spans must use exact substrings from targetText");
  }

  lines.push(
    "  - prefer word-level or grammar-level spans; use a larger phrase span only when the expression is best learned as one unit",
    "  - note should usually be non-null for any token with standalone learning value",
    "  - note.partOfSpeech: concise learner-facing label such as noun, particle, verb, adjective, classifier, pronoun, sentence pattern",
    "  - note.meaning: short English gloss for that exact token/span, not the whole sentence meaning",
    "  - note.note: optional one-line teaching note for grammar function, nuance, or usage",
    "  - only use note: null when the token truly has no useful standalone explanation",
    "  - use grammarBreakdown only for phrase-level or multi-token explanations that are not already captured by a single study token note"
  );

  if (language === "zh") {
    lines.push(
      "  - Mandarin token notes should explain useful form choices when present, including tones, measure words/classifiers, aspect markers, particles, complements, reduplication, word order, and near-synonyms"
    );
  }

  if (language === "ko") {
    lines.push(
      "  - Korean token notes should explain useful form choices when present, including particles, verb endings, speech levels, honorifics, contractions, spacing, and near-synonyms"
    );
  }

  if (language === "ja") {
    lines.push(JAPANESE_STUDY_TOKEN_METADATA_GUIDANCE);
  }

  return lines.join("\n");
}

export function buildEnrichmentFieldGuidance({
  promptMode,
  language,
  scriptLabel = language === "ja" ? "Japanese" : language === "ko" ? "Korean" : "Chinese",
  isCantonese = false,
}: EnrichmentFieldGuidanceParams): string {
  if (language === "ja") {
    const grammarAlignment =
      promptMode === "enrichment"
        ? "\n  - each grammarBreakdown token must be an exact substring from targetText, not a different phrase or dictionary-form substitute"
        : "";
    const exampleSentence =
      promptMode === "enrichment"
        ? "one short Japanese sentence only using the preserved phrase when helpful"
        : "one short Japanese sentence only";
    const registerVariants =
      promptMode === "enrichment"
        ? "optional array of up to 3 natural Japanese variants for the preserved canonical phrase when useful; include primary, casual, polite, and formal variants only when they sound natural, never force variants for fixed expressions; each item is { text, role, register, reading, romanization, translationText, usageNote }"
        : "optional array of up to 3 natural Japanese variants when useful; include primary, casual, polite, and formal variants only when they sound natural, never force variants for fixed expressions; each item is { text, role, register, readingSegments, reading, romanization, translationText, usageNote }";
    const examples =
      promptMode === "enrichment"
        ? "optional array of up to 2 short Japanese examples for the preserved canonical phrase with English translationText and a note when they teach register or grammar; each item is { text, reading, romanization, translationText, register, note }"
        : "optional array of up to 2 short Japanese examples for the target phrase with English translationText and a note when they teach register or grammar; each item is { text, readingSegments, reading, romanization, translationText, register, note }";
    const usageContrastsItem =
      promptMode === "enrichment"
        ? "{ text, kind, label, register, reading, romanization, meaning, whenToUse, avoidWhen, contrastNote }"
        : "{ text, kind, label, register, readingSegments, reading, romanization, meaning, whenToUse, avoidWhen, contrastNote }";

    return `- enrichment: object with nullable fields; include concrete learning notes in at least one of bestUsedWhen, avoidWhen, registerVariants, usageContrasts, examples, or exampleSentence when useful:
  - literalTranslation: concise literal gloss, or null
  - grammarBreakdown: null when confidence is low, otherwise { confidence: "high" | "medium", tokens: [{ token, partOfSpeech, meaning }] }${grammarAlignment}
  - characterBreakdown: up to 4 pedagogically useful kanji only; each item is { character, meaning, components }
  - naturalness: "common", "neutral", "bookish", "rare", or "stiff"
  - bestUsedWhen: short structured guidance
  - avoidWhen: short structured caution, or null
  - confusableAlternatives: short array of nearby target-language alternatives with no romanization, English labels, translations, explanations, or parenthetical notes, or null
  - exampleSentence: ${exampleSentence}; do not include romaji, pronunciation guides, English translations, glosses, labels, or parenthetical explanations, or null
  - registerVariants: ${registerVariants}
  - usageContrasts: optional array of up to 3 items explaining meaningful differences such as register, naturalness, particle omission, stiffness, and spoken/written usage; each item is ${usageContrastsItem}
  - examples: ${examples}
  - keywordTags: up to 5 short topical tags, or null
  - proficiencyLevel: { framework: "jlpt", level: "N5" | "N4" | "N3" | "N2" | "N1" }, or null`;
  }

  if (language === "ko") {
    const grammarAlignment =
      promptMode === "enrichment"
        ? "\n  - each grammarBreakdown token must be an exact substring from targetText, not a different phrase or dictionary-form substitute"
        : "";
    const exampleSentence =
      promptMode === "enrichment"
        ? "one short Korean sentence only using the preserved phrase when helpful"
        : "one short Korean sentence only";

    return `- enrichment: object with nullable fields; include concrete learning notes in at least one of bestUsedWhen, avoidWhen, registerVariants, usageContrasts, examples, or exampleSentence when useful:
  - literalTranslation: concise literal gloss, or null
  - grammarBreakdown: null when confidence is low, otherwise { confidence: "high" | "medium", tokens: [{ token, partOfSpeech, meaning }] }${grammarAlignment}
  - characterBreakdown: null for Korean unless there is a specific pedagogical reason
  - naturalness: "common", "neutral", "bookish", "rare", or "stiff"
  - bestUsedWhen: short structured guidance
  - avoidWhen: short structured caution, or null
  - confusableAlternatives: short array of nearby Korean alternatives with no romanization, English labels, translations, explanations, or parenthetical notes, or null
  - exampleSentence: ${exampleSentence}; do not include romanization, pronunciation guides, English translations, glosses, labels, or parenthetical explanations, or null
  - registerVariants: optional array of up to 3 items for meaningful speech-level, honorific, casual, polite, formal, regional, or nearby Korean variants; each item is { text, role, register, readingSegments, reading, romanization, translationText, usageNote }
  - usageContrasts: optional array of up to 3 items for meaningful speech-level, honorific, particle, spacing, grammar, near-synonym, or naturalness distinctions; each item is { text, kind, label, register, readingSegments, reading, romanization, meaning, whenToUse, avoidWhen, contrastNote }
  - examples: optional array of up to 2 examples that clarify meaningful speech-level, honorific, grammar, near-synonym, or naturalness distinctions; each item is { text, readingSegments, reading, romanization, translationText, register, note }
  - keywordTags: up to 5 short topical tags, or null
  - proficiencyLevel: { framework: "topik", level: "1" | "2" | "3" | "4" | "5" | "6" }, or null
  - korean: optional object with { speechLevel, registerLabel, romanizationSystem, note } when it adds Korean-specific learning value`;
  }

  const grammarAlignment =
    promptMode === "enrichment"
      ? "\n  - each grammarBreakdown token must be an exact substring from targetText, not a different phrase or dictionary-form substitute"
      : "";
  const exampleSentence =
    promptMode === "enrichment"
      ? `one short ${scriptLabel} sentence only using the preserved phrase when helpful`
      : scriptLabel === "Chinese"
        ? "one short Chinese sentence only"
        : `one short Chinese sentence in ${scriptLabel} only`;
  const cantoneseExamples =
    promptMode === "standard"
      ? `\n  - cantoneseExamples: ${isCantonese ? `{ colloquial: natural Cantonese phrasing, formalWritten: concise formal written Chinese equivalent }, target-language text only with no Jyutping, English translations, labels, or parenthetical explanations, or null` : "null"}`
      : "";

  return `- enrichment: object with nullable fields; include concrete learning notes in at least one of bestUsedWhen, avoidWhen, registerVariants, usageContrasts, examples, or exampleSentence when useful:
  - literalTranslation: concise literal gloss, or null
  - grammarBreakdown: null when confidence is low, otherwise { confidence: "high" | "medium", tokens: [{ token, partOfSpeech, meaning }] }${grammarAlignment}
  - characterBreakdown: up to 4 pedagogically useful hanzi only; each item is { character, meaning, components }
  - naturalness: "common", "neutral", "bookish", "rare", or "stiff"
  - bestUsedWhen: short structured guidance
  - avoidWhen: short structured caution, or null
  - confusableAlternatives: short array of nearby target-language alternatives with no romanization, English labels, translations, explanations, or parenthetical notes, or null
  - exampleSentence: ${exampleSentence}; do not include pinyin/Jyutping, pronunciation guides, English translations, glosses, labels, or parenthetical explanations, or null
  - registerVariants: optional array of up to 3 items for meaningful polite/formal, regional, script, grammar, or naturalness distinctions only; do not force word substitutions; each item is { text, role, register, readingSegments, reading, romanization, translationText, usageNote }
  - usageContrasts: optional array of up to 3 items for meaningful polite/formal, regional, script, grammar, near-synonym, Cantonese-vs-Mandarin, colloquial-vs-formal-written, or naturalness distinctions; each item is { text, kind, label, register, readingSegments, reading, romanization, meaning, whenToUse, avoidWhen, contrastNote }
  - examples: optional array of up to 2 examples that clarify meaningful register, regional, grammar, near-synonym, or naturalness distinctions; each item is { text, readingSegments, reading, romanization, translationText, register, note }
  - keywordTags: up to 5 short topical tags, or null
  - proficiencyLevel: { framework: "hsk", level: "1" | "2" | "3" | "4" | "5" | "6" | "7-9" }, or null${cantoneseExamples}`;
}
