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
