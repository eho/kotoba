import { describe, expect, it } from "bun:test";
import * as core from "../src";
import type {
  JapaneseFormTable,
  JapaneseFormTableRow,
  StudyTokenMetadata,
} from "../src";

const expectedRuntimeExports = [
  "CATEGORY_LABELS",
  "CATEGORY_MENU_LABELS",
  "CATEGORY_VALUES",
  "CHINESE_VARIANT_PROFILES",
  "CURRENT_ENRICHMENT_PROMPT_VERSION",
  "CURRENT_TRANSLATION_SCHEMA_VERSION",
  "alignReadingSegmentsToTargetText",
  "allTTSLocales",
  "buildFallbackStudyTokens",
  "buildPhraseFragmentKey",
  "chineseProfile",
  "createTTSCacheKey",
  "createTranslationCacheKey",
  "deriveChineseVariantFromLegacy",
  "detectDirection",
  "extractPhrasePlayableFragments",
  "getChineseReadingSystemLabel",
  "getLanguageProfile",
  "getPhraseFragmentUsageContrastNotes",
  "getTranslationCacheStaleReason",
  "generateJapaneseFormTable",
  "hasStudyTokenNoteContent",
  "inferTranslationCompleteness",
  "isCategory",
  "isChineseLearningVariant",
  "isChineseReadingSystem",
  "isKoreanReadingSystem",
  "isReadingSystem",
  "isDraftFreshForSavedPhraseReplacement",
  "isPositiveIntegerVersion",
  "isSavedPhraseStaleForTranslationUpdate",
  "japaneseProfile",
  "koreanProfile",
  "normalizeCacheText",
  "normalizeChineseReadingMetadata",
  "normalizePhraseCategories",
  "normalizePhraseFragmentCacheText",
  "normalizeReadingSupport",
  "normalizeTranslationDraft",
  "primaryCategory",
  "promoteGrammarNotesToStudyTokens",
  "resolveActiveLanguageContext",
  "resolveChineseDisplayText",
  "resolveChineseReadingSystemMetadata",
  "resolveChineseVariantProfile",
  "resolveLanguageProfile",
  "resolveLibraryScope",
  "resolveSTTLocale",
  "resolveTTSLocale",
  "resolveTranslationVersionRequirement",
  "sanitizeEnrichmentData",
  "sanitizeStudyTokens",
  "stripPhraseFragmentTTSAnnotation",
  "togglePhraseCategory",
  "validateReadingSegments",
];

describe("public API", () => {
  it("exposes a deliberate named runtime surface", () => {
    expect(Object.keys(core).sort()).toEqual(expectedRuntimeExports.sort());
  });

  it("keeps the package entrypoint free of wildcard exports", async () => {
    const indexSource = await Bun.file(
      new URL("../src/index.ts", import.meta.url)
    ).text();

    expect(indexSource).not.toContain("export *");
    expect(indexSource).toContain("Public learning data contracts");
    expect(indexSource).toContain("Public cache-key and translation-version helpers");
  });

  it("keeps the public-friendly language resolver compatible with the existing helper", () => {
    expect(core.resolveLanguageProfile("ja")).toBe(core.getLanguageProfile("ja"));
    expect(core.resolveLanguageProfile("zh")).toBe(core.getLanguageProfile("zh"));
  });

  it("requires enrichment prompt version 5 for fresh cached translations", () => {
    expect(core.CURRENT_ENRICHMENT_PROMPT_VERSION).toBe(5);
    expect(
      core.getTranslationCacheStaleReason(
        {
          translationSchemaVersion: core.CURRENT_TRANSLATION_SCHEMA_VERSION,
          enrichmentPromptVersion: 4,
        },
        core.resolveTranslationVersionRequirement()
      )
    ).toBe("enrichment_prompt_version");
  });

  it("exports Japanese morphology metadata and form-table contracts", () => {
    const metadata = {
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: "高かった",
      lemma: "高い",
      adjectiveClass: "i",
      observedForm: "past",
      confidence: "high",
    } satisfies StudyTokenMetadata;

    const table = core.generateJapaneseFormTable(metadata) satisfies JapaneseFormTable | null;
    const rows = table?.rows satisfies JapaneseFormTableRow[] | undefined;

    expect(rows?.find((row) => row.label === "Past")).toEqual({
      label: "Past",
      value: "高かった",
      observed: true,
      note: "Seen here",
    });
  });

  it("keeps Japanese and Chinese profile behavior equivalent while adding capabilities", () => {
    expect(core.resolveLanguageProfile("ja")).toMatchObject({
      language: "ja",
      defaultScript: "jpan",
      supportedScripts: ["jpan"],
      readingSystems: ["furigana", "romaji"],
      defaultReadingSystem: "furigana",
      supportsReadingSegments: true,
      supportsRomanization: true,
      supportsRegister: true,
      supportsVariants: false,
      defaultTTSLocale: "ja-JP",
      ttsLocale: "ja-JP",
      sttLocales: ["ja-JP"],
    });
    expect(core.resolveLanguageProfile("zh")).toMatchObject({
      language: "zh",
      defaultScript: "zh-Hans",
      supportedScripts: ["zh-Hans", "zh-Hant"],
      readingSystems: ["pinyin", "jyutping"],
      defaultReadingSystem: "pinyin",
      supportsReadingSegments: true,
      supportsRomanization: true,
      supportsRegister: false,
      supportsVariants: true,
      defaultTTSLocale: "zh-CN",
      ttsLocale: "zh-CN",
      sttLocales: ["zh-CN", "zh-TW"],
    });
    expect(core.resolveTTSLocale("zh", "zh-Hant")).toBe("zh-TW");
    expect(core.resolveTTSLocale("zh", undefined, "cantonese-traditional")).toBe("zh-HK");
    expect(core.allTTSLocales("zh")).toEqual(["zh-CN", "zh-TW"]);
  });

  it("resolves Korean capability metadata as the future-language proof fixture", () => {
    expect(core.resolveLanguageProfile("ko")).toMatchObject({
      language: "ko",
      defaultScript: "hang",
      supportedScripts: ["hang"],
      readingSystems: ["hangul", "revised_romanization"],
      defaultReadingSystem: "hangul",
      supportsReadingSegments: true,
      supportsRomanization: true,
      supportsRegister: true,
      supportsVariants: false,
      defaultTTSLocale: "ko-KR",
      ttsLocale: "ko-KR",
      sttLocales: ["ko-KR"],
    });
    expect(core.resolveTTSLocale("ko")).toBe("ko-KR");
    expect(core.resolveSTTLocale("ko")).toBe("ko-KR");
    expect(core.detectDirection("안녕하세요", "ko")).toBe("target_to_en");
  });
});
