import { beforeEach, describe, expect, it, mock } from "bun:test";
import type {
  MetadataConfidence,
  SupportedLearningLanguage,
  TranslationDraft,
} from "@edwinho/kotoba-core";

const translateWithKotobaGemini = mock(async () => ({
  draft: makeDraft({ targetLanguage: "ja" }),
  provider: "gemini" as const,
  model: "test-model",
  warnings: [],
  canonicalTargetTextMismatch: null,
}));

mock.module("@edwinho/kotoba-gemini", () => ({
  DEFAULT_KOTOBA_GEMINI_MODEL: "gemini-2.5-flash-lite",
  translateWithKotobaGemini,
}));

function makeDraft(params: {
  targetLanguage: SupportedLearningLanguage;
}): TranslationDraft<SupportedLearningLanguage> {
  const targetText =
    params.targetLanguage === "ja"
      ? "ありがとう"
      : params.targetLanguage === "zh"
        ? "多謝"
        : "감사합니다";
  const romanization =
    params.targetLanguage === "ja"
      ? "arigatou"
      : params.targetLanguage === "zh"
        ? "do1 ze6"
        : "gamsahamnida";

  return {
    targetLanguage: params.targetLanguage,
    sourceLanguage: "en",
    sourceText: "thanks",
    targetText,
    targetTextVariants:
      params.targetLanguage === "zh"
        ? {
            primary: targetText,
            simplified: "谢谢",
            traditional: "多謝",
          }
        : null,
    chineseVariant:
      params.targetLanguage === "zh" ? "cantonese-traditional" : null,
    readingSystem:
      params.targetLanguage === "zh"
        ? "jyutping"
        : params.targetLanguage === "ko"
          ? "hangul"
          : null,
    readingSegments: [{ text: targetText, reading: romanization }],
    romanization,
    translationText: "Thank you.",
    register: params.targetLanguage === "zh" ? null : "polite",
    alternateForm: params.targetLanguage === "ja" ? "ありがとうございます" : null,
    usage: "A common expression of thanks.",
    enrichment:
      params.targetLanguage === "ja"
        ? {
            literalTranslation: "thanks",
            grammarBreakdown: {
              confidence: "high",
              tokens: [
                {
                  token: "ありがとう",
                  partOfSpeech: "phrase",
                  meaning: "thank you",
                },
              ],
            },
            naturalness: "common",
            bestUsedWhen: "Thanking someone directly.",
            avoidWhen: "Too casual for a formal apology.",
            confusableAlternatives: ["おはよう"],
            keywordTags: ["gratitude", "daily"],
            proficiencyLevel: { framework: "jlpt", level: "N5" },
            registerVariants: [
              {
                text: "ありがとうございます",
                role: "polite",
                register: "polite",
                reading: "arigatou gozaimasu",
                translationText: "Thank you.",
                usageNote: "Safer with people you do not know well.",
              },
            ],
            usageContrasts: [
              {
                text: "すみません",
                kind: "meaning",
                label: "Thanks vs apology",
                meaning: "sorry or excuse me",
                whenToUse: "Use when apologizing or getting attention.",
                avoidWhen: "Avoid when you only want simple thanks.",
                contrastNote: "Can imply apology more than gratitude.",
              },
            ],
            examples: [
              {
                text: "今日はありがとう。",
                reading: "kyou wa arigatou",
                translationText: "Thanks for today.",
                register: "casual",
                note: "Adds a time reference.",
              },
            ],
          }
        : params.targetLanguage === "zh"
          ? {
              literalTranslation: "many thanks",
              naturalness: "common",
              bestUsedWhen: "Casual Cantonese thanks.",
              cantoneseExamples: {
                colloquial: "多謝你。",
                formalWritten: "謝謝你。",
              },
            }
          : {
              literalTranslation: "thank you",
              naturalness: "common",
              korean: {
                speechLevel: "polite",
                registerLabel: "polite speech",
                romanizationSystem: "revised_romanization",
                note: "Use with strangers or in ordinary service settings.",
              },
            },
    studyTokens: [
      {
        id: `0:${targetText.length}:${targetText}`,
        surface: targetText,
        start: 0,
        end: targetText.length,
        reading: romanization,
        audioText: targetText,
        kind: "phrase",
        note: {
          meaning: "thank you",
        },
      },
    ],
    source: "cloud",
    completeness: "enriched",
    capabilities: {
      hasReadingSegments: true,
      hasRomanization: true,
      hasRegister: params.targetLanguage !== "zh",
      hasAlternateForm: false,
      hasUsage: true,
      canRegenerateWithCloud: true,
    },
  };
}

