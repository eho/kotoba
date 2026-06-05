import {
  generateJapaneseFormTable,
  type JapaneseFormTable,
  type SupportedLearningLanguage,
  type TranslationDraft,
} from "@edwinho/kotoba-core";
import {
  buildLearningSummary,
  type LearningContrast,
  type LearningFragment,
  type LearningNote,
} from "./learningSections";

interface MarkdownFormatOptions {
  forms?: boolean;
}

function optionalLine(label: string, value: string | null | undefined): string[] {
  return value == null || value.length === 0 ? [] : [`**${label}:** ${value}`];
}

function pushNotes(lines: string[], title: string, notes: LearningNote[]): void {
  if (notes.length === 0) {
    return;
  }

  lines.push("", `## ${title}`);
  for (const note of notes) {
    lines.push(`- **${note.label}:** ${note.text}`);
  }
}

function formatFragmentDetails(fragment: LearningFragment): string {
  return [fragment.translation, fragment.note]
    .filter((value): value is string => value != null && value.length > 0)
    .join(" ");
}

function pushFragments(
  lines: string[],
  title: string,
  fragments: LearningFragment[]
): void {
  if (fragments.length === 0) {
    return;
  }

  lines.push("", `## ${title}`);
  for (const fragment of fragments) {
    const reading = fragment.reading == null ? "" : ` (${fragment.reading})`;
    const details = formatFragmentDetails(fragment);
    lines.push(
      `- ${fragment.text}${reading}${details.length > 0 ? ` - ${details}` : ""}`
    );
  }
}

function pushContrasts(lines: string[], contrasts: LearningContrast[]): void {
  if (contrasts.length === 0) {
    return;
  }

  lines.push("", "## Contrasts");
  for (const contrast of contrasts) {
    const subject = contrast.text == null ? contrast.label : contrast.text;
    const reading = contrast.reading == null ? "" : ` (${contrast.reading})`;
    const translation =
      contrast.translation == null ? "" : ` - ${contrast.translation}`;
    lines.push(`- ${subject}${reading}${translation}: ${contrast.note}`);
  }
}

function escapeTableCell(value: string): string {
  return value.replace(/\|/g, "\\|").replace(/\s+/g, " ").trim();
}

function pushJapaneseFormTable(
  lines: string[],
  tokenSurface: string,
  table: JapaneseFormTable
): void {
  lines.push("", `### ${tokenSurface} forms`, "", table.subtitle, "");
  lines.push("| Form | Value | Note |");
  lines.push("| --- | --- | --- |");
  for (const row of table.rows) {
    lines.push(
      `| ${escapeTableCell(row.label)} | ${escapeTableCell(row.value)} | ${
        row.note == null ? "" : escapeTableCell(row.note)
      } |`
    );
  }
}

export function formatMarkdown(
  draft: TranslationDraft<SupportedLearningLanguage>,
  options: MarkdownFormatOptions = {}
): string {
  const forms = options.forms === true;
  const summary = buildLearningSummary(draft);
  const lines = [
    `# ${summary.targetText}`,
    "",
    ...optionalLine("Reading", summary.reading),
    `**Meaning:** ${summary.meaning}`,
    ...optionalLine(
      "Notes",
      summary.metadata.length === 0 ? null : summary.metadata.join(" | ")
    ),
  ];

  pushNotes(lines, "Learning notes", summary.notes);

  if (summary.studyTokens.length > 0) {
    lines.push("", "## Study tokens");
    for (const [index, token] of summary.studyTokens.entries()) {
      const reading = token.reading == null ? "" : ` (${token.reading})`;
      const note = token.note == null ? "" : ` - ${token.note}`;
      lines.push(
        `- ${token.surface}${reading}: ${token.meaning} [${token.kind}]${note}`
      );
      const table = forms
        ? generateJapaneseFormTable(draft.studyTokens[index]?.metadata)
        : null;
      if (table != null) {
        pushJapaneseFormTable(lines, token.surface, table);
      }
    }
  }

  pushFragments(lines, "Variants", summary.variants);
  pushContrasts(lines, summary.contrasts);
  pushFragments(lines, "Examples", summary.examples);
  pushFragments(lines, "Also", summary.alternates);
  pushFragments(lines, "Don't mix", summary.confusables);
  pushNotes(lines, "Language notes", summary.languageSpecific);

  return lines.join("\n");
}
