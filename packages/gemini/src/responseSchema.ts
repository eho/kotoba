import { Type } from "@google/genai";

const readingSegmentSchema = {
  type: Type.OBJECT,
  properties: {
    text: { type: Type.STRING },
    reading: { type: Type.STRING, nullable: true },
  },
  required: ["text", "reading"],
} as const;

const japaneseStudyTokenMetadataSchema = {
  type: Type.OBJECT,
  nullable: true,
  properties: {
    language: { type: Type.STRING, enum: ["ja"] },
    category: { type: Type.STRING, enum: ["morphology"] },
    kind: { type: Type.STRING, enum: ["verb", "adjective"] },
    surface: { type: Type.STRING },
    lemma: { type: Type.STRING },
    verbClass: {
      type: Type.STRING,
      enum: [
        "ichidan",
        "godan-u",
        "godan-ku",
        "godan-gu",
        "godan-su",
        "godan-tsu",
        "godan-nu",
        "godan-bu",
        "godan-mu",
        "godan-ru",
        "suru",
        "kuru",
        "irregular",
      ],
      nullable: true,
    },
    adjectiveClass: {
      type: Type.STRING,
      enum: ["i", "na"],
      nullable: true,
    },
    observedForm: {
      type: Type.STRING,
      enum: [
        "dictionary",
        "plain",
        "polite",
        "negative",
        "past",
        "past-negative",
        "te-form",
        "potential",
        "before-noun",
        "adverbial",
        "conditional",
        "unknown",
      ],
      nullable: true,
    },
    confidence: {
      type: Type.STRING,
      enum: ["high", "medium", "low"],
    },
  },
  required: ["language", "category", "kind", "surface", "lemma", "confidence"],
} as const;

