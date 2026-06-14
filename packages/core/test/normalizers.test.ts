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

  it("realigns study token spans when provider offsets are byte-like but surfaces are correct", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "駅",
          start: 0,
          end: 3,
          reading: "えき",
          audioText: "eki",
          kind: "word",
          note: { partOfSpeech: "noun" },
        },
        {
          surface: "まで",
          start: 3,
          end: 6,
          reading: null,
          audioText: "made",
          kind: "grammar",
          note: { partOfSpeech: "particle" },
        },
        {
          surface: "歩きます",
          start: 6,
          end: 12,
          reading: "あるきます",
          audioText: "arukimasu",
          kind: "word",
          note: { partOfSpeech: "verb" },
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
      "駅まで歩きます。"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens).toEqual([
      expect.objectContaining({ surface: "駅", start: 0, end: 1 }),
      expect.objectContaining({ surface: "まで", start: 1, end: 3 }),
      expect.objectContaining({
        surface: "歩きます",
        start: 3,
        end: 7,
        metadata: expect.objectContaining({
          lemma: "歩く",
          verbClass: "godan-ku",
          observedForm: "polite",
        }),
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

  it("repairs split polite verb past metadata onto the observed surface", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "食べ",
          start: 0,
          end: 2,
          reading: "たべ",
          audioText: "tabe",
          kind: "word",
          note: {
            partOfSpeech: "verb stem",
            meaning: "eat",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "verb",
            surface: "食べ",
            lemma: "食べる",
            verbClass: "ichidan",
            observedForm: null,
            confidence: "high",
          },
        },
        {
          surface: "まし",
          start: 2,
          end: 4,
          reading: "まし",
          audioText: "mashi",
          kind: "grammar",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
        {
          surface: "た",
          start: 4,
          end: 5,
          reading: "た",
          audioText: "ta",
          kind: "grammar",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
      ],
      "食べました"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "食べ",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "verb",
        surface: "食べ",
        observedSurface: "食べました",
        lemma: "食べる",
        verbClass: "ichidan",
        observedForm: "polite-past",
        confidence: "high",
      },
    });
    expect(result.studyTokens[1]).toMatchObject({
      surface: "まし",
      kind: "grammar",
    });
    expect(result.studyTokens[1]).not.toHaveProperty("metadata");
  });

  it("repairs split polite verb past-negative metadata across multiple auxiliary tokens", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "飲み",
          start: 0,
          end: 2,
          reading: "のみ",
          audioText: "nomi",
          kind: "word",
          note: {
            partOfSpeech: "verb stem",
            meaning: "drink",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "verb",
            surface: "飲み",
            lemma: "飲む",
            verbClass: "godan-mu",
            observedForm: null,
            confidence: "high",
          },
        },
        {
          surface: "ませ",
          start: 2,
          end: 4,
          reading: "ませ",
          audioText: "mase",
          kind: "grammar",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
        {
          surface: "んで",
          start: 4,
          end: 6,
          reading: "んで",
          audioText: "nde",
          kind: "grammar",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
        {
          surface: "した",
          start: 6,
          end: 8,
          reading: "した",
          audioText: "shita",
          kind: "word",
          note: {
            partOfSpeech: "verb",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "verb",
            surface: "した",
            lemma: "する",
            verbClass: "suru",
            observedForm: "past",
            confidence: "high",
          },
        },
      ],
      "飲みませんでした"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "飲み",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "verb",
        surface: "飲み",
        observedSurface: "飲みませんでした",
        lemma: "飲む",
        verbClass: "godan-mu",
        observedForm: "polite-past-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[3]).toMatchObject({
      surface: "した",
      kind: "grammar",
    });
    expect(result.studyTokens[3]).not.toHaveProperty("metadata");
  });

  it("repairs split polite verb metadata when auxiliary study tokens are missing", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "飲み",
          start: 0,
          end: 2,
          reading: "のみ",
          audioText: "nomi",
          kind: "word",
          note: {
            partOfSpeech: "verb stem",
            meaning: "drink",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "verb",
            surface: "飲み",
            lemma: "飲む",
            verbClass: "godan-mu",
            observedForm: null,
            confidence: "high",
          },
        },
      ],
      "飲みませんでした"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "飲み",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "verb",
        surface: "飲み",
        observedSurface: "飲みませんでした",
        lemma: "飲む",
        verbClass: "godan-mu",
        observedForm: "polite-past-negative",
        confidence: "high",
      },
    });
  });

  it("preserves full adjective metadata when the part of speech mentions a copula", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "静かでした",
          start: 0,
          end: 5,
          reading: "しずかでした",
          audioText: "shizuka deshita",
          kind: "word",
          note: {
            partOfSpeech: "na-adjective + copula",
            meaning: "was quiet",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "静かでした",
            lemma: "静か",
            adjectiveClass: "na",
            observedForm: "polite-past",
            confidence: "high",
          },
        },
      ],
      "静かでした"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "静かでした",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "静かでした",
        lemma: "静か",
        adjectiveClass: "na",
        observedForm: "polite-past",
        confidence: "high",
      },
    });
  });

  it("repairs split na-adjective copula metadata onto the observed surface", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "静か",
          start: 0,
          end: 2,
          reading: "しずか",
          audioText: "shizuka",
          kind: "word",
          note: {
            partOfSpeech: "na-adjective",
            meaning: "quiet",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "静か",
            lemma: "静か",
            adjectiveClass: "na",
            observedForm: "plain",
            confidence: "high",
          },
        },
        {
          surface: "でした",
          start: 2,
          end: 5,
          reading: "でした",
          audioText: "deshita",
          kind: "grammar",
          note: {
            partOfSpeech: "copula",
            meaning: "was",
          },
        },
      ],
      "静かでした"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "静か",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "静か",
        observedSurface: "静かでした",
        lemma: "静か",
        adjectiveClass: "na",
        observedForm: "polite-past",
        confidence: "high",
      },
    });
    expect(result.studyTokens[1]).not.toHaveProperty("metadata");
  });

  it("repairs split i-adjective negative metadata and suppresses auxiliary metadata", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "高く",
          start: 0,
          end: 2,
          reading: "たかく",
          audioText: "takaku",
          kind: "word",
          note: {
            partOfSpeech: "i-adjective",
            meaning: "expensive",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "高く",
            lemma: "高い",
            adjectiveClass: "i",
            observedForm: "adverbial",
            confidence: "high",
          },
        },
        {
          surface: "ない",
          start: 2,
          end: 4,
          reading: "ない",
          audioText: "nai",
          kind: "word",
          note: {
            partOfSpeech: "i-adjective",
            meaning: "not",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "ない",
            lemma: "ない",
            adjectiveClass: "i",
            observedForm: "plain",
            confidence: "high",
          },
        },
        {
          surface: "です",
          start: 4,
          end: 6,
          reading: "です",
          audioText: "desu",
          kind: "grammar",
          note: {
            partOfSpeech: "copula",
          },
        },
      ],
      "高くないです"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "高く",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "高く",
        observedSurface: "高くないです",
        lemma: "高い",
        adjectiveClass: "i",
        observedForm: "polite-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[1]).toMatchObject({
      surface: "ない",
      kind: "grammar",
    });
    expect(result.studyTokens[1]).not.toHaveProperty("metadata");
  });

  it("infers split na-adjective past-negative metadata from a na-adjective note", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "静か",
          start: 0,
          end: 2,
          reading: "しずか",
          audioText: "shizuka",
          kind: "word",
          note: {
            partOfSpeech: "na-adjective",
            meaning: "quiet",
          },
        },
        {
          surface: "では",
          start: 2,
          end: 4,
          reading: "では",
          audioText: "dewa",
          kind: "grammar",
          note: {
            partOfSpeech: "particle",
          },
        },
        {
          surface: "なかった",
          start: 4,
          end: 8,
          reading: "なかった",
          audioText: "nakatta",
          kind: "word",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
      ],
      "静かではなかった"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "静か",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "静か",
        observedSurface: "静かではなかった",
        lemma: "静か",
        adjectiveClass: "na",
        observedForm: "past-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[2]).toMatchObject({
      surface: "なかった",
      kind: "grammar",
    });
    expect(result.studyTokens[2]).not.toHaveProperty("metadata");
  });

  it("repairs split i-adjective contrastive past-negative metadata without changing the owning token surface", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "高く",
          start: 0,
          end: 2,
          reading: "たかく",
          audioText: "takaku",
          kind: "word",
          note: {
            partOfSpeech: "i-adjective",
            meaning: "expensive",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "高く",
            lemma: "高い",
            adjectiveClass: "i",
            observedForm: "adverbial",
            confidence: "high",
          },
        },
        {
          surface: "は",
          start: 2,
          end: 3,
          reading: "は",
          audioText: "wa",
          kind: "grammar",
          note: {
            partOfSpeech: "particle",
          },
        },
        {
          surface: "なかった",
          start: 3,
          end: 7,
          reading: "なかった",
          audioText: "nakatta",
          kind: "word",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
      ],
      "高くはなかった"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "高く",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "高く",
        observedSurface: "高くはなかった",
        lemma: "高い",
        adjectiveClass: "i",
        observedForm: "past-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[2]).toMatchObject({
      surface: "なかった",
      kind: "grammar",
    });
    expect(result.studyTokens[2]).not.toHaveProperty("metadata");
  });

  it("repairs split i-adjective contrastive metadata when the particle is omitted from study tokens", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "高く",
          start: 0,
          end: 2,
          reading: "たかく",
          audioText: "takaku",
          kind: "word",
          note: {
            partOfSpeech: "i-adjective",
            meaning: "expensive",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "高く",
            lemma: "高い",
            adjectiveClass: "i",
            observedForm: "adverbial",
            confidence: "high",
          },
        },
        {
          surface: "なかった",
          start: 3,
          end: 7,
          reading: "なかった",
          audioText: "nakatta",
          kind: "word",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
      ],
      "高くはなかった"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "高く",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "高く",
        observedSurface: "高くはなかった",
        lemma: "高い",
        adjectiveClass: "i",
        observedForm: "past-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[1]).toMatchObject({
      surface: "なかった",
      kind: "grammar",
    });
  });

  it("repairs split na-adjective polite past-negative metadata when では is tokenized as で plus は", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "静か",
          start: 0,
          end: 2,
          reading: "しずか",
          audioText: "shizuka",
          kind: "word",
          note: {
            partOfSpeech: "na-adjective",
            meaning: "quiet",
          },
        },
        {
          surface: "で",
          start: 2,
          end: 3,
          reading: "で",
          audioText: "de",
          kind: "grammar",
          note: {
            partOfSpeech: "copula",
          },
        },
        {
          surface: "は",
          start: 3,
          end: 4,
          reading: "は",
          audioText: "wa",
          kind: "grammar",
          note: {
            partOfSpeech: "particle",
          },
        },
        {
          surface: "ありません",
          start: 4,
          end: 9,
          reading: "ありません",
          audioText: "arimasen",
          kind: "grammar",
          note: {
            partOfSpeech: "auxiliary",
          },
        },
        {
          surface: "でした",
          start: 9,
          end: 12,
          reading: "でした",
          audioText: "deshita",
          kind: "grammar",
          note: {
            partOfSpeech: "copula",
          },
        },
      ],
      "静かではありませんでした"
    );

    expect(result.droppedSections).toEqual([]);
    expect(result.studyTokens[0]).toMatchObject({
      surface: "静か",
      metadata: {
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "静か",
        observedSurface: "静かではありませんでした",
        lemma: "静か",
        adjectiveClass: "na",
        observedForm: "polite-past-negative",
        confidence: "high",
      },
    });
    expect(result.studyTokens[3]).toMatchObject({
      surface: "ありません",
      kind: "grammar",
    });
    expect(result.studyTokens[3]).not.toHaveProperty("metadata");
  });

  it("drops morphology metadata attached to isolated Japanese copula tokens", () => {
    const result = sanitizeStudyTokens(
      [
        {
          surface: "でした",
          start: 2,
          end: 5,
          reading: "でした",
          audioText: "deshita",
          kind: "word",
          note: {
            partOfSpeech: "copula (past polite form of だ/です)",
          },
          metadata: {
            language: "ja",
            category: "morphology",
            kind: "adjective",
            surface: "でした",
            lemma: "です",
            adjectiveClass: "na",
            observedForm: "polite-past",
            confidence: "high",
          },
        },
      ],
      "静かでした"
    );

    expect(result.studyTokens).toEqual([
      expect.objectContaining({
        surface: "でした",
        start: 2,
        end: 5,
      }),
    ]);
    expect(result.studyTokens[0]).not.toHaveProperty("metadata");
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
