import { GoogleGenAI } from "@google/genai";
import type { GoogleGenAIOptions } from "@google/genai";

import {
  buildFallbackStudyTokens,
  detectDirection,
  getLanguageProfile,
  hasStudyTokenNoteContent,
  normalizeReadingSupport,
  normalizeTranslationDraft,
  promoteGrammarNotesToStudyTokens,
  resolveChineseVariantProfile,
  sanitizeEnrichmentData,
  sanitizeStudyTokens,
  validateReadingSegments,
} from "@edwinho/kotoba-core";
import type {
  ChineseLearningVariant,
  EnrichmentData,
  InputMode,
  ReadingSegment,
  SourceLanguage,
  SupportedLearningLanguage,
  TextVariants,
  TranslationDraft,
} from "@edwinho/kotoba-core";
import { buildEnrichmentPrompt, buildStandardTranslationPrompt } from "./prompts";
import type { OnDeviceDraftForGemini } from "./prompts";
import { RESPONSE_SCHEMA } from "./responseSchema";

export const DEFAULT_KOTOBA_GEMINI_MODEL = "gemini-2.5-flash-lite";

export type KotobaGeminiProviderBackend = "developer_api" | "vertex_ai";

export interface DeveloperApiGeminiClientOptions {
  provider?: "developer_api";
  apiKey: string;
  model?: string;
}

export interface VertexAiGeminiClientOptions {
  provider: "vertex_ai";
  project: string;
  location: string;
  model?: string;
  apiVersion?: string;
  googleAuthOptions?: GoogleGenAIOptions["googleAuthOptions"];
}

export type KotobaGeminiClientOptions =
  | DeveloperApiGeminiClientOptions
  | VertexAiGeminiClientOptions;

export interface EnrichedTranslationParams {
  inputText: string;
  learningLanguage: SupportedLearningLanguage;
  inputMode?: InputMode;
  chineseDisplayScript?: "zh-Hans" | "zh-Hant";
  chineseVariant?: ChineseLearningVariant | null;
  sourceLanguage?: SourceLanguage;
}

export interface EnrichOnDeviceDraftParams extends EnrichedTranslationParams {
  mode: "enrich_on_device_draft";
  inputMode: InputMode;
  onDeviceDraft: OnDeviceDraftForGemini;
}

export type TranslateWithKotobaGeminiParams =
  | EnrichedTranslationParams
  | EnrichOnDeviceDraftParams;

export interface TranslationProviderPayload {
  targetLanguage: SupportedLearningLanguage;
  sourceLanguage: SourceLanguage;
  sourceText: string;
  targetText: string;
  targetTextVariants?: TextVariants | null;
  chineseVariant?: ChineseLearningVariant | null;
  readingSystem?: "pinyin" | "jyutping" | "hangul" | "revised_romanization" | null;
  readingSegments: ReadingSegment[];
  romanization?: string | null;
  translationText: string;
  register?: "casual" | "polite" | "formal" | null;
  alternateForm?: string | null;
  usage?: string | null;
  enrichment?: EnrichmentData | null | unknown;
  studyTokens?: unknown;
}

export interface EnrichedTranslationResult {
  draft: TranslationDraft<SupportedLearningLanguage>;
  provider: "gemini";
  providerBackend?: KotobaGeminiProviderBackend;
  model: string;
  warnings: string[];
  canonicalTargetTextMismatch: {
    provided: string;
    returned: string;
  } | null;
}

function resolveProviderBackend(
  options: KotobaGeminiClientOptions
): KotobaGeminiProviderBackend {
  return options.provider ?? "developer_api";
}

export function createKotobaGeminiClient(options: KotobaGeminiClientOptions): GoogleGenAI {
  if (options.provider === "vertex_ai") {
    const project = options.project.trim();
    const location = options.location.trim();

    if (project.length === 0) {
      throw new Error("Google Cloud project is required for Vertex AI Gemini.");
    }
    if (location.length === 0) {
      throw new Error("Google Cloud location is required for Vertex AI Gemini.");
    }

    const genAiOptions: GoogleGenAIOptions = {
      vertexai: true,
      project,
      location,
      apiVersion: options.apiVersion?.trim() || "v1",
    };

    if (options.googleAuthOptions != null) {
      genAiOptions.googleAuthOptions = options.googleAuthOptions;
    }

    return new GoogleGenAI(genAiOptions);
  }

  if (!options.apiKey || options.apiKey.trim().length === 0) {
    throw new Error("Gemini API key is required for the Gemini Developer API.");
  }

  return new GoogleGenAI({ vertexai: false, apiKey: options.apiKey });
}

