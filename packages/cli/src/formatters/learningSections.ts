import {
  extractPhrasePlayableFragments,
  getPhraseFragmentUsageContrastNotes,
} from "@edwinho/kotoba-core";
import type {
  PhrasePlayableFragment,
  SupportedLearningLanguage,
  TranslationDraft,
} from "@edwinho/kotoba-core";

export interface LearningSummary {
  targetText: string;
  reading: string | null;
  meaning: string;
  metadata: string[];
  notes: LearningNote[];
  studyTokens: LearningStudyToken[];
  variants: LearningFragment[];
  contrasts: LearningContrast[];
  examples: LearningFragment[];
  alternates: LearningFragment[];
  confusables: LearningFragment[];
  languageSpecific: LearningNote[];
}

type PhraseFragmentCompatibleDraft = TranslationDraft<SupportedLearningLanguage> & {
  targetLanguage: "ja" | "zh";
};

export interface LearningNote {
  label: string;
  text: string;
  tone?: "warning";
}

export interface LearningStudyToken {
  surface: string;
  reading: string | null;
  kind: string;
  meaning: string;
  note: string | null;
}

export interface LearningFragment {
  label: string;
  text: string;
  reading: string | null;
  translation: string | null;
  note: string | null;
  description: string | null;
}

export interface LearningContrast {
  label: string;
  text: string | null;
  reading: string | null;
  translation: string | null;
  note: string;
  description: string | null;
}

function hasText(value: string | null | undefined): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function pushNote(
  notes: LearningNote[],
  label: string,
  value: string | null | undefined,
  options: { tone?: "warning" } = {}
): void {
  if (!hasText(value)) {
    return;
  }

  notes.push({ label, text: normalizeText(value), ...options });
}

function formatProficiency(
  draft: TranslationDraft<SupportedLearningLanguage>
): string | null {
  const level = draft.enrichment?.proficiencyLevel;
  return level == null ? null : `${level.framework.toUpperCase()} ${level.level}`;
}

function formatKoreanRegister(
  draft: TranslationDraft<SupportedLearningLanguage>
): string | null {
  const korean = draft.enrichment?.korean;
  if (korean == null) {
    return null;
  }

  const parts = [korean.registerLabel, korean.speechLevel]
    .filter(hasText)
    .map(normalizeText);
  return parts.length === 0 ? null : parts.join(" / ");
}

function formatTokenMeaning(
  token: TranslationDraft<SupportedLearningLanguage>["studyTokens"][number]
): string {
  return token.note?.meaning ?? token.note?.note ?? token.kind;
}

function formatFragment(fragment: PhrasePlayableFragment): LearningFragment {
  return {
    label: fragment.label,
    text: normalizeText(fragment.text),
    reading: hasText(fragment.reading) ? normalizeText(fragment.reading) : null,
    translation: hasText(fragment.translation)
      ? normalizeText(fragment.translation)
      : null,
    note: hasText(fragment.relationNote)
      ? normalizeText(fragment.relationNote)
      : null,
    description: hasText(fragment.description)
      ? normalizeText(fragment.description)
      : null,
  };
}

function fragmentSortOrder(fragment: PhrasePlayableFragment): number {
  switch (fragment.kind) {
    case "register_variant":
      return 0;
    case "usage_contrast":
      return 1;
    case "structured_example":
      return 2;
    case "alternate":
      return 3;
    case "example":
      return 4;
    case "confusable":
      return 5;
    case "cantonese_colloquial":
      return 6;
    case "formal_written":
      return 7;
  }
}

