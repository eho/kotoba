import { beforeEach, describe, expect, it, mock } from "bun:test";

const mockGenerateContent = mock(async () => ({
  text: JSON.stringify({
    targetLanguage: "ja",
    sourceLanguage: "en",
    sourceText: "Thank you",
    targetText: "ありがとうございます",
    targetTextVariants: null,
    readingSegments: [{ text: "ありがとうございます", reading: null }],
    romanization: "arigatou gozaimasu",
    translationText: "Thank you",
    studyTokens: [],
    enrichment: null,
  }),
}));

const mockGoogleGenAI = mock((options: { apiKey: string }) => ({
  options,
  models: {
    generateContent: mockGenerateContent,
  },
}));

mock.module("@google/genai", () => ({
  GoogleGenAI: mockGoogleGenAI,
  Type: {
    OBJECT: "object",
    STRING: "string",
    ARRAY: "array",
    NUMBER: "number",
  },
}));

describe("translateWithKotobaGemini", () => {
  beforeEach(() => {
    mockGenerateContent.mockClear();
    mockGoogleGenAI.mockClear();
  });

  it("throws a configuration error before provider calls when the API key is missing", async () => {
    const { translateWithKotobaGemini } = await import("../index");

    await expect(
      translateWithKotobaGemini(
        { inputText: "Thank you", learningLanguage: "ja" },
        { apiKey: "" }
      )
    ).rejects.toThrow("Gemini API key is required");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns an enriched translation result with a normalized draft", async () => {
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "Thank you", learningLanguage: "ja" },
      { apiKey: "test-key", model: "test-model" }
    );

    expect(mockGoogleGenAI).toHaveBeenCalledWith({ apiKey: "test-key" });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        config: expect.objectContaining({
          responseMimeType: "application/json",
        }),
      })
    );
    expect(result.provider).toBe("gemini");
    expect(result.model).toBe("test-model");
    expect(result.draft).toMatchObject({
      targetLanguage: "ja",
      sourceLanguage: "en",
      sourceText: "Thank you",
      targetText: "ありがとうございます",
      targetTextVariants: null,
      translationText: "Thank you",
      source: "cloud",
      completeness: "enriched",
    });
    expect(result.draft.studyTokens.length).toBeGreaterThan(0);
  });

  it("asks for optional Japanese study token metadata only in Japanese prompts", async () => {
    const { buildStandardTranslationPrompt } = await import("../prompts");

    const japanesePrompt = buildStandardTranslationPrompt({
      inputText: "I drank tea",
      inputMode: "en_to_target",
      learningLanguage: "ja",
    });
    const mandarinPrompt = buildStandardTranslationPrompt({
      inputText: "I drank tea",
      inputMode: "en_to_target",
      learningLanguage: "zh",
      script: "zh-Hans",
      chineseVariant: "mandarin-simplified",
    });
    const koreanPrompt = buildStandardTranslationPrompt({
      inputText: "I drank tea",
      inputMode: "en_to_target",
      learningLanguage: "ko",
    });

    expect(japanesePrompt).toContain("metadata is optional and Japanese-only");
    expect(japanesePrompt).toContain("confident verb or adjective tokens");
    expect(japanesePrompt).toContain('kind: "verb"');
    expect(japanesePrompt).toContain('kind: "adjective"');
    expect(mandarinPrompt).not.toContain("metadata is optional and Japanese-only");
    expect(koreanPrompt).not.toContain("metadata is optional and Japanese-only");
  });

  it("allows optional Phase 1 Japanese metadata in the Gemini response schema", async () => {
    const { RESPONSE_SCHEMA } = await import("../responseSchema");

    const studyTokenSchema = RESPONSE_SCHEMA.properties.studyTokens.items;
    const metadataSchema = studyTokenSchema.properties.metadata;

    expect(studyTokenSchema.required).not.toContain("metadata");
    expect(metadataSchema.nullable).toBe(true);
    expect(metadataSchema.properties.language.enum).toEqual(["ja"]);
    expect(metadataSchema.properties.category.enum).toEqual(["morphology"]);
    expect(metadataSchema.properties.kind.enum).toEqual(["verb", "adjective"]);
    expect(metadataSchema.properties.verbClass.enum).toContain("godan-mu");
    expect(metadataSchema.properties.adjectiveClass.enum).toEqual(["i", "na"]);
    expect(metadataSchema.properties.observedForm.enum).toContain("past");
    expect(metadataSchema.properties.confidence.enum).toEqual([
      "high",
      "medium",
      "low",
    ]);
  });

  it("preserves valid Japanese study token metadata in normalized drafts", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ja",
        sourceLanguage: "en",
        sourceText: "I drank tea",
        targetText: "お茶を飲んだ",
        targetTextVariants: null,
        readingSegments: [
          { text: "お茶", reading: "おちゃ" },
          { text: "を", reading: null },
          { text: "飲んだ", reading: "のんだ" },
        ],
        romanization: "ocha o nonda",
        translationText: "I drank tea",
        studyTokens: [
          {
            id: "3:6:飲んだ",
            surface: "飲んだ",
            start: 3,
            end: 6,
            reading: "のんだ",
            audioText: "飲んだ",
            kind: "word",
            note: {
              partOfSpeech: "verb",
              meaning: "drank",
              note: "Past casual form of 飲む.",
            },
            metadata: {
              language: "ja",
              category: "morphology",
              kind: "verb",
              surface: "飲んだ",
              lemma: "飲む",
              verbClass: "godan-mu",
              observedForm: "past",
              confidence: "high",
            },
          },
        ],
        enrichment: null,
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "I drank tea", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(result.draft.studyTokens).toHaveLength(1);
    expect(result.draft.studyTokens[0]?.metadata).toEqual({
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: "飲んだ",
      lemma: "飲む",
      verbClass: "godan-mu",
      observedForm: "past",
      confidence: "high",
    });
    expect(result.warnings).toEqual([]);
  });

  it("drops malformed Japanese study token metadata with a warning while preserving the token", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ja",
        sourceLanguage: "en",
        sourceText: "I drank tea",
        targetText: "お茶を飲んだ",
        targetTextVariants: null,
        readingSegments: [
          { text: "お茶", reading: "おちゃ" },
          { text: "を", reading: null },
          { text: "飲んだ", reading: "のんだ" },
        ],
        romanization: "ocha o nonda",
        translationText: "I drank tea",
        studyTokens: [
          {
            id: "3:6:飲んだ",
            surface: "飲んだ",
            start: 3,
            end: 6,
            reading: "のんだ",
            audioText: "飲んだ",
            kind: "word",
            note: {
              partOfSpeech: "verb",
              meaning: "drank",
              note: "Past casual form of 飲む.",
            },
            metadata: {
              language: "ja",
              category: "morphology",
              kind: "verb",
              surface: "飲む",
              lemma: "飲む",
              verbClass: "not-a-class",
              observedForm: "past",
              confidence: "high",
            },
          },
        ],
        enrichment: null,
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "I drank tea", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(result.draft.studyTokens).toHaveLength(1);
    expect(result.draft.studyTokens[0]?.surface).toBe("飲んだ");
    expect(result.draft.studyTokens[0]).not.toHaveProperty("metadata");
    expect(result.warnings).toEqual([
      "Gemini: dropped payload subsections language=ja sections=studyTokens[0].metadata",
    ]);
  });

  it("normalizes Korean metadata without Chinese-only fields", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ko",
        sourceLanguage: "en",
        sourceText: "Thank you",
        targetText: "감사합니다",
        targetTextVariants: null,
        readingSystem: "hangul",
        readingSegments: [{ text: "감사합니다", reading: null }],
        romanization: "gamsahamnida",
        translationText: "Thank you",
        register: "formal",
        studyTokens: [
          {
            id: "0:5:감사합니다",
            surface: "감사합니다",
            start: 0,
            end: 5,
            reading: null,
            audioText: "감사합니다",
            kind: "phrase",
            note: {
              partOfSpeech: "phrase",
              meaning: "thank you",
              note: "Formal polite expression.",
            },
          },
        ],
        enrichment: {
          naturalness: "common",
          proficiencyLevel: { framework: "topik", level: "1" },
          korean: {
            speechLevel: "formal",
            registerLabel: "formal polite",
            romanizationSystem: "revised_romanization",
            note: "Useful in polite situations.",
          },
          cantoneseExamples: {
            colloquial: "not allowed",
          },
        },
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "Thank you", learningLanguage: "ko" },
      { apiKey: "test-key" }
    );

    expect(result.draft.targetLanguage).toBe("ko");
    expect(result.draft.targetTextVariants).toBeNull();
    expect(result.draft.chineseVariant).toBeUndefined();
    expect(result.draft.readingSystem).toBe("hangul");
    expect(result.draft.enrichment?.cantoneseExamples).toBeUndefined();
    expect(result.draft.enrichment?.korean).toEqual({
      speechLevel: "formal",
      registerLabel: "formal polite",
      romanizationSystem: "revised_romanization",
      note: "Useful in polite situations.",
    });
  });
});