function validatePayload(
  payload: TranslationProviderPayload,
  learningLanguage: SupportedLearningLanguage
): void {
  if (
    !payload.targetLanguage ||
    !payload.sourceLanguage ||
    !payload.sourceText ||
    !payload.targetText ||
    !Array.isArray(payload.readingSegments) ||
    !payload.translationText
  ) {
    throw new Error("Provider payload missing required fields");
  }

  if (
    payload.readingSegments.length > 0 &&
    !validateReadingSegments(payload.readingSegments)
  ) {
    throw new Error("Provider payload has invalid readingSegments");
  }

  if (payload.targetLanguage !== learningLanguage) {
    throw new Error("Provider payload targetLanguage does not match requested language");
  }

  if (
    (payload.targetLanguage === "ja" || payload.targetLanguage === "ko") &&
    payload.targetTextVariants != null
  ) {
    throw new Error("Japanese and Korean payloads must have null targetTextVariants");
  }

  if (
    payload.targetTextVariants != null &&
    payload.targetTextVariants.primary !== payload.targetText
  ) {
    throw new Error("Provider payload targetTextVariants.primary must equal targetText");
  }
}

function normalizeTargetTextVariants(params: {
  payload: TranslationProviderPayload;
  effectiveTargetText: string;
  onDeviceDraft?: OnDeviceDraftForGemini;
}): TextVariants | null {
  if (params.payload.targetLanguage !== "zh") {
    return null;
  }

  const fallback = params.onDeviceDraft?.targetTextVariants ?? null;
  const variants = params.payload.targetTextVariants ?? fallback;
  if (variants == null) {
    return null;
  }

  return {
    ...variants,
    primary: params.effectiveTargetText,
  };
}

function isLexicalGrammarToken(token: {
  token: string;
  partOfSpeech: string;
}): boolean {
  const normalizedPartOfSpeech = token.partOfSpeech.trim().toLowerCase();
  return !["particle", "suffix", "auxiliary", "ending", "punctuation"].includes(
    normalizedPartOfSpeech
  );
}

function hasPhraseAlignedEnrichmentMismatch(params: {
  targetText: string;
  enrichment: EnrichmentData | null;
}): boolean {
  const grammarTokens = params.enrichment?.grammarBreakdown?.tokens ?? [];
  const lexicalGrammarTokens = grammarTokens.filter(
    (token) => token.token.trim().length > 0 && isLexicalGrammarToken(token)
  );

  if (lexicalGrammarTokens.length === 0) {
    return false;
  }

  const alignedLexicalTokenCount = lexicalGrammarTokens.filter((token) =>
    params.targetText.includes(token.token)
  ).length;

  return alignedLexicalTokenCount === 0;
}

function dropMismatchedGrammarBreakdown(
  enrichment: EnrichmentData | null
): EnrichmentData | null {
  if (enrichment == null || enrichment.grammarBreakdown == null) {
    return enrichment;
  }

  return {
    ...enrichment,
    grammarBreakdown: null,
  };
}

function isPinyinLikeCantoneseReading(value: string | null | undefined): boolean {
  if (value == null || value.trim().length === 0) {
    return false;
  }

  return (
    /[āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜüÜ]/i.test(value) ||
    /\b(?:wo|du|e|ni|hao|shi|ri|jin|tian|xie|qing|yao|mai|chi|he|zai|men|de)[1-5]\b/i.test(
      value
    )
  );
}