export function buildLearningSummary(
  draft: TranslationDraft<SupportedLearningLanguage>
): LearningSummary {
  const enrichment = draft.enrichment;
  const notes: LearningNote[] = [];
  const languageSpecific: LearningNote[] = [];

  pushNote(notes, "Use", draft.usage);
  pushNote(notes, "Literal", enrichment?.literalTranslation);
  pushNote(notes, "Best for", enrichment?.bestUsedWhen);
  pushNote(notes, "Avoid", enrichment?.avoidWhen, { tone: "warning" });

  if (enrichment?.grammarBreakdown != null) {
    const tokens = enrichment.grammarBreakdown.tokens
      .map((token) => `${token.token}: ${token.partOfSpeech}, ${token.meaning}`)
      .join("; ");
    pushNote(notes, `Grammar (${enrichment.grammarBreakdown.confidence})`, tokens);
  }

  if (enrichment?.characterBreakdown != null) {
    const characters = enrichment.characterBreakdown
      .map((item) => {
        const components =
          item.components.length > 0 ? ` (${item.components.join(" + ")})` : "";
        return `${item.character}: ${item.meaning}${components}`;
      })
      .join("; ");
    pushNote(notes, "Characters", characters);
  }

  if (enrichment?.keywordTags != null && enrichment.keywordTags.length > 0) {
    pushNote(notes, "Tags", enrichment.keywordTags.join(", "));
  }

  pushNote(languageSpecific, "Korean note", enrichment?.korean?.note);
  pushNote(
    languageSpecific,
    "Cantonese colloquial",
    enrichment?.cantoneseExamples?.colloquial
  );
  pushNote(
    languageSpecific,
    "Formal written Chinese",
    enrichment?.cantoneseExamples?.formalWritten
  );

  const fragmentDraft =
    draft.targetLanguage === "ko"
      ? null
      : (draft as PhraseFragmentCompatibleDraft);
  const fragmentSource =
    fragmentDraft == null
      ? null
      : {
          alternateForm: fragmentDraft.alternateForm,
          enrichment: fragmentDraft.enrichment,
          targetLanguage: fragmentDraft.targetLanguage,
          targetTextVariants: fragmentDraft.targetTextVariants,
          chineseVariant: fragmentDraft.chineseVariant,
          readingSystem:
            fragmentDraft.readingSystem === "pinyin" ||
            fragmentDraft.readingSystem === "jyutping"
              ? fragmentDraft.readingSystem
              : null,
        };
  const fragments =
    fragmentSource == null
      ? []
      : extractPhrasePlayableFragments(fragmentSource).sort(
          (a, b) => fragmentSortOrder(a) - fragmentSortOrder(b)
        );
  const contrastNotes =
    fragmentSource == null
      ? []
      : getPhraseFragmentUsageContrastNotes(fragmentSource);

  const variants = fragments
    .filter((fragment) => fragment.kind === "register_variant")
    .map(formatFragment);
  const examples = fragments
    .filter(
      (fragment) =>
        fragment.kind === "structured_example" || fragment.kind === "example"
    )
    .map(formatFragment);
  const alternates = fragments
    .filter(
      (fragment) =>
        fragment.kind === "alternate" ||
        fragment.kind === "cantonese_colloquial" ||
        fragment.kind === "formal_written"
    )
    .map(formatFragment);
  const confusables = fragments
    .filter((fragment) => fragment.kind === "confusable")
    .map(formatFragment);
  const playableContrasts = fragments
    .filter((fragment) => fragment.kind === "usage_contrast")
    .map((fragment) => ({
      label: fragment.label,
      text: normalizeText(fragment.text),
      reading: hasText(fragment.reading) ? normalizeText(fragment.reading) : null,
      translation: hasText(fragment.translation)
        ? normalizeText(fragment.translation)
        : null,
      note: normalizeText(
        [fragment.label, fragment.relationNote ?? fragment.description]
          .filter(hasText)
          .join(": ")
      ),
      description: hasText(fragment.description)
        ? normalizeText(fragment.description)
        : null,
    }));
  const proseContrasts = contrastNotes
    .filter((item) => item.kind === "prose")
    .map((item) => ({
      label: item.label,
      text: null,
      reading: null,
      translation: null,
      note: normalizeText(item.text),
      description: null,
    }));

  return {
    targetText: draft.targetText,
    reading: hasText(draft.romanization) ? normalizeText(draft.romanization) : null,
    meaning: draft.translationText,
    metadata: [
      draft.register,
      enrichment?.naturalness,
      formatProficiency(draft),
      formatKoreanRegister(draft),
      draft.readingSystem,
    ]
      .filter(hasText)
      .map(normalizeText),
    notes,
    studyTokens: draft.studyTokens.map((token) => ({
      surface: token.surface,
      reading: hasText(token.reading) ? normalizeText(token.reading) : null,
      kind: token.kind,
      meaning: normalizeText(formatTokenMeaning(token)),
      note:
        token.note?.meaning != null && hasText(token.note.note)
          ? normalizeText(token.note.note)
          : null,
    })),
    variants,
    contrasts: [...playableContrasts, ...proseContrasts],
    examples,
    alternates,
    confusables,
    languageSpecific,
  };
}
