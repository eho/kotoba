import type { SupportedLearningLanguage, TranslationDraft } from "@edwinho/kotoba-core";

interface PrettyFormatOptions {
  color?: boolean;
}

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
};

function style(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}

export function formatPretty(
  draft: TranslationDraft<SupportedLearningLanguage>,
  options: PrettyFormatOptions = {}
): string {
  const color = options.color !== false;
  const lines = [
    style(draft.targetText, ANSI.bold, color),
    draft.romanization == null ? null : `${style("Reading:", ANSI.dim, color)} ${draft.romanization}`,
    `${style("Meaning:", ANSI.dim, color)} ${draft.translationText}`,
    draft.register == null ? null : `${style("Register:", ANSI.dim, color)} ${draft.register}`,
  ].filter((line): line is string => line != null);

  if (draft.studyTokens.length > 0) {
    lines.push("", style("Study tokens:", ANSI.dim, color));
    for (const token of draft.studyTokens) {
      const meaning = token.note?.meaning ?? token.note?.note ?? token.kind;
      lines.push(`- ${token.surface}: ${meaning}`);
    }
  }

  return lines.join("\n");
}
