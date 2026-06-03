import {
  detectDirection,
  isChineseLearningVariant,
  resolveChineseVariantProfile,
} from "@edwinho/kotoba-core";
import type {
  ChineseLearningVariant,
  InputMode,
  SourceLanguage,
  SupportedLearningLanguage,
} from "@edwinho/kotoba-core";
import {
  DEFAULT_KOTOBA_GEMINI_MODEL,
  translateWithKotobaGemini,
} from "@edwinho/kotoba-gemini";
import type { TranslateWithKotobaGeminiParams } from "@edwinho/kotoba-gemini";
import { formatJson } from "../formatters/json";
import { formatMarkdown } from "../formatters/markdown";
import { formatPretty } from "../formatters/pretty";

export interface KotobaCliIO {
  env?: Record<string, string | undefined>;
  stdinText?: () => Promise<string>;
  stdout: {
    write(value: string): void;
  };
  stderr: {
    write(value: string): void;
  };
}

export interface RunKotobaCliResult {
  exitCode: 0 | 1 | 2 | 3;
}

type OutputFormat = "json" | "pretty" | "markdown";
type SourceMode = "auto" | SourceLanguage;

interface TranslateOptions {
  textArgs: string[];
  to: SupportedLearningLanguage | null;
  from: SourceMode;
  variant: ChineseLearningVariant | null;
  format: OutputFormat;
  apiKey: string | null;
  model: string | null;
}

const SUPPORTED_TARGETS = new Set(["ja", "zh", "ko"]);
const SUPPORTED_FORMATS = new Set(["json", "pretty", "markdown"]);
const FLAG_NAMES_WITH_VALUES = new Set([
  "--to",
  "--from",
  "--variant",
  "--format",
  "--api-key",
  "--model",
]);

function generalUsage(): string {
  return [
    "Kotoba command-line translator backed by @edwinho/kotoba-core and @edwinho/kotoba-gemini.",
    "",
    "Usage:",
    "  kotoba translate [text] --to <ja|zh|ko> [options]",
    "",
    "Commands:",
    "  translate       Translate and enrich text to a target language.",
    "",
    "Global Options:",
    "  -h, --help      Show this help message.",
    "",
    "Run 'kotoba translate --help' for details on the translate command.",
  ].join("\n");
}

function translateUsage(): string {
  return [
    "Usage:",
    "  kotoba translate [text] --to <ja|zh|ko> [options]",
    "",
    "Options:",
    "  --to <ja|zh|ko>          (Required) Learning language to enrich.",
    "  --from <en|auto>         Source detection mode (default: auto). en rejects target-language input locally.",
    "  --variant <variant>      Chinese learning variant (only supported with --to zh).",
    "                           Supported variants:",
    "                             mandarin-simplified (default)",
    "                             mandarin-traditional-taiwan",
    "                             cantonese-traditional",
    "  --format <format>        Output format (default: pretty).",
    "                           Supported formats: json, pretty, markdown",
    "  --api-key <key>          Gemini API key (overrides GEMINI_API_KEY env).",
    "  --model <model>          Gemini model override (default: gemini-2.5-flash-lite).",
    "  -h, --help               Show this help message.",
    "",
    "Environment Variables:",
    "  GEMINI_API_KEY           Required unless --api-key is supplied.",
    "  KOTOBA_GEMINI_MODEL      Gemini model override.",
    "  NO_COLOR                 Disables ANSI escape codes in pretty output.",
    "",
    "Examples:",
    "  GEMINI_API_KEY=... kotoba translate \"thanks for today\" --to ja",
    "  GEMINI_API_KEY=... kotoba translate \"thank you\" --to ko --format json",
    "  echo \"thanks\" | GEMINI_API_KEY=... kotoba translate --to zh --variant cantonese-traditional --format markdown",
  ].join("\n");
}

function usage(): string {
  return [
    "Usage: kotoba translate [text] --to <ja|zh|ko> [--from en|auto] [--variant <variant>] [--format json|pretty|markdown]",
    "",
    "Set GEMINI_API_KEY in the environment, or pass --api-key for one-off evaluation.",
  ].join("\n");
}

function writeLine(writer: { write(value: string): void }, value: string): void {
  writer.write(`${value}\n`);
}

function parseFlagToken(token: string): { name: string; value: string | null } {
  const equalsIndex = token.indexOf("=");
  if (equalsIndex === -1) {
    return { name: token, value: null };
  }
  return {
    name: token.slice(0, equalsIndex),
    value: token.slice(equalsIndex + 1),
  };
}

function parseTranslateArgs(argv: string[]): TranslateOptions {
  const options: TranslateOptions = {
    textArgs: [],
    to: null,
    from: "auto",
    variant: null,
    format: "pretty",
    apiKey: null,
    model: null,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith("--")) {
      options.textArgs.push(token);
      continue;
    }

    const { name, value: inlineValue } = parseFlagToken(token);
    if (!FLAG_NAMES_WITH_VALUES.has(name)) {
      throw new Error(`Unknown flag "${name}".`);
    }

    const value = inlineValue ?? argv[index + 1];
    if (value == null || value.startsWith("--")) {
      throw new Error(`Flag "${name}" requires a value.`);
    }
    if (inlineValue == null) {
      index += 1;
    }

    switch (name) {
      case "--to":
        if (!SUPPORTED_TARGETS.has(value)) {
          throw new Error(`Unsupported target language "${value}". Use ja, zh, or ko.`);
        }
        options.to = value as SupportedLearningLanguage;
        break;
      case "--from":
        if (value !== "en" && value !== "auto") {
          throw new Error(`Unsupported source mode "${value}". Use en or auto.`);
        }
        options.from = value;
        break;
      case "--variant":
        if (!isChineseLearningVariant(value)) {
          throw new Error(
            `Unsupported Chinese variant "${value}". Use mandarin-simplified, mandarin-traditional-taiwan, or cantonese-traditional.`
          );
        }
        options.variant = value;
        break;
      case "--format":
        if (!SUPPORTED_FORMATS.has(value)) {
          throw new Error(`Unsupported format "${value}". Use json, pretty, or markdown.`);
        }
        options.format = value as OutputFormat;
        break;
      case "--api-key":
        options.apiKey = value;
        break;
      case "--model":
        options.model = value;
        break;
    }
  }

  if (options.to == null) {
    throw new Error("Missing required --to target language.");
  }
  if (options.variant != null && options.to !== "zh") {
    throw new Error("--variant is only supported with --to zh.");
  }

  return options;
}