function dropUnsafeCantoneseStructuredReadings(
  enrichment: EnrichmentData | null,
  warnings: string[]
): EnrichmentData | null {
  if (enrichment == null) {
    return null;
  }

  let changed = false;
  const dropReading = (
    value: string | null | undefined,
    section: "registerVariants" | "usageContrasts" | "examples",
    index: number,
    field: "reading" | "romanization" | "readingSegments"
  ): string | null | undefined => {
    if (!isPinyinLikeCantoneseReading(value)) {
      return value;
    }

    changed = true;
    warnings.push(
      `Gemini: Cantonese structured item returned pinyin-like reading chineseVariant=cantonese-traditional section=${section} index=${index} field=${field}`
    );
    return null;
  };
  const dropReadingSegments = (
    readingSegments: ReadingSegment[] | null | undefined,
    section: "registerVariants" | "usageContrasts" | "examples",
    index: number
  ): ReadingSegment[] | undefined => {
    if (!Array.isArray(readingSegments)) {
      return undefined;
    }

    return readingSegments.map((segment) => ({
      ...segment,
      reading: dropReading(segment.reading, section, index, "readingSegments") ?? null,
    }));
  };

  const registerVariants = enrichment.registerVariants?.map((item, index) => ({
    ...item,
    readingSegments: dropReadingSegments(
      item.readingSegments,
      "registerVariants",
      index
    ),
    reading: dropReading(item.reading, "registerVariants", index, "reading"),
    romanization: dropReading(
      item.romanization,
      "registerVariants",
      index,
      "romanization"
    ),
  }));
  const usageContrasts = enrichment.usageContrasts?.map((item, index) => ({
    ...item,
    readingSegments: dropReadingSegments(
      item.readingSegments,
      "usageContrasts",
      index
    ),
    reading: dropReading(item.reading, "usageContrasts", index, "reading"),
    romanization: dropReading(
      item.romanization,
      "usageContrasts",
      index,
      "romanization"
    ),
  }));
  const examples = enrichment.examples?.map((item, index) => ({
    ...item,
    readingSegments: dropReadingSegments(item.readingSegments, "examples", index),
    reading: dropReading(item.reading, "examples", index, "reading"),
    romanization: dropReading(item.romanization, "examples", index, "romanization"),
  }));

  return changed
    ? {
        ...enrichment,
        registerVariants,
        usageContrasts,
        examples,
      }
    : enrichment;
}