export const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    targetLanguage: { type: Type.STRING, enum: ["ja", "zh", "ko"] },
    sourceLanguage: { type: Type.STRING, enum: ["en"] },
    sourceText: { type: Type.STRING },
    targetText: { type: Type.STRING },
    targetTextVariants: {
      type: Type.OBJECT,
      nullable: true,
      properties: {
        primary: { type: Type.STRING },
        simplified: { type: Type.STRING, nullable: true },
        traditional: { type: Type.STRING, nullable: true },
      },
      required: ["primary"],
    },
    chineseVariant: {
      type: Type.STRING,
      enum: [
        "mandarin-simplified",
        "mandarin-traditional-taiwan",
        "cantonese-traditional",
      ],
      nullable: true,
    },
    readingSystem: {
      type: Type.STRING,
      enum: ["pinyin", "jyutping", "hangul", "revised_romanization"],
      nullable: true,
    },
    readingSegments: {
      type: Type.ARRAY,
      items: readingSegmentSchema,
    },
    romanization: { type: Type.STRING, nullable: true },
    translationText: { type: Type.STRING },
    register: {
      type: Type.STRING,
      enum: ["casual", "polite", "formal"],
      nullable: true,
    },
    alternateForm: { type: Type.STRING, nullable: true },
    usage: { type: Type.STRING, nullable: true },
    studyTokens: {
      type: Type.ARRAY,
      nullable: true,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          surface: { type: Type.STRING },
          start: { type: Type.NUMBER },
          end: { type: Type.NUMBER },
          reading: { type: Type.STRING, nullable: true },
          audioText: { type: Type.STRING },
          kind: {
            type: Type.STRING,
            enum: ["word", "grammar", "phrase"],
          },
          note: {
            type: Type.OBJECT,
            nullable: true,
            properties: {
              partOfSpeech: { type: Type.STRING, nullable: true },
              meaning: { type: Type.STRING, nullable: true },
              note: { type: Type.STRING, nullable: true },
            },
          },
          metadata: japaneseStudyTokenMetadataSchema,
        },
        required: [
          "id",
          "surface",
          "start",
          "end",
          "reading",
          "audioText",
          "kind",
          "note",
        ],
      },
    },
    enrichment: {
      type: Type.OBJECT,
      description:
        "Non-null learning enrichment object. Use null values for individual low-confidence subsections instead of returning enrichment itself as null.",
      properties: {
        literalTranslation: { type: Type.STRING, nullable: true },
        grammarBreakdown: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            confidence: {
              type: Type.STRING,
              enum: ["high", "medium", "low"],
            },
            tokens: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  token: { type: Type.STRING },
                  partOfSpeech: { type: Type.STRING },
                  meaning: { type: Type.STRING },
                },
                required: ["token", "partOfSpeech", "meaning"],
              },
            },
          },
          required: ["confidence", "tokens"],
        },
        characterBreakdown: {
          type: Type.ARRAY,
          nullable: true,
          items: {
            type: Type.OBJECT,
            properties: {
              character: { type: Type.STRING },
              meaning: { type: Type.STRING },
              components: {
                type: Type.ARRAY,
                items: { type: Type.STRING },
              },
            },
            required: ["character", "meaning", "components"],
          },
        },
        naturalness: {
          type: Type.STRING,
          enum: ["common", "neutral", "bookish", "rare", "stiff"],
        },
        bestUsedWhen: { type: Type.STRING },
        avoidWhen: { type: Type.STRING, nullable: true },
        confusableAlternatives: {
          type: Type.ARRAY,
          nullable: true,
          items: { type: Type.STRING },
        },
        exampleSentence: { type: Type.STRING, nullable: true },
        keywordTags: {
          type: Type.ARRAY,
          nullable: true,
          items: { type: Type.STRING },
        },
        proficiencyLevel: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            framework: {
              type: Type.STRING,
              enum: ["jlpt", "hsk", "topik"],
            },
            level: { type: Type.STRING },
          },
          required: ["framework", "level"],
        },
        cantoneseExamples: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            colloquial: { type: Type.STRING, nullable: true },
            formalWritten: { type: Type.STRING, nullable: true },
          },
        },
        korean: {
          type: Type.OBJECT,
          nullable: true,
          properties: {
            speechLevel: {
              type: Type.STRING,
              enum: ["plain", "casual", "polite", "formal"],
              nullable: true,
            },
            registerLabel: { type: Type.STRING, nullable: true },
            romanizationSystem: {
              type: Type.STRING,
              enum: ["revised_romanization"],
              nullable: true,
            },
            note: { type: Type.STRING, nullable: true },
          },
        },
        registerVariants: {
          type: Type.ARRAY,
          nullable: true,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              role: {
                type: Type.STRING,
                enum: [
                  "primary",
                  "casual",
                  "polite",
                  "formal",
                  "colloquial",
                  "formal_written",
                  "regional",
                  "nearby",
                ],
              },
              register: {
                type: Type.STRING,
                enum: ["casual", "polite", "formal"],
                nullable: true,
              },
              readingSegments: {
                type: Type.ARRAY,
                nullable: true,
                items: readingSegmentSchema,
              },
              reading: { type: Type.STRING, nullable: true },
              romanization: { type: Type.STRING, nullable: true },
              translationText: { type: Type.STRING, nullable: true },
              usageNote: { type: Type.STRING, nullable: true },
            },
            required: ["text", "role"],
          },
        },
        usageContrasts: {
          type: Type.ARRAY,
          nullable: true,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              kind: {
                type: Type.STRING,
                enum: [
                  "register",
                  "naturalness",
                  "meaning",
                  "grammar",
                  "regional",
                  "script",
                  "cantonese_colloquial_vs_formal",
                ],
              },
              label: { type: Type.STRING, nullable: true },
              register: {
                type: Type.STRING,
                enum: ["casual", "polite", "formal"],
                nullable: true,
              },
              readingSegments: {
                type: Type.ARRAY,
                nullable: true,
                items: readingSegmentSchema,
              },
              reading: { type: Type.STRING, nullable: true },
              romanization: { type: Type.STRING, nullable: true },
              meaning: { type: Type.STRING, nullable: true },
              whenToUse: { type: Type.STRING, nullable: true },
              avoidWhen: { type: Type.STRING, nullable: true },
              contrastNote: { type: Type.STRING },
            },
            required: ["text", "kind", "contrastNote"],
          },
        },
        examples: {
          type: Type.ARRAY,
          nullable: true,
          items: {
            type: Type.OBJECT,
            properties: {
              text: { type: Type.STRING },
              readingSegments: {
                type: Type.ARRAY,
                nullable: true,
                items: readingSegmentSchema,
              },
              reading: { type: Type.STRING, nullable: true },
              romanization: { type: Type.STRING, nullable: true },
              translationText: { type: Type.STRING, nullable: true },
              register: {
                type: Type.STRING,
                enum: ["casual", "polite", "formal"],
                nullable: true,
              },
              note: { type: Type.STRING, nullable: true },
            },
            required: ["text"],
          },
        },
      },
      required: ["naturalness", "bestUsedWhen"],
    },
  },
  required: [
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
  ],
} as const;
