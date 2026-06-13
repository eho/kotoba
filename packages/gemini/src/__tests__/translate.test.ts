import { beforeEach, describe, expect, it, mock } from "bun:test";

const sampleEnrichment = {
  literalTranslation: "Thank you very much",
  grammarBreakdown: null,
  characterBreakdown: null,
  naturalness: "common",
  bestUsedWhen: "Polite thanks in everyday service or social settings.",
  avoidWhen: null,
  confusableAlternatives: null,
  exampleSentence: "ありがとうございます、助かりました。",
  keywordTags: ["thanks", "polite"],
  proficiencyLevel: { framework: "jlpt", level: "N5" },
  cantoneseExamples: null,
  korean: null,
  registerVariants: null,
  usageContrasts: null,
  examples: null,
};

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
    enrichment: sampleEnrichment,
  }),
}));

const mockGoogleGenAI = mock((options: Record<string, unknown>) => ({
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

  it("constructs Developer API clients when provider is explicit or omitted", async () => {
    const { createKotobaGeminiClient } = await import("../index");

    createKotobaGeminiClient({ apiKey: "default-key" });
    createKotobaGeminiClient({
      provider: "developer_api",
      apiKey: "explicit-key",
    });

    expect(mockGoogleGenAI).toHaveBeenNthCalledWith(1, {
      vertexai: false,
      apiKey: "default-key",
    });
    expect(mockGoogleGenAI).toHaveBeenNthCalledWith(2, {
      vertexai: false,
      apiKey: "explicit-key",
    });
  });

  it("constructs Vertex AI clients with the v1 API by default", async () => {
    const { createKotobaGeminiClient } = await import("../index");

    createKotobaGeminiClient({
      provider: "vertex_ai",
      project: "kotoba-prod",
      location: "global",
    });

    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      vertexai: true,
      project: "kotoba-prod",
      location: "global",
      apiVersion: "v1",
    });
  });

  it("passes Vertex AI API version and auth options when provided", async () => {
    const { createKotobaGeminiClient } = await import("../index");
    const googleAuthOptions = {
      credentials: {
        client_email: "service-account@example.com",
        private_key: "secret-private-key",
      },
    };

    createKotobaGeminiClient({
      provider: "vertex_ai",
      project: "kotoba-preview",
      location: "us-central1",
      apiVersion: "v1beta",
      googleAuthOptions,
    });

    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      vertexai: true,
      project: "kotoba-preview",
      location: "us-central1",
      apiVersion: "v1beta",
      googleAuthOptions,
    });
  });

  it("throws sanitized configuration errors without logging secrets", async () => {
    const { createKotobaGeminiClient } = await import("../index");
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    const consoleError = mock(() => undefined);
    const consoleWarn = mock(() => undefined);
    console.error = consoleError as unknown as typeof console.error;
    console.warn = consoleWarn as unknown as typeof console.warn;

    const expectSanitizedConfigError = (
      constructClient: () => unknown,
      expectedMessage: string
    ) => {
      try {
        constructClient();
        throw new Error("Expected configuration error");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        const message = (error as Error).message;
        expect(message).toContain(expectedMessage);
        expect(message).not.toContain("secret-private-key");
        expect(message).not.toContain("service-account@example.com");
      }
    };

    try {
      expectSanitizedConfigError(
        () =>
          createKotobaGeminiClient({
            provider: "developer_api",
            apiKey: "",
          }),
        "Gemini API key is required for the Gemini Developer API."
      );
      expectSanitizedConfigError(
        () =>
          createKotobaGeminiClient({
            provider: "vertex_ai",
            project: " ",
            location: "global",
            googleAuthOptions: {
              credentials: {
                client_email: "service-account@example.com",
                private_key: "secret-private-key",
              },
            },
          }),
        "Google Cloud project is required for Vertex AI Gemini."
      );
      expectSanitizedConfigError(
        () =>
          createKotobaGeminiClient({
            provider: "vertex_ai",
            project: "kotoba-prod",
            location: "",
          }),
        "Google Cloud location is required for Vertex AI Gemini."
      );
    } finally {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    }

    expect(mockGoogleGenAI).not.toHaveBeenCalled();
    expect(consoleError).not.toHaveBeenCalled();
    expect(consoleWarn).not.toHaveBeenCalled();
  });

  it("throws a configuration error before provider calls when the API key is missing", async () => {
    const { translateWithKotobaGemini } = await import("../index");

    await expect(
      translateWithKotobaGemini(
        { inputText: "Thank you", learningLanguage: "ja" },
        { apiKey: "" }
      )
    ).rejects.toThrow("Gemini API key is required for the Gemini Developer API.");
    expect(mockGenerateContent).not.toHaveBeenCalled();
  });

  it("returns an enriched translation result with a normalized draft", async () => {
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "Thank you", learningLanguage: "ja" },
      { apiKey: "test-key", model: "test-model" }
    );

    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      vertexai: false,
      apiKey: "test-key",
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.objectContaining({
        model: "test-model",
        config: expect.objectContaining({
          maxOutputTokens: 8192,
          responseMimeType: "application/json",
          temperature: 0.2,
        }),
      })
    );
    expect(result.provider).toBe("gemini");
    expect(result.providerBackend).toBe("developer_api");
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

  it("retries once when the provider returns invalid JSON", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: '{"targetLanguage":"ja","sourceLanguage":"en"',
    });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ja",
        sourceLanguage: "en",
        sourceText: "I drank",
        targetText: "飲んだ",
        targetTextVariants: null,
        readingSegments: [{ text: "飲んだ", reading: "のんだ" }],
        romanization: "nonda",
        translationText: "I drank",
        studyTokens: [
          {
            id: "0:3:飲んだ",
            surface: "飲んだ",
            start: 0,
            end: 3,
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
        enrichment: sampleEnrichment,
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "I drank", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    const retryRequest = mockGenerateContent.mock.calls[1]?.[0];
    expect(String(retryRequest?.contents)).toContain("JSON repair:");
    expect(String(retryRequest?.contents)).toContain("valid compact JSON object only");
    expect(result.draft.targetText).toBe("飲んだ");
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain(
      "Gemini: retried invalid JSON response context=initial"
    );
  });

  it("rejects provider payloads that omit cloud enrichment", async () => {
    mockGenerateContent.mockResolvedValueOnce({
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
    });
    const { translateWithKotobaGemini } = await import("../index");

    await expect(
      translateWithKotobaGemini(
        { inputText: "Thank you", learningLanguage: "ja" },
        { apiKey: "test-key" }
      )
    ).rejects.toThrow("Provider payload missing enrichment");
  });

  it("rejects provider payloads that omit required cloud enrichment fields", async () => {
    mockGenerateContent.mockResolvedValueOnce({
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
        enrichment: {},
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    await expect(
      translateWithKotobaGemini(
        { inputText: "Thank you", learningLanguage: "ja" },
        { apiKey: "test-key" }
      )
    ).rejects.toThrow("Provider payload enrichment schema missing required fields");
  });

  it("uses the same generateContent request shape for Developer API and Vertex AI", async () => {
    const { RESPONSE_SCHEMA, translateWithKotobaGemini } = await import("../index");
    const params = { inputText: "Thank you", learningLanguage: "ja" } as const;

    const developerResult = await translateWithKotobaGemini(params, {
      provider: "developer_api",
      apiKey: "developer-key",
      model: "test-model",
    });
    const developerRequest = mockGenerateContent.mock.calls[0]?.[0];

    mockGenerateContent.mockClear();
    mockGoogleGenAI.mockClear();

    const vertexResult = await translateWithKotobaGemini(params, {
      provider: "vertex_ai",
      project: "kotoba-prod",
      location: "global",
      model: "test-model",
    });
    const vertexRequest = mockGenerateContent.mock.calls[0]?.[0];

    expect(mockGoogleGenAI).toHaveBeenCalledWith({
      vertexai: true,
      project: "kotoba-prod",
      location: "global",
      apiVersion: "v1",
    });
    expect(vertexRequest).toEqual(developerRequest);
    expect(developerRequest).toEqual(
      expect.objectContaining({
        model: "test-model",
        config: expect.objectContaining({
          responseMimeType: "application/json",
          responseSchema: RESPONSE_SCHEMA,
        }),
      })
    );
    expect(developerResult.provider).toBe("gemini");
    expect(developerResult.providerBackend).toBe("developer_api");
    expect(vertexResult.provider).toBe("gemini");
    expect(vertexResult.providerBackend).toBe("vertex_ai");
  });

  it("asks for Japanese study token metadata for confident verb and adjective tokens only in Japanese prompts", async () => {
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

    expect(japanesePrompt).toContain("metadata is Japanese-only");
    expect(japanesePrompt).toContain("for every confident Japanese verb, i-adjective, or na-adjective study-token surface");
    expect(japanesePrompt).toContain("prefer one word-level studyToken for the full inflected surface");
    expect(japanesePrompt).toContain("attach metadata to the full conjugated verb/adjective surface token");
    expect(japanesePrompt).toContain("食べます");
    expect(japanesePrompt).toContain("歩きます");
    expect(japanesePrompt).toContain('language: "ja"');
    expect(japanesePrompt).toContain('category: "morphology"');
    expect(japanesePrompt).toContain('lemma: "食べる"');
    expect(japanesePrompt).toContain('lemma: "歩く"');
    expect(japanesePrompt).toContain('verbClass: "ichidan"');
    expect(japanesePrompt).toContain('verbClass: "godan-ku"');
    expect(japanesePrompt).toContain('observedForm: "polite"');
    expect(japanesePrompt).toContain("静かだった");
    expect(japanesePrompt).toContain('kind: "verb"');
    expect(japanesePrompt).toContain('kind: "adjective"');
    expect(mandarinPrompt).not.toContain("metadata is Japanese-only");
    expect(koreanPrompt).not.toContain("metadata is Japanese-only");
  });

  it("allows optional Phase 1 Japanese metadata in the Gemini response schema", async () => {
    const { RESPONSE_SCHEMA } = await import("../responseSchema");

    const studyTokenSchema = RESPONSE_SCHEMA.properties.studyTokens.items;
    const metadataSchema = studyTokenSchema.properties.metadata;

    expect(RESPONSE_SCHEMA.required).toEqual(
      expect.arrayContaining([
        "targetLanguage",
        "sourceLanguage",
        "sourceText",
        "targetText",
        "readingSegments",
        "romanization",
        "translationText",
        "register",
        "alternateForm",
        "usage",
        "studyTokens",
        "enrichment",
      ])
    );
    expect(RESPONSE_SCHEMA.properties.enrichment.nullable).toBeUndefined();
    expect(RESPONSE_SCHEMA.properties.enrichment.required).toEqual(
      expect.arrayContaining([
        "naturalness",
        "bestUsedWhen",
      ])
    );
    expect(RESPONSE_SCHEMA.properties.enrichment.properties.naturalness.nullable).toBeUndefined();
    expect(RESPONSE_SCHEMA.properties.enrichment.properties.bestUsedWhen.nullable).toBeUndefined();
    expect(studyTokenSchema.required).not.toContain("metadata");
    expect(metadataSchema.nullable).toBe(true);
    expect(metadataSchema.properties.language.enum).toEqual(["ja"]);
    expect(metadataSchema.properties.category.enum).toEqual(["morphology"]);
    expect(metadataSchema.properties.kind.enum).toEqual(["verb", "adjective"]);
    expect(metadataSchema.properties.verbClass.enum).toContain("godan-mu");
    expect(metadataSchema.properties.adjectiveClass.enum).toEqual(["i", "na"]);
    expect(metadataSchema.properties.observedForm.enum).toContain("past");
    expect(metadataSchema.properties.observedForm.enum).toContain("polite-past");
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
        enrichment: sampleEnrichment,
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

  it("preserves high-confidence polite verb metadata for form-table rendering", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ja",
        sourceLanguage: "en",
        sourceText: "What are we eating?",
        targetText: "何を食べますか",
        targetTextVariants: null,
        readingSegments: [
          { text: "何", reading: "なん" },
          { text: "を", reading: null },
          { text: "食べます", reading: "たべます" },
          { text: "か", reading: null },
        ],
        romanization: "nan o tabemasu ka",
        translationText: "What are we eating?",
        studyTokens: [
          {
            id: "2:6:食べます",
            surface: "食べます",
            start: 2,
            end: 6,
            reading: "たべます",
            audioText: "食べます",
            kind: "word",
            note: {
              partOfSpeech: "verb",
              meaning: "eat",
              note: "Polite ます form of 食べる.",
            },
            metadata: {
              language: "ja",
              category: "morphology",
              kind: "verb",
              surface: "食べます",
              lemma: "食べる",
              verbClass: "ichidan",
              observedForm: "polite",
              confidence: "high",
            },
          },
        ],
        enrichment: sampleEnrichment,
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "What are we eating?", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(result.draft.studyTokens[0]).toMatchObject({
      surface: "食べます",
      note: {
        partOfSpeech: "verb",
        meaning: "eat",
        note: "Polite ます form of 食べる.",
      },
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "verb",
        surface: "食べます",
        lemma: "食べる",
        verbClass: "ichidan",
        observedForm: "polite",
        confidence: "high",
      },
    });
    expect(result.warnings).toEqual([]);
  });

  it("does not request morphology repair for adverb tokens", async () => {
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify({
        targetLanguage: "ja",
        sourceLanguage: "en",
        sourceText: "I ate sushi yesterday",
        targetText: "昨日寿司を食べました。",
        targetTextVariants: null,
        readingSegments: [
          { text: "昨日", reading: "きのう" },
          { text: "寿司", reading: "すし" },
          { text: "を", reading: null },
          { text: "食べました", reading: "たべました" },
          { text: "。", reading: null },
        ],
        romanization: "kinou sushi o tabemashita",
        translationText: "I ate sushi yesterday.",
        studyTokens: [
          {
            id: "0:2:昨日",
            surface: "昨日",
            start: 0,
            end: 2,
            reading: "きのう",
            audioText: "昨日",
            kind: "word",
            note: {
              partOfSpeech: "adverb",
              meaning: "yesterday",
              note: null,
            },
          },
          {
            id: "2:4:寿司",
            surface: "寿司",
            start: 2,
            end: 4,
            reading: "すし",
            audioText: "寿司",
            kind: "word",
            note: {
              partOfSpeech: "noun",
              meaning: "sushi",
              note: null,
            },
          },
          {
            id: "5:10:食べました",
            surface: "食べました",
            start: 5,
            end: 10,
            reading: "たべました",
            audioText: "食べました",
            kind: "word",
            note: {
              partOfSpeech: "verb",
              meaning: "ate",
              note: "Polite past form of 食べる.",
            },
            metadata: {
              language: "ja",
              category: "morphology",
              kind: "verb",
              surface: "食べました",
              lemma: "食べる",
              verbClass: "ichidan",
              observedForm: "polite-past",
              confidence: "high",
            },
          },
        ],
        enrichment: sampleEnrichment,
      }),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "I ate sushi yesterday", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(result.draft.studyTokens.find((token) => token.surface === "昨日")).not.toHaveProperty(
      "metadata"
    );
    expect(result.warnings).toEqual([]);
  });

  it("repairs missing Japanese morphology metadata for verb and adjective study tokens", async () => {
    const missingMetadataPayload = {
      targetLanguage: "ja",
      sourceLanguage: "en",
      sourceText: "I walk to the station",
      targetText: "駅まで歩きます",
      targetTextVariants: null,
      readingSegments: [
        { text: "駅", reading: "えき" },
        { text: "まで", reading: null },
        { text: "歩きます", reading: "あるきます" },
      ],
      romanization: "eki made arukimasu",
      translationText: "I walk to the station.",
      studyTokens: [
        {
          id: "3:7:歩きます",
          surface: "歩きます",
          start: 3,
          end: 7,
          reading: "あるきます",
          audioText: "歩きます",
          kind: "word",
          note: {
            partOfSpeech: "verb",
            meaning: "walk",
            note: "Polite ます form.",
          },
        },
      ],
      enrichment: sampleEnrichment,
    };
    const repairedPayload = {
      ...missingMetadataPayload,
      studyTokens: [
        {
          ...missingMetadataPayload.studyTokens[0],
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "verb",
            surface: "歩きます",
            lemma: "歩く",
            verbClass: "godan-ku",
            observedForm: "polite",
            confidence: "high",
          },
        },
      ],
    };
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(missingMetadataPayload),
    });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(repairedPayload),
    });
    const { translateWithKotobaGemini } = await import("../index");

    const result = await translateWithKotobaGemini(
      { inputText: "I walk to the station", learningLanguage: "ja" },
      { apiKey: "test-key" }
    );

    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    const repairRequest = mockGenerateContent.mock.calls[1]?.[0];
    expect(String(repairRequest?.contents)).toContain("Quality repair:");
    expect(String(repairRequest?.contents)).toContain("歩きます");
    expect(result.draft.targetText).toBe("駅まで歩きます");
    expect(result.draft.studyTokens[0]?.metadata).toEqual({
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: "歩きます",
      lemma: "歩く",
      verbClass: "godan-ku",
      observedForm: "polite",
      confidence: "high",
    });
    expect(result.warnings).toEqual([
      'Gemini: repaired missing Japanese morphology metadata surfaces="歩きます"',
    ]);
  });

  it("drops malformed Japanese study token metadata with a warning while preserving the token", async () => {
    const malformedPayload = {
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
      enrichment: sampleEnrichment,
    };
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(malformedPayload),
    });
    mockGenerateContent.mockResolvedValueOnce({
      text: JSON.stringify(malformedPayload),
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
      'Gemini: missing Japanese morphology metadata after repair surfaces="飲んだ"',
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
          bestUsedWhen: "Formal polite thanks in everyday Korean contexts.",
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
