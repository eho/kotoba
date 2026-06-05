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

interface PrettyFormatOptions {
  color?: boolean;
  forms?: boolean;
}

const ANSI = {
  reset: "\u001b[0m",
  bold: "\u001b[1m",
  dim: "\u001b[2m",
};

function style(value: string, code: string, enabled: boolean): string {
  return enabled ? `${code}${value}${ANSI.reset}` : value;
}

function formatLabel(label: string, color: boolean): string {
  return style(`${label}:`, ANSI.dim, color);
}

function pushSection(lines: string[], title: string, color: boolean): void {
  lines.push("", style(`${title}:`, ANSI.dim, color));
}

function pushNotes(
  lines: string[],
  title: string,
  notes: LearningNote[],
  color: boolean
): void {
  if (notes.length === 0) {
    return;
  }

  pushSection(lines, title, color);
  for (const note of notes) {
    lines.push(`- ${note.label}: ${note.text}`);
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
  fragments: LearningFragment[],
  color: boolean
): void {
  if (fragments.length === 0) {
    return;
  }

  pushSection(lines, title, color);
  for (const fragment of fragments) {
    const reading = fragment.reading == null ? "" : ` (${fragment.reading})`;
    const details = formatFragmentDetails(fragment);
    lines.push(
      `- ${fragment.text}${reading}${details.length > 0 ? ` - ${details}` : ""}`
    );
  }
}

function pushContrasts(
  lines: string[],
  contrasts: LearningContrast[],
  color: boolean
): void {
  if (contrasts.length === 0) {
    return;
  }

  pushSection(lines, "Contrasts", color);
  for (const contrast of contrasts) {
    const subject = contrast.text == null ? contrast.label : contrast.text;
    const reading = contrast.reading == null ? "" : ` (${contrast.reading})`;
    const translation =
      contrast.translation == null ? "" : ` - ${contrast.translation}`;
    lines.push(`- ${subject}${reading}${translation}: ${contrast.note}`);
  }
}

function pushJapaneseFormTable(lines: string[], table: JapaneseFormTable): void {
  lines.push(`  Forms - ${table.subtitle}`);
  const labelWidth = Math.max(...table.rows.map((row) => row.label.length));
  for (const row of table.rows) {
    const note = row.note == null ? "" : ` (${row.note})`;
    lines.push(`  ${row.label.padEnd(labelWidth)}  ${row.value}${note}`);
  }
}

export function formatPretty(
  draft: TranslationDraft<SupportedLearningLanguage>,
  options: PrettyFormatOptions = {}
): string {
  const color = options.color !== false;
  const forms = options.forms === true;
  const summary = buildLearningSummary(draft);
  const lines = [
    style(summary.targetText, ANSI.bold, color),
    summary.reading == null
      ? null
      : `${formatLabel("Reading", color)} ${summary.reading}`,
    `${formatLabel("Meaning", color)} ${summary.meaning}`,
    summary.metadata.length === 0
      ? null
      : `${formatLabel("Notes", color)} ${summary.metadata.join(" | ")}`,
  ].filter((line): line is string => line != null);

  pushNotes(lines, "Learning notes", summary.notes, color);

  if (summary.studyTokens.length > 0) {
    pushSection(lines, "Study tokens", color);
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
        pushJapaneseFormTable(lines, table);
      }
    }
  }

  pushFragments(lines, "Variants", summary.variants, color);
  pushContrasts(lines, summary.contrasts, color);
  pushFragments(lines, "Examples", summary.examples, color);
  pushFragments(lines, "Also", summary.alternates, color);
  pushFragments(lines, "Don't mix", summary.confusables, color);
  pushNotes(lines, "Language notes", summary.languageSpecific, color);

  return lines.join("\n");
}
