import { describe, expect, it } from "bun:test";
import {
  buildFallbackStudyTokens,
  normalizeTranslationDraft,
  sanitizeEnrichmentData,
  sanitizeStudyTokens,
  validateReadingSegments,
} from "../src";
import { malformedStudyTokenMetadata } from "./fixtures/japaneseFormTables.fixtures";

describe("core validators and normalizers", () => {
  it("drops malformed provider-like enrichment sections while preserving valid fields", () => {
    const result = sanitizeEnrichmentData({
      literalTranslation: "stomach became empty",
      grammarBreakdown: {
        confidence: "low",
        tokens: [{ token: "お腹", partOfSpeech: "noun", meaning: "stomach" }],
      },
      naturalness: "overly-fancy",
      bestUsedWhen: 42,
      confusableAlternatives: ["お腹が減りました", ""],
      examples: [
        { text: "Casual - お腹空いた", translationText: "I'm hungry." },
        {
          text: "お腹が空きました。",
          reading: "おなかがすきました",
          translationText: "I'm hungry.",
          register: "polite",
        },
      ],
    });

    expect(result.enrichment).toMatchObject({
      literalTranslation: "stomach became empty",
      grammarBreakdown: null,
      confusableAlternatives: ["お腹が減りました"],
      examples: [
        {
          text: "お腹が空きました。",
          reading: "おなかがすきました",
          translationText: "I'm hungry.",
          register: "polite",
        },
      ],
    });
    expect(result.droppedSections).toEqual([
      "grammarBreakdown:low_confidence",
      "naturalness",
      "bestUsedWhen",
      "examples:0",
    ]);
  });

  it("rejects invalid study tokens and keeps canonical native-script audio text", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "お腹",
          start: 0,
          end: 2,
          reading: "おなか",
          audioText: "onaka",
          kind: "word",
          note: { meaning: "stomach" },
        },
        {
          surface: "空腹",
          start: 3,
          end: 5,
          reading: "くうふく",
          audioText: "空腹",
          kind: "word",
          note: null,
        },
        {
          surface: "。",
          start: 7,
          end: 8,
          reading: null,
          audioText: "。",
          kind: "word",
          note: null,
        },
      ],
      "お腹が空いた。"
    );

    expect(result.studyTokens).toEqual([
      {
        id: "0:2:お腹",
        surface: "お腹",
        start: 0,
        end: 2,
        reading: "おなか",
        audioText: "お腹",
        kind: "word",
        note: {
          partOfSpeech: null,
          meaning: "stomach",
          note: null,
        },
      },
    ]);
    expect(result.droppedSections).toEqual(["studyTokens:1", "studyTokens:2"]);
  });

  it("preserves valid Japanese morphology metadata on sanitized study tokens", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "飲んだ",
          start: 0,
          end: 3,
          reading: "のんだ",
          audioText: "nonda",
          kind: "word",
          note: { partOfSpeech: "verb", meaning: "drank" },
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
      "飲んだ"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens).toEqual([
      expect.objectContaining({
        surface: "飲んだ",
        audioText: "飲んだ",
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
      }),
    ]);
  });

  it("drops malformed study token metadata without dropping the token", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "食べた",
          start: 0,
          end: 3,
          reading: "たべた",
          audioText: "tabeta",
          kind: "word",
          note: { partOfSpeech: "verb", meaning: "ate" },
          metadata: malformedStudyTokenMetadata,
        },
      ],
      "食べた"
    );

    expect(result.studyTokens).toEqual([
      expect.not.objectContaining({
        metadata: expect.anything(),
      }),
    ]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "食べた",
      audioText: "食べた",
      note: {
        partOfSpeech: "verb",
        meaning: "ate",
        note: null,
      },
    });
    expect(result.droppedSections).toEqual(["studyTokens[0].metadata"]);
  });

  it("normalizes translation drafts after dropping invalid reading and study-token sections", () => {
    const draft = normalizeTranslationDraft(
      {
        targetLanguage: "zh",
        sourceLanguage: "en",
        sourceText: "welcome",
        targetText: "欢迎",
        targetTextVariants: {
          primary: "欢迎",
          simplified: "欢迎",
          traditional: "歡迎",
        },
        chineseVariant: "not-a-variant",
        readingSystem: "not-a-reading-system",
        readingSegments: [
          { text: "欢迎", reading: "huan1 ying2" },
          { text: "missing", reading: "missing" },
        ],
        romanization: "huan1 ying2",
        translationText: "welcome",
        register: null,
        studyTokens: [
          {
            surface: "欢迎",
            start: 0,
            end: 2,
            reading: "huan1 ying2",
            audioText: "huan1 ying2",
            kind: "word",
            note: null,
          },
          {
            surface: "坏",
            start: 2,
            end: 3,
            reading: null,
            audioText: "坏",
            kind: "word",
            note: null,
          },
        ],
      },
      {
        source: "on_device",
        canRegenerateWithCloud: true,
      }
    );

    expect(draft.chineseVariant).toBe("mandarin-simplified");
    expect(draft.readingSystem).toBe("pinyin");
    expect(draft.readingSegments).toEqual([
      { text: "欢迎", reading: "huan1 ying2" },
    ]);
    expect(draft.studyTokens).toEqual([
      expect.objectContaining({
        surface: "欢迎",
        audioText: "欢迎",
      }),
    ]);
    expect(draft.completeness).toBe("enriched");
    expect(draft.capabilities).toEqual({
      hasReadingSegments: true,
      hasRomanization: true,
      hasRegister: false,
      hasAlternateForm: false,
      hasUsage: false,
      canRegenerateWithCloud: true,
    });
  });

  it("normalizes Korean fixture payloads while dropping unsupported Chinese-only fields", () => {
    const { enrichment, droppedSections } = sanitizeEnrichmentData({
      literalTranslation: "I will go now",
      proficiencyLevel: { framework: "topik", level: "2" },
      cantoneseExamples: {
        colloquial: "我走先",
        formalWritten: "我先走了",
      },
      korean: {
        speechLevel: "polite",
        registerLabel: "해요체",
        romanizationSystem: "revised_romanization",
        note: null,
      },
      registerVariants: [
        {
          text: "나 지금 가.",
          role: "casual",
          register: "casual",
          readingSegments: [{ text: "나", reading: "na" }],
          romanization: "na jigeum ga",
          translationText: "I'm going now.",
          usageNote: "Casual speech with close friends.",
        },
      ],
      examples: [
        {
          text: "저는 지금 갑니다.",
          readingSegments: [{ text: "저는", reading: "jeoneun" }],
          romanization: "jeoneun jigeum gamnida",
          translationText: "I am going now.",
          register: "formal",
          note: null,
        },
      ],
    });

    expect(droppedSections).toEqual([]);

    const draft = normalizeTranslationDraft(
      {
        targetLanguage: "ko",
        sourceLanguage: "en",
        sourceText: "I'm going now",
        targetText: "저 지금 가요.",
        targetTextVariants: {
          primary: "저 지금 가요.",
          simplified: "Chinese-only payload should not survive",
          traditional: "Chinese-only payload should not survive",
        },
        chineseVariant: "cantonese-traditional",
        readingSystem: "revised_romanization",
        readingSegments: [
          { text: "저", reading: "jeo" },
          { text: "지금", reading: "jigeum" },
          { text: "가요", reading: "gayo" },
        ],
        romanization: "jeo jigeum gayo",
        translationText: "I'm going now.",
        register: "polite",
        enrichment,
        studyTokens: [
          {
            surface: "지금",
            start: 2,
            end: 4,
            reading: "jigeum",
            audioText: "jigeum",
            kind: "word",
            note: { partOfSpeech: "adverb", meaning: "now" },
          },
        ],
      },
      {
        source: "cloud",
        canRegenerateWithCloud: true,
      }
    );

    expect(draft.targetLanguage).toBe("ko");
    expect(draft.targetTextVariants).toBeNull();
    expect(draft.chineseVariant).toBeUndefined();
    expect(draft.readingSystem).toBe("revised_romanization");
    expect(draft.readingSegments).toEqual([
      { text: "저", reading: "jeo" },
      { text: "지금", reading: "jigeum" },
      { text: "가요", reading: "gayo" },
    ]);
    expect(draft.romanization).toBe("jeo jigeum gayo");
    expect(draft.register).toBe("polite");
    expect(draft.studyTokens).toEqual([
      expect.objectContaining({
        surface: "지금",
        reading: "jigeum",
        audioText: "지금",
        note: {
          partOfSpeech: "adverb",
          meaning: "now",
          note: null,
        },
      }),
    ]);
    expect(draft.enrichment).toMatchObject({
      literalTranslation: "I will go now",
      proficiencyLevel: { framework: "topik", level: "2" },
      korean: {
        speechLevel: "polite",
        registerLabel: "해요체",
        romanizationSystem: "revised_romanization",
        note: null,
      },
      registerVariants: [
        expect.objectContaining({
          text: "나 지금 가.",
          romanization: "na jigeum ga",
          register: "casual",
        }),
      ],
      examples: [
        expect.objectContaining({
          text: "저는 지금 갑니다.",
          romanization: "jeoneun jigeum gamnida",
          register: "formal",
        }),
      ],
    });
    expect(draft.enrichment?.cantoneseExamples).toBeUndefined();
    expect(draft.capabilities).toEqual({
      hasReadingSegments: true,
      hasRomanization: true,
      hasRegister: true,
      hasAlternateForm: false,
      hasUsage: false,
      canRegenerateWithCloud: false,
    });

    const fallbackDraft = normalizeTranslationDraft(
      {
        targetLanguage: "ko",
        sourceLanguage: "en",
        sourceText: "hello",
        targetText: "안녕하세요",
        readingSystem: "pinyin",
        translationText: "hello",
      },
      {
        source: "cloud",
        canRegenerateWithCloud: false,
      }
    );
    expect(fallbackDraft.readingSystem).toBe("hangul");
  });

  it("covers existing sanitizer behavior for reading validation and fallback tokens", () => {
    expect(validateReadingSegments([{ text: "会計", reading: "かいけい" }])).toBe(
      true
    );
    expect(validateReadingSegments([{ text: "", reading: null }])).toBe(false);

    expect(
      buildFallbackStudyTokens({
        targetText: "歓迎します。",
        readingSegments: [],
        targetLanguage: "ja",
      })
    ).toEqual([
      {
        id: "0:6:歓迎します。",
        surface: "歓迎します。",
        start: 0,
        end: 6,
        reading: null,
        audioText: "歓迎します。",
        kind: "phrase",
        note: null,
      },
    ]);
  });
});
