import type { SupportedLearningLanguage, TranslationDraft } from "@edwinho/kotoba-core";

function optionalLine(label: string, value: string | null | undefined): string[] {
  return value == null || value.length === 0 ? [] : [`**${label}:** ${value}`];
}

export function formatMarkdown(
  draft: TranslationDraft<SupportedLearningLanguage>
): string {
  const lines = [
    `# ${draft.targetText}`,
    "",
    ...optionalLine("Reading", draft.romanization),
    `**Meaning:** ${draft.translationText}`,
    ...optionalLine("Register", draft.register),
  ];

  if (draft.studyTokens.length > 0) {
    lines.push("", "## Study tokens");
    for (const token of draft.studyTokens) {
      const meaning = token.note?.meaning ?? token.note?.note ?? token.kind;
      lines.push(`- ${token.surface}: ${meaning}`);
    }
  }

  return lines.join("\n");
}