function normalizePayload(
  payload: TranslationProviderPayload,
  params: {
    chineseVariant?: ChineseLearningVariant;
    onDeviceDraft?: OnDeviceDraftForGemini;
  } = {}
): {
  draft: TranslationDraft<SupportedLearningLanguage>;
  canonicalTargetTextMismatch: EnrichedTranslationResult["canonicalTargetTextMismatch"];
  warnings: string[];
} {
  const warnings: string[] = [];
  const canonicalTargetText = params.onDeviceDraft?.targetText;
  const canonicalTargetTextMismatch =
    canonicalTargetText && canonicalTargetText !== payload.targetText
      ? {
          provided: canonicalTargetText,
          returned: payload.targetText,
        }
      : null;
  const effectiveTargetText = canonicalTargetText ?? payload.targetText;
  const readingSupport = normalizeReadingSupport({
    targetText: effectiveTargetText,
    readingSegments: payload.readingSegments,
    romanization: payload.romanization,
  });
  const { enrichment, droppedSections } = sanitizeEnrichmentData(payload.enrichment);
  const normalizedEnrichment =
    params.chineseVariant === "cantonese-traditional"
      ? dropUnsafeCantoneseStructuredReadings(enrichment, warnings)
      : enrichment;
  const hasSemanticPhraseMismatch = hasPhraseAlignedEnrichmentMismatch({
    targetText: effectiveTargetText,
    enrichment: normalizedEnrichment,
  });
  const safeEnrichment = hasSemanticPhraseMismatch
    ? dropMismatchedGrammarBreakdown(normalizedEnrichment)
    : normalizedEnrichment;
  const shouldDropProviderAlignedFields = canonicalTargetTextMismatch != null;
  const {
    studyTokens,
    droppedSections: droppedStudyTokenSections,
  } = shouldDropProviderAlignedFields
    ? { studyTokens: [], droppedSections: [] }
    : sanitizeStudyTokens(payload.studyTokens, effectiveTargetText);
  const normalizedStudyTokens =
    studyTokens.length > 0
      ? studyTokens
      : buildFallbackStudyTokens({
          targetText: effectiveTargetText,
          readingSegments: shouldDropProviderAlignedFields
            ? []
            : readingSupport.readingSegments,
          targetLanguage: payload.targetLanguage,
        });
  const notesBeforePromotion = normalizedStudyTokens.filter((token) =>
    hasStudyTokenNoteContent(token.note)
  ).length;
  const canonicalStudyTokens = promoteGrammarNotesToStudyTokens({
    studyTokens: normalizedStudyTokens,
    enrichment: shouldDropProviderAlignedFields ? null : safeEnrichment,
  });
  const notesAfterPromotion = canonicalStudyTokens.filter((token) =>
    hasStudyTokenNoteContent(token.note)
  ).length;

  if (droppedSections.length > 0 || droppedStudyTokenSections.length > 0) {
    warnings.push(
      `Gemini: dropped payload subsections language=${payload.targetLanguage} sections=${[
        ...droppedSections,
        ...droppedStudyTokenSections,
      ].join(",")}`
    );
  }

  if (studyTokens.length === 0 && normalizedStudyTokens.length > 0) {
    warnings.push(
      `Gemini: generated fallback studyTokens language=${payload.targetLanguage} studyTokenCount=${normalizedStudyTokens.length}`
    );
  }

  if (notesAfterPromotion > notesBeforePromotion) {
    warnings.push(
      `Gemini: promoted grammar notes into studyTokens language=${payload.targetLanguage} promotedCount=${notesAfterPromotion - notesBeforePromotion}`
    );
  }

  if (hasSemanticPhraseMismatch) {
    warnings.push(
      `Gemini: dropped grammarBreakdown due to semantic mismatch language=${payload.targetLanguage} targetText="${effectiveTargetText}" romanization="${payload.romanization ?? ""}"`
    );
  }

  const alternateForm =
    !shouldDropProviderAlignedFields && payload.alternateForm?.trim().length
      ? payload.alternateForm
      : canonicalTargetTextMismatch
        ? payload.targetText
        : null;
  const sourceText =
    shouldDropProviderAlignedFields && params.onDeviceDraft != null
      ? params.onDeviceDraft.sourceText
      : payload.sourceText;
  const translationText =
    shouldDropProviderAlignedFields && params.onDeviceDraft != null
      ? params.onDeviceDraft.translationText
      : payload.translationText;
  const expectedChineseReading =
    payload.targetLanguage === "zh" && params.chineseVariant != null
      ? resolveChineseVariantProfile(params.chineseVariant).readingSystem
      : null;

  if (
    payload.targetLanguage === "zh" &&
    params.chineseVariant === "cantonese-traditional"
  ) {
    if (
      payload.readingSystem !== "jyutping" ||
      readingSupport.readingSegments.length === 0 ||
      readingSupport.romanization == null
    ) {
      warnings.push(
        `Gemini: Cantonese reading support unsafe chineseVariant=${params.chineseVariant} expectedReadingSystem=jyutping returnedReadingSystem=${payload.readingSystem ?? "missing"} readingSegmentCount=${readingSupport.readingSegments.length} hasRomanization=${String(readingSupport.romanization != null)}`
      );
    }

    if (shouldDropProviderAlignedFields) {
      warnings.push(
        `Gemini: Cantonese provider-aligned fields dropped as unsafe chineseVariant=${params.chineseVariant} canonicalMismatch=${String(canonicalTargetTextMismatch != null)} semanticMismatch=${String(hasSemanticPhraseMismatch)}`
      );
    }
  }

  const draft = normalizeTranslationDraft(
    {
      targetLanguage: payload.targetLanguage,
      sourceLanguage: payload.sourceLanguage,
      sourceText,
      targetText: effectiveTargetText,
      targetTextVariants: normalizeTargetTextVariants({
        payload,
        effectiveTargetText,
        onDeviceDraft: params.onDeviceDraft,
      }),
      chineseVariant:
        payload.targetLanguage === "zh"
          ? params.chineseVariant ?? payload.chineseVariant ?? null
          : null,
      readingSystem:
        payload.targetLanguage === "zh"
          ? expectedChineseReading ?? payload.readingSystem ?? null
          : payload.targetLanguage === "ko"
            ? payload.readingSystem ?? "hangul"
            : null,
      readingSegments: shouldDropProviderAlignedFields
        ? []
        : readingSupport.readingSegments,
      romanization: shouldDropProviderAlignedFields ? null : readingSupport.romanization,
      translationText,
      register: shouldDropProviderAlignedFields ? null : (payload.register ?? null),
      alternateForm,
      usage: shouldDropProviderAlignedFields ? null : (payload.usage ?? null),
      enrichment: shouldDropProviderAlignedFields ? null : safeEnrichment,
      studyTokens: canonicalStudyTokens,
    },
    {
      source: "cloud",
      completeness: "enriched",
      canRegenerateWithCloud: true,
    }
  );

  return {
    draft,
    canonicalTargetTextMismatch,
    warnings,
  };
}