function makeJapaneseFormDraft(
  confidence: MetadataConfidence | null = "high"
): TranslationDraft<SupportedLearningLanguage> {
  return {
    ...makeDraft({ targetLanguage: "ja" }),
    sourceText: "I drank tea",
    targetText: "お茶を飲んだ",
    readingSegments: [
      { text: "お茶", reading: "ocha" },
      { text: "を", reading: "o" },
      { text: "飲んだ", reading: "nonda" },
    ],
    romanization: "ocha o nonda",
    translationText: "I drank tea.",
    studyTokens: [
      {
        id: "3:6:飲んだ",
        surface: "飲んだ",
        start: 3,
        end: 6,
        reading: "nonda",
        audioText: "飲んだ",
        kind: "word",
        note: {
          partOfSpeech: "verb",
          meaning: "drank",
          note: "Past form of 飲む.",
        },
        ...(confidence == null
          ? {}
          : {
              metadata: {
                language: "ja",
                category: "morphology",
                kind: "verb",
                surface: "飲んだ",
                lemma: "飲む",
                verbClass: "godan-mu",
                observedForm: "past",
                confidence,
              },
            }),
      },
    ],
  };
}

function createIo(options: {
  env?: Record<string, string | undefined>;
  stdin?: string;
} = {}) {
  const stdout: string[] = [];
  const stderr: string[] = [];
  return {
    io: {
      env: options.env ?? { GEMINI_API_KEY: "test-key" },
      stdinText: async () => options.stdin ?? "",
      stdout: {
        write: (value: string) => stdout.push(value),
      },
      stderr: {
        write: (value: string) => stderr.push(value),
      },
    },
    stdout,
    stderr,
  };
}