function hasUnsupportedNonEnglishText(text: string): boolean {
  return /[^\x00-\x7F]/.test(text);
}

function resolveInputMode(params: {
  text: string;
  targetLanguage: SupportedLearningLanguage;
  from: SourceMode;
}): InputMode {
  const detected = detectDirection(params.text, params.targetLanguage);

  if (params.from === "en") {
    if (detected === "target_to_en") {
      throw new Error(
        `Input appears to already be ${params.targetLanguage} text. Remove --from en or provide English source text.`
      );
    }
    return "en_to_target";
  }

  if (detected === "en_to_target" && hasUnsupportedNonEnglishText(params.text)) {
    throw new Error(
      "Input is not confidently English or the selected target language. Use English source text for this CLI release."
    );
  }

  return detected;
}

function classifyProviderError(error: unknown): 2 | 3 {
  if (error instanceof SyntaxError) {
    return 3;
  }

  const message = error instanceof Error ? error.message : String(error);
  if (
    /invalid json|provider payload|validation|missing required fields|targetLanguage does not match|must have null targetTextVariants/i.test(
      message
    )
  ) {
    return 3;
  }

  return 2;
}

function sanitizeErrorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }
  return String(error);
}

async function readInputText(options: TranslateOptions, io: KotobaCliIO): Promise<string> {
  const argvText = options.textArgs.join(" ").trim();
  if (argvText.length > 0) {
    return argvText;
  }

  const stdinText = (await io.stdinText?.())?.trim() ?? "";
  if (stdinText.length === 0) {
    throw new Error(`No input text provided.\n\n${usage()}`);
  }

  return stdinText;
}

function renderOutput(
  format: OutputFormat,
  result: Awaited<ReturnType<typeof translateWithKotobaGemini>>,
  env: Record<string, string | undefined>
): string {
  switch (format) {
    case "json":
      return formatJson(result.draft);
    case "markdown":
      return formatMarkdown(result.draft);
    case "pretty":
      return formatPretty(result.draft, { color: env.NO_COLOR == null });
  }
}

export async function runKotobaCli(
  argv: string[],
  io: KotobaCliIO
): Promise<RunKotobaCliResult> {
  const env = io.env ?? {};
  const [command, ...commandArgs] = argv;

  if (
    command === undefined ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    writeLine(io.stdout, generalUsage());
    return { exitCode: 0 };
  }

  if (command !== "translate") {
    writeLine(io.stderr, `Unknown command "${command}".`);
    writeLine(io.stderr, usage());
    return { exitCode: 1 };
  }

  if (commandArgs.includes("--help") || commandArgs.includes("-h")) {
    writeLine(io.stdout, translateUsage());
    return { exitCode: 0 };
  }

  let options: TranslateOptions;
  let inputText: string;
  let inputMode: InputMode;
  let targetLanguage: SupportedLearningLanguage;

  try {
    options = parseTranslateArgs(commandArgs);
    if (options.to == null) {
      throw new Error("Missing required --to target language.");
    }
    targetLanguage = options.to;
    inputText = await readInputText(options, io);
    inputMode = resolveInputMode({
      text: inputText,
      targetLanguage,
      from: options.from,
    });
  } catch (error) {
    writeLine(io.stderr, sanitizeErrorMessage(error));
    return { exitCode: 1 };
  }

  const apiKey = options.apiKey ?? env.GEMINI_API_KEY ?? "";
  if (apiKey.trim().length === 0) {
    writeLine(
      io.stderr,
      "Gemini API key is required. Set GEMINI_API_KEY, or pass --api-key for one-off evaluation."
    );
    return { exitCode: 1 };
  }

  const params: TranslateWithKotobaGeminiParams = {
    inputText,
    learningLanguage: targetLanguage,
    inputMode,
    sourceLanguage: "en",
    chineseVariant: options.variant,
    chineseDisplayScript:
      options.variant == null
        ? undefined
        : resolveChineseVariantProfile(options.variant).displayScript,
  };
  const model = options.model ?? env.KOTOBA_GEMINI_MODEL ?? DEFAULT_KOTOBA_GEMINI_MODEL;

  try {
    const result = await translateWithKotobaGemini(params, {
      apiKey,
      model,
    });
    writeLine(io.stdout, renderOutput(options.format, result, env));
    return { exitCode: 0 };
  } catch (error) {
    const exitCode = classifyProviderError(error);
    const category = exitCode === 3 ? "Provider response validation failed" : "Gemini provider failed";
    writeLine(io.stderr, `${category}: ${sanitizeErrorMessage(error)}`);
    return { exitCode };
  }
}