function resolveEffectiveChineseVariant(params: {
  learningLanguage: SupportedLearningLanguage;
  chineseDisplayScript?: "zh-Hans" | "zh-Hant";
  chineseVariant?: ChineseLearningVariant | null;
}): ChineseLearningVariant | undefined {
  if (params.learningLanguage !== "zh") {
    return undefined;
  }

  return (
    params.chineseVariant ??
    ((params.chineseDisplayScript ?? "zh-Hans") === "zh-Hant"
      ? "mandarin-traditional-taiwan"
      : "mandarin-simplified")
  );
}

export async function translateWithKotobaGemini(
  params: TranslateWithKotobaGeminiParams,
  options: KotobaGeminiClientOptions
): Promise<EnrichedTranslationResult> {
  const { inputText, learningLanguage, chineseDisplayScript } = params;
  const inputMode =
    "mode" in params && params.mode === "enrich_on_device_draft"
      ? params.inputMode
      : params.inputMode ?? detectDirection(inputText, learningLanguage);
  const profile = getLanguageProfile(learningLanguage);
  const effectiveChineseVariant = resolveEffectiveChineseVariant({
    learningLanguage,
    chineseDisplayScript,
    chineseVariant: params.chineseVariant,
  });
  const scriptCode =
    learningLanguage === "zh"
      ? effectiveChineseVariant != null
        ? resolveChineseVariantProfile(effectiveChineseVariant).displayScript
        : (chineseDisplayScript ?? "zh-Hans") === "zh-Hant"
          ? ("zh-Hant" as const)
          : ("zh-Hans" as const)
      : profile.defaultScript;

  const prompt =
    "mode" in params && params.mode === "enrich_on_device_draft"
      ? buildEnrichmentPrompt({
          inputText,
          inputMode,
          learningLanguage,
          chineseDisplayScript,
          chineseVariant: effectiveChineseVariant,
          onDeviceDraft: params.onDeviceDraft,
        })
      : buildStandardTranslationPrompt({
          inputText,
          inputMode,
          learningLanguage,
          script: scriptCode,
          chineseVariant: effectiveChineseVariant,
        });
  const ai = createKotobaGeminiClient(options);
  const providerBackend = resolveProviderBackend(options);
  const model = options.model ?? DEFAULT_KOTOBA_GEMINI_MODEL;

  const response = await ai.models.generateContent({
    model,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseJsonSchema: RESPONSE_SCHEMA,
    },
  });

  if (!response.text) {
    throw new Error("Gemini returned an empty response");
  }

  const payload = JSON.parse(response.text) as TranslationProviderPayload;
  validatePayload(payload, learningLanguage);
  const normalized = normalizePayload(payload, {
    chineseVariant: effectiveChineseVariant,
    onDeviceDraft:
      "mode" in params && params.mode === "enrich_on_device_draft"
        ? params.onDeviceDraft
        : undefined,
  });

  return {
    draft: normalized.draft,
    provider: "gemini",
    providerBackend,
    model,
    warnings: normalized.warnings,
    canonicalTargetTextMismatch: normalized.canonicalTargetTextMismatch,
  };
}