describe("kotoba translate", () => {
  beforeEach(() => {
    translateWithKotobaGemini.mockReset();
    translateWithKotobaGemini.mockResolvedValue({
      draft: makeDraft({ targetLanguage: "ja" }),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
  });

  it("prints valid JSON with a normalized draft for argv text", async () => {
    const { runKotobaCli } = await import("../index");
    const { io, stdout, stderr } = createIo();

    const result = await runKotobaCli(
      ["translate", "thanks", "--to", "ja", "--format", "json"],
      io
    );

    expect(result.exitCode).toBe(0);
    expect(stderr.join("")).toBe("");
    const parsed = JSON.parse(stdout.join(""));
    expect(parsed).toMatchObject({
      targetLanguage: "ja",
      sourceLanguage: "en",
      sourceText: "thanks",
      targetText: "ありがとう",
      source: "cloud",
      completeness: "enriched",
    });
    expect(translateWithKotobaGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        inputText: "thanks",
        learningLanguage: "ja",
        inputMode: "en_to_target",
      }),
      expect.objectContaining({
        apiKey: "test-key",
        model: "gemini-2.5-flash-lite",
      })
    );
  });

  it("reads stdin and passes the resolved Chinese variant to Gemini", async () => {
    translateWithKotobaGemini.mockResolvedValueOnce({
      draft: makeDraft({ targetLanguage: "zh" }),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");
    const { io } = createIo({ stdin: "thanks" });

    const result = await runKotobaCli(
      ["translate", "--to", "zh", "--variant", "cantonese-traditional"],
      io
    );

    expect(result.exitCode).toBe(0);
    expect(translateWithKotobaGemini).toHaveBeenCalledWith(
      expect.objectContaining({
        inputText: "thanks",
        learningLanguage: "zh",
        chineseVariant: "cantonese-traditional",
        chineseDisplayScript: "zh-Hant",
      }),
      expect.any(Object)
    );
  });

  it("prints valid JSON with a Korean normalized draft", async () => {
    translateWithKotobaGemini.mockResolvedValueOnce({
      draft: makeDraft({ targetLanguage: "ko" }),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");
    const { io, stdout } = createIo();

    const result = await runKotobaCli(
      ["translate", "thank you", "--to", "ko", "--format", "json"],
      io
    );

    expect(result.exitCode).toBe(0);
    expect(JSON.parse(stdout.join(""))).toMatchObject({
      targetLanguage: "ko",
      targetText: "감사합니다",
      readingSystem: "hangul",
      completeness: "enriched",
    });
  });

  it("preserves study-token metadata in JSON without pre-rendered form tables", async () => {
    const draft = makeJapaneseFormDraft();
    translateWithKotobaGemini.mockResolvedValue({
      draft,
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");

    for (const args of [
      ["translate", "I drank tea", "--to", "ja", "--format", "json"],
      ["translate", "I drank tea", "--to", "ja", "--format", "json", "--forms"],
    ]) {
      const { io, stdout, stderr } = createIo();
      const result = await runKotobaCli(args, io);
      const parsed = JSON.parse(stdout.join(""));

      expect(result.exitCode).toBe(0);
      expect(stderr.join("")).toBe("");
      expect(parsed.studyTokens[0].metadata).toEqual(
        draft.studyTokens[0].metadata
      );
      expect(parsed.studyTokens[0]).not.toHaveProperty("forms");
      expect(JSON.stringify(parsed)).not.toContain('"rows"');
    }
  });

  it("renders generated Japanese form tables in pretty output when --forms is passed", async () => {
    translateWithKotobaGemini.mockResolvedValueOnce({
      draft: makeJapaneseFormDraft(),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");
    const { io, stdout, stderr } = createIo({
      env: { GEMINI_API_KEY: "test-key", NO_COLOR: "1" },
    });

    const result = await runKotobaCli(
      ["translate", "I drank tea", "--to", "ja", "--format", "pretty", "--forms"],
      io
    );
    const output = stdout.join("");

    expect(result.exitCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(output).toContain("Forms - Godan verb: 飲む");
    expect(output).toContain("Dictionary     飲む");
    expect(output).toContain("Past           飲んだ (Seen here)");
    expect(output).toContain("Potential      飲める");
  });

  it("renders generated Japanese form tables in markdown output when --forms is passed", async () => {
    translateWithKotobaGemini.mockResolvedValueOnce({
      draft: makeJapaneseFormDraft(),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");
    const { io, stdout, stderr } = createIo();

    const result = await runKotobaCli(
      ["translate", "I drank tea", "--to", "ja", "--format", "markdown", "--forms"],
      io
    );
    const output = stdout.join("");

    expect(result.exitCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(output).toContain("### 飲んだ forms");
    expect(output).toContain("Godan verb: 飲む");
    expect(output).toContain("| Form | Value | Note |");
    expect(output).toContain("| Past | 飲んだ | Seen here |");
  });

  it("omits generated form tables when --forms is omitted", async () => {
    translateWithKotobaGemini.mockResolvedValueOnce({
      draft: makeJapaneseFormDraft(),
      provider: "gemini",
      model: "test-model",
      warnings: [],
      canonicalTargetTextMismatch: null,
    });
    const { runKotobaCli } = await import("../index");
    const { io, stdout, stderr } = createIo({
      env: { GEMINI_API_KEY: "test-key", NO_COLOR: "1" },
    });

    const result = await runKotobaCli(
      ["translate", "I drank tea", "--to", "ja", "--format", "pretty"],
      io
    );
    const output = stdout.join("");

    expect(result.exitCode).toBe(0);
    expect(stderr.join("")).toBe("");
    expect(output).toContain("飲んだ");
    expect(output).not.toContain("Forms -");
    expect(output).not.toContain("Potential");
  });

  it("omits form sections without error when metadata is missing or below threshold", async () => {
    const { runKotobaCli } = await import("../index");

    for (const confidence of [null, "medium"] as const) {
      translateWithKotobaGemini.mockResolvedValueOnce({
        draft: makeJapaneseFormDraft(confidence),
        provider: "gemini",
        model: "test-model",
        warnings: [],
        canonicalTargetTextMismatch: null,
      });
      const { io, stdout, stderr } = createIo({
        env: { GEMINI_API_KEY: "test-key", NO_COLOR: "1" },
      });

      const result = await runKotobaCli(
        ["translate", "I drank tea", "--to", "ja", "--format", "pretty", "--forms"],
        io
      );

      expect(result.exitCode).toBe(0);
      expect(stderr.join("")).toBe("");
      expect(stdout.join("")).not.toContain("Forms -");
    }
  });

  it("matches the package manifest contract and executable shebang", async () => {
    const manifest = await Bun.file("package.json").json();
    const indexSource = await Bun.file("src/index.ts").text();

    expect(manifest).toMatchObject({
      name: "@edwinho/kotoba-cli",
      publishConfig: { access: "public" },
      main: "dist/index.js",
      types: "dist/index.d.ts",
      bin: {
        kotoba: "dist/index.js",
      },
      exports: {
        ".": {
          types: "./dist/index.d.ts",
          default: "./dist/index.js",
        },
      },
      scripts: {
        build:
          "bun ../../scripts/clean-package-dist.ts . && bun build src/index.ts --outdir dist --target bun --format esm --external @edwinho/kotoba-core --external @edwinho/kotoba-gemini && tsc -p tsconfig.build.json",
        typecheck: "tsc --noEmit",
        test: "bun test",
      },
      dependencies: {
        "@edwinho/kotoba-core": "^0.2.0",
        "@edwinho/kotoba-gemini": "^0.3.0",
      },
    });
    expect(indexSource.split("\n")[0]).toBe("#!/usr/bin/env bun");
  });

  it("rejects target-language input when --from en is forced", async () => {
    const { runKotobaCli } = await import("../index");
    const { io, stderr } = createIo();

    const result = await runKotobaCli(
      ["translate", "ありがとう", "--to", "ja", "--from", "en"],
      io
    );

    expect(result.exitCode).toBe(1);
    expect(stderr.join("")).toContain("already be ja text");
    expect(translateWithKotobaGemini).not.toHaveBeenCalled();
  });

  it("rejects ambiguous unsupported non-English input with --from auto", async () => {
    const { runKotobaCli } = await import("../index");
    const { io, stderr } = createIo();

    const result = await runKotobaCli(
      ["translate", "спасибо", "--to", "ja"],
      io
    );

    expect(result.exitCode).toBe(1);
    expect(stderr.join("")).toContain("not confidently English");
    expect(translateWithKotobaGemini).not.toHaveBeenCalled();
  });

  it("returns setup guidance without secrets when the API key is missing", async () => {
    const { runKotobaCli } = await import("../index");
    const { io, stderr } = createIo({ env: {} });

    const result = await runKotobaCli(["translate", "thanks", "--to", "ja"], io);

    expect(result.exitCode).toBe(1);
    expect(stderr.join("")).toContain("Set GEMINI_API_KEY");
    expect(stderr.join("")).not.toContain("test-key");
    expect(translateWithKotobaGemini).not.toHaveBeenCalled();
  });

  it("returns exit code 2 for provider failures", async () => {
    translateWithKotobaGemini.mockRejectedValueOnce(new Error("fetch failed"));
    const { runKotobaCli } = await import("../index");
    const { io, stderr } = createIo();

    const result = await runKotobaCli(["translate", "thanks", "--to", "ja"], io);

    expect(result.exitCode).toBe(2);
    expect(stderr.join("")).toContain("Gemini provider failed");
  });

  it("returns exit code 3 for provider validation failures", async () => {
    translateWithKotobaGemini.mockRejectedValueOnce(
      new Error("Provider payload missing required fields")
    );
    const { runKotobaCli } = await import("../index");
    const { io, stderr } = createIo();

    const result = await runKotobaCli(["translate", "thanks", "--to", "ja"], io);

    expect(result.exitCode).toBe(3);
    expect(stderr.join("")).toContain("Provider response validation failed");
  });

  it("renders JSON, Markdown, and pretty output from the same sample draft", async () => {
    const { formatJson } = await import("../formatters/json");
    const { formatMarkdown } = await import("../formatters/markdown");
    const { formatPretty } = await import("../formatters/pretty");
    const draft = makeDraft({ targetLanguage: "ja" });

    const json = formatJson(draft);
    const markdown = formatMarkdown(draft);
    const pretty = formatPretty(draft, { color: false });
    const koreanPretty = formatPretty(makeDraft({ targetLanguage: "ko" }), {
      color: false,
    });

    expect(JSON.parse(json)).toMatchObject({ targetText: "ありがとう" });
    expect(markdown).toContain("ありがとう");
    expect(pretty).toContain("ありがとう");
    expect(markdown).toContain("Thank you.");
    expect(pretty).toContain("Thank you.");
    expect(markdown).toContain("## Learning notes");
    expect(markdown).toContain("**Literal:** thanks");
    expect(markdown).toContain("## Variants");
    expect(markdown).toContain("ありがとうございます");
    expect(markdown).toContain("## Contrasts");
    expect(markdown).toContain("Thanks vs apology");
    expect(markdown).toContain("## Examples");
    expect(markdown).toContain("今日はありがとう。");
    expect(markdown).toContain("## Don't mix");
    expect(markdown).toContain("おはよう");
    expect(pretty).toContain("Learning notes:");
    expect(pretty).toContain("Literal: thanks");
    expect(pretty).toContain("Variants:");
    expect(pretty).toContain("ありがとうございます");
    expect(pretty).toContain("Contrasts:");
    expect(pretty).toContain("Examples:");
    expect(pretty).toContain("Don't mix:");
    expect(koreanPretty).toContain("polite speech / polite");
    expect(koreanPretty).toContain("Korean note:");
  });

  it("omits ANSI color codes in pretty output when NO_COLOR is set", async () => {
    const { runKotobaCli } = await import("../index");
    const { io, stdout } = createIo({ env: { GEMINI_API_KEY: "test-key", NO_COLOR: "1" } });

    const result = await runKotobaCli(
      ["translate", "thanks", "--to", "ja", "--format", "pretty"],
      io
    );

    expect(result.exitCode).toBe(0);
    expect(stdout.join("")).not.toMatch(/\u001b\[[0-9;]*m/);
  });

  it("returns exit code 0 and prints general help when help flags are used globally", async () => {
    const { runKotobaCli } = await import("../index");
    
    for (const args of [[], ["help"], ["--help"], ["-h"]]) {
      const { io, stdout, stderr } = createIo();
      const result = await runKotobaCli(args, io);
      expect(result.exitCode).toBe(0);
      expect(stderr.join("")).toBe("");
      expect(stdout.join("")).toContain("Kotoba command-line translator");
      expect(stdout.join("")).toContain("details on the translate command");
    }
  });

  it("returns exit code 0 and prints translate command help when help flags are used with translate", async () => {
    const { runKotobaCli } = await import("../index");

    for (const args of [["translate", "--help"], ["translate", "-h"]]) {
      const { io, stdout, stderr } = createIo();
      const result = await runKotobaCli(args, io);
      expect(result.exitCode).toBe(0);
      expect(stderr.join("")).toBe("");
      expect(stdout.join("")).toContain("Usage:");
      expect(stdout.join("")).toContain("--to <ja|zh|ko>");
      expect(stdout.join("")).toContain("--variant <variant>");
    }
  });
});
