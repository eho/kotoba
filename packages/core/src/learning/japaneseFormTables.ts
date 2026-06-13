import type {
  JapaneseAdjectiveMorphologyMetadata,
  JapaneseObservedForm,
  JapaneseVerbClass,
  JapaneseVerbMorphologyMetadata,
  MetadataConfidence,
  StudyTokenMetadata,
} from "./learningTypes";

export interface JapaneseFormTableRow {
  label: string;
  value: string;
  note?: string | null;
  observed?: boolean;
}

export type JapaneseFormTableCoreRowKey =
  | "non-past"
  | "negative"
  | "past"
  | "past-negative";

export interface JapaneseFormTableCoreCell {
  value: string;
  note?: string | null;
  observed?: boolean;
}

export interface JapaneseFormTableCoreRow {
  key: JapaneseFormTableCoreRowKey;
  label: string;
  plain: JapaneseFormTableCoreCell;
  polite: JapaneseFormTableCoreCell;
}

export interface JapaneseFormTable {
  language: "ja";
  category: "morphology";
  kind: "verb" | "adjective";
  title: string;
  subtitle: string;
  confidence: MetadataConfidence;
  rows: JapaneseFormTableRow[];
  coreRows: JapaneseFormTableCoreRow[];
  otherRows: JapaneseFormTableRow[];
}

export interface JapaneseFormTableOptions {
  minConfidence?: "high" | "medium";
}

interface VerbForms {
  dictionary: string;
  polite: string;
  negative: string;
  politeNegative: string;
  past: string;
  politePast: string;
  pastNegative: string;
  politePastNegative: string;
  teForm: string;
  potential: string;
}

interface IAdjectiveForms {
  plain: string;
  polite: string;
  negative: string;
  politeNegative: string;
  past: string;
  politePast: string;
  pastNegative: string;
  politePastNegative: string;
  teForm: string;
  adverbial: string;
}

interface NaAdjectiveForms extends IAdjectiveForms {
  beforeNoun: string;
}

type JapaneseFormTableObservedRow = JapaneseFormTableRow & {
  observedForm?: JapaneseObservedForm;
};

type JapaneseFormTableObservedCell = JapaneseFormTableCoreCell & {
  observedForm?: JapaneseObservedForm;
};

type JapaneseFormTableObservedCoreRow = {
  key: JapaneseFormTableCoreRowKey;
  label: string;
  plain: JapaneseFormTableObservedCell;
  polite: JapaneseFormTableObservedCell;
};

interface JapaneseObservedMarker {
  observedForm?: JapaneseObservedForm | null;
  surface?: string | null;
}

const VERB_CLASS_LABELS: Record<JapaneseVerbClass, string> = {
  ichidan: "Ichidan verb",
  "godan-u": "Godan verb",
  "godan-ku": "Godan verb",
  "godan-gu": "Godan verb",
  "godan-su": "Godan verb",
  "godan-tsu": "Godan verb",
  "godan-nu": "Godan verb",
  "godan-bu": "Godan verb",
  "godan-mu": "Godan verb",
  "godan-ru": "Godan verb",
  suru: "Suru verb",
  kuru: "Kuru verb",
  irregular: "Irregular verb",
};

const GODAN_RULES = {
  "godan-u": {
    ending: "う",
    iEnding: "い",
    aEnding: "わ",
    eEnding: "え",
    pastSuffix: "った",
    teSuffix: "って",
  },
  "godan-ku": {
    ending: "く",
    iEnding: "き",
    aEnding: "か",
    eEnding: "け",
    pastSuffix: "いた",
    teSuffix: "いて",
  },
  "godan-gu": {
    ending: "ぐ",
    iEnding: "ぎ",
    aEnding: "が",
    eEnding: "げ",
    pastSuffix: "いだ",
    teSuffix: "いで",
  },
  "godan-su": {
    ending: "す",
    iEnding: "し",
    aEnding: "さ",
    eEnding: "せ",
    pastSuffix: "した",
    teSuffix: "して",
  },
  "godan-tsu": {
    ending: "つ",
    iEnding: "ち",
    aEnding: "た",
    eEnding: "て",
    pastSuffix: "った",
    teSuffix: "って",
  },
  "godan-nu": {
    ending: "ぬ",
    iEnding: "に",
    aEnding: "な",
    eEnding: "ね",
    pastSuffix: "んだ",
    teSuffix: "んで",
  },
  "godan-bu": {
    ending: "ぶ",
    iEnding: "び",
    aEnding: "ば",
    eEnding: "べ",
    pastSuffix: "んだ",
    teSuffix: "んで",
  },
  "godan-mu": {
    ending: "む",
    iEnding: "み",
    aEnding: "ま",
    eEnding: "め",
    pastSuffix: "んだ",
    teSuffix: "んで",
  },
  "godan-ru": {
    ending: "る",
    iEnding: "り",
    aEnding: "ら",
    eEnding: "れ",
    pastSuffix: "った",
    teSuffix: "って",
  },
} satisfies Record<
  Exclude<JapaneseVerbClass, "ichidan" | "suru" | "kuru" | "irregular">,
  {
    ending: string;
    iEnding: string;
    aEnding: string;
    eEnding: string;
    pastSuffix: string;
    teSuffix: string;
  }
>;

export function generateJapaneseFormTable(
  metadata: StudyTokenMetadata | null | undefined,
  options: JapaneseFormTableOptions = {}
): JapaneseFormTable | null {
  if (metadata == null || metadata.language !== "ja" || metadata.category !== "morphology") {
    return null;
  }
  if (!meetsConfidenceThreshold(metadata.confidence, options.minConfidence ?? "high")) {
    return null;
  }

  if (metadata.kind === "verb") {
    return generateVerbTable(metadata);
  }

  return generateAdjectiveTable(metadata);
}

function meetsConfidenceThreshold(
  confidence: MetadataConfidence,
  minConfidence: "high" | "medium"
): boolean {
  if (confidence === "low") {
    return false;
  }
  if (confidence === "medium") {
    return minConfidence === "medium";
  }
  return true;
}

function generateVerbTable(
  metadata: JapaneseVerbMorphologyMetadata
): JapaneseFormTable | null {
  const forms = deriveVerbForms(metadata);
  if (forms == null) {
    return null;
  }
  const observed = createObservedMarker(metadata);
  const rows = markObservedRows(
    [
      { label: "Dictionary", value: forms.dictionary, observedForm: "dictionary" },
      { label: "Polite", value: forms.polite, observedForm: "polite" },
      { label: "Negative", value: forms.negative, observedForm: "negative" },
      { label: "Past", value: forms.past, observedForm: "past" },
      {
        label: "Past negative",
        value: forms.pastNegative,
        observedForm: "past-negative",
      },
      { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
      { label: "Potential", value: forms.potential, observedForm: "potential" },
    ],
    observed
  );
  const coreRows = markObservedCoreRows(
    [
      {
        key: "non-past",
        label: "Non-past",
        plain: { value: forms.dictionary, observedForm: "dictionary" },
        polite: { value: forms.polite, observedForm: "polite" },
      },
      {
        key: "negative",
        label: "Negative",
        plain: { value: forms.negative, observedForm: "negative" },
        polite: {
          value: forms.politeNegative,
          observedForm: "polite-negative",
        },
      },
      {
        key: "past",
        label: "Past",
        plain: { value: forms.past, observedForm: "past" },
        polite: { value: forms.politePast, observedForm: "polite-past" },
      },
      {
        key: "past-negative",
        label: "Past negative",
        plain: { value: forms.pastNegative, observedForm: "past-negative" },
        polite: {
          value: forms.politePastNegative,
          observedForm: "polite-past-negative",
        },
      },
    ],
    observed
  );
  const otherRows = markObservedRows(
    [
      { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
      { label: "Potential", value: forms.potential, observedForm: "potential" },
    ],
    observed
  );

  return {
    language: "ja",
    category: "morphology",
    kind: "verb",
    title: "Forms",
    subtitle: `${VERB_CLASS_LABELS[metadata.verbClass]}: ${metadata.lemma}`,
    confidence: metadata.confidence,
    rows,
    coreRows,
    otherRows,
  };
}

function deriveVerbForms(
  metadata: JapaneseVerbMorphologyMetadata
): VerbForms | null {
  if (metadata.lemma === "ある") {
    return {
      dictionary: "ある",
      polite: "あります",
      negative: "ない",
      politeNegative: "ありません",
      past: "あった",
      politePast: "ありました",
      pastNegative: "なかった",
      politePastNegative: "ありませんでした",
      teForm: "あって",
      potential: "あり得る",
    };
  }

  if (metadata.verbClass === "ichidan") {
    if (!metadata.lemma.endsWith("る")) {
      return null;
    }
    const stem = metadata.lemma.slice(0, -1);
    return {
      dictionary: metadata.lemma,
      polite: `${stem}ます`,
      negative: `${stem}ない`,
      politeNegative: `${stem}ません`,
      past: `${stem}た`,
      politePast: `${stem}ました`,
      pastNegative: `${stem}なかった`,
      politePastNegative: `${stem}ませんでした`,
      teForm: `${stem}て`,
      potential: `${stem}られる`,
    };
  }

  if (metadata.verbClass === "suru") {
    if (!metadata.lemma.endsWith("する")) {
      return null;
    }
    const prefix = metadata.lemma.slice(0, -2);
    return {
      dictionary: metadata.lemma,
      polite: `${prefix}します`,
      negative: `${prefix}しない`,
      politeNegative: `${prefix}しません`,
      past: `${prefix}した`,
      politePast: `${prefix}しました`,
      pastNegative: `${prefix}しなかった`,
      politePastNegative: `${prefix}しませんでした`,
      teForm: `${prefix}して`,
      potential: `${prefix}できる`,
    };
  }

  if (metadata.verbClass === "kuru") {
    if (!metadata.lemma.endsWith("来る")) {
      return null;
    }
    const prefix = metadata.lemma.slice(0, -2);
    return {
      dictionary: metadata.lemma,
      polite: `${prefix}来ます`,
      negative: `${prefix}来ない`,
      politeNegative: `${prefix}来ません`,
      past: `${prefix}来た`,
      politePast: `${prefix}来ました`,
      pastNegative: `${prefix}来なかった`,
      politePastNegative: `${prefix}来ませんでした`,
      teForm: `${prefix}来て`,
      potential: `${prefix}来られる`,
    };
  }

  if (metadata.verbClass === "irregular") {
    return null;
  }

  const rule = GODAN_RULES[metadata.verbClass];
  if (!metadata.lemma.endsWith(rule.ending)) {
    return null;
  }

  const stem = metadata.lemma.slice(0, -1);
  const past = metadata.lemma === "行く" ? "行った" : `${stem}${rule.pastSuffix}`;
  const teForm = metadata.lemma === "行く" ? "行って" : `${stem}${rule.teSuffix}`;
  return {
    dictionary: metadata.lemma,
    polite: `${stem}${rule.iEnding}ます`,
    negative: `${stem}${rule.aEnding}ない`,
    politeNegative: `${stem}${rule.iEnding}ません`,
    past,
    politePast: `${stem}${rule.iEnding}ました`,
    pastNegative: `${stem}${rule.aEnding}なかった`,
    politePastNegative: `${stem}${rule.iEnding}ませんでした`,
    teForm,
    potential: `${stem}${rule.eEnding}る`,
  };
}

function generateAdjectiveTable(
  metadata: JapaneseAdjectiveMorphologyMetadata
): JapaneseFormTable | null {
  const forms = deriveAdjectiveForms(metadata);
  if (forms == null) {
    return null;
  }

  const subtitle =
    metadata.adjectiveClass === "i"
      ? `i-adjective: ${metadata.lemma}`
      : `na-adjective: ${stripTrailingNa(metadata.lemma)}`;
  const rows: JapaneseFormTableObservedRow[] =
    metadata.adjectiveClass === "i"
      ? [
          { label: "Plain", value: forms.plain, observedForm: "plain" },
          { label: "Polite", value: forms.polite, observedForm: "polite" },
          { label: "Negative", value: forms.negative, observedForm: "negative" },
          { label: "Past", value: forms.past, observedForm: "past" },
          {
            label: "Past negative",
            value: forms.pastNegative,
            observedForm: "past-negative",
          },
          { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
          { label: "Adverbial", value: forms.adverbial, observedForm: "adverbial" },
        ]
      : [
          { label: "Plain", value: forms.plain, observedForm: "plain" },
          { label: "Polite", value: forms.polite, observedForm: "polite" },
          {
            label: "Before noun",
            value: (forms as NaAdjectiveForms).beforeNoun,
            observedForm: "before-noun",
          },
          { label: "Negative", value: forms.negative, observedForm: "negative" },
          { label: "Past", value: forms.past, observedForm: "past" },
          {
            label: "Past negative",
            value: forms.pastNegative,
            observedForm: "past-negative",
          },
          {
            label: "Past polite",
            value: forms.politePast,
            observedForm: "polite-past",
          },
          { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
          { label: "Adverbial", value: forms.adverbial, observedForm: "adverbial" },
        ];
  const coreRows = markObservedCoreRows(
    [
      {
        key: "non-past",
        label: "Non-past",
        plain: { value: forms.plain, observedForm: "plain" },
        polite: { value: forms.polite, observedForm: "polite" },
      },
      {
        key: "negative",
        label: "Negative",
        plain: { value: forms.negative, observedForm: "negative" },
        polite: {
          value: forms.politeNegative,
          observedForm: "polite-negative",
        },
      },
      {
        key: "past",
        label: "Past",
        plain: { value: forms.past, observedForm: "past" },
        polite: { value: forms.politePast, observedForm: "polite-past" },
      },
      {
        key: "past-negative",
        label: "Past negative",
        plain: { value: forms.pastNegative, observedForm: "past-negative" },
        polite: {
          value: forms.politePastNegative,
          observedForm: "polite-past-negative",
        },
      },
    ],
    createObservedMarker(metadata)
  );
  const observed = createObservedMarker(metadata);
  const otherRows = markObservedRows(
    metadata.adjectiveClass === "i"
      ? [
          { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
          { label: "Adverbial", value: forms.adverbial, observedForm: "adverbial" },
        ]
      : [
          {
            label: "Before noun",
            value: (forms as NaAdjectiveForms).beforeNoun,
            observedForm: "before-noun",
          },
          { label: "Te-form", value: forms.teForm, observedForm: "te-form" },
          { label: "Adverbial", value: forms.adverbial, observedForm: "adverbial" },
        ],
    observed
  );

  return {
    language: "ja",
    category: "morphology",
    kind: "adjective",
    title: "Forms",
    subtitle,
    confidence: metadata.confidence,
    rows: markObservedRows(rows, observed),
    coreRows,
    otherRows,
  };
}

function deriveAdjectiveForms(
  metadata: JapaneseAdjectiveMorphologyMetadata
): IAdjectiveForms | NaAdjectiveForms | null {
  if (metadata.adjectiveClass === "i") {
    if (metadata.lemma === "いい") {
      return {
        plain: "いい",
        polite: "いいです",
        negative: "よくない",
        politeNegative: "よくないです / よくありません",
        past: "よかった",
        politePast: "よかったです",
        pastNegative: "よくなかった",
        politePastNegative: "よくなかったです / よくありませんでした",
        teForm: "よくて",
        adverbial: "よく",
      };
    }
    if (!metadata.lemma.endsWith("い")) {
      return null;
    }
    const stem = metadata.lemma.slice(0, -1);
    return {
      plain: metadata.lemma,
      polite: `${metadata.lemma}です`,
      negative: `${stem}くない`,
      politeNegative: `${stem}くないです / ${stem}くありません`,
      past: `${stem}かった`,
      politePast: `${stem}かったです`,
      pastNegative: `${stem}くなかった`,
      politePastNegative: `${stem}くなかったです / ${stem}くありませんでした`,
      teForm: `${stem}くて`,
      adverbial: `${stem}く`,
    };
  }

  const base = stripTrailingNa(metadata.lemma);
  if (base.length === 0) {
    return null;
  }
  return {
    plain: `${base}だ`,
    polite: `${base}です`,
    beforeNoun: `${base}な`,
    negative: `${base}じゃない / ${base}ではない`,
    politeNegative: `${base}じゃありません / ${base}ではありません`,
    past: `${base}だった`,
    politePast: `${base}でした`,
    pastNegative: `${base}じゃなかった`,
    politePastNegative: `${base}じゃありませんでした / ${base}ではありませんでした`,
    teForm: `${base}で`,
    adverbial: `${base}に`,
  };
}

function stripTrailingNa(value: string): string {
  return value.endsWith("な") ? value.slice(0, -1) : value;
}

function createObservedMarker(
  metadata: JapaneseVerbMorphologyMetadata | JapaneseAdjectiveMorphologyMetadata
): JapaneseObservedMarker {
  return {
    observedForm: metadata.observedForm,
    surface: metadata.surface,
  };
}

function formValueMatchesSurface(value: string, surface: string | null | undefined): boolean {
  if (surface == null || surface.trim().length === 0) {
    return false;
  }

  return value
    .split("/")
    .map((part) => part.trim())
    .some((part) => part === surface);
}

function markObservedCoreRows(
  rows: JapaneseFormTableObservedCoreRow[],
  observed: JapaneseObservedMarker
): JapaneseFormTableCoreRow[] {
  return rows.map((row) => ({
    key: row.key,
    label: row.label,
    plain: markObservedCoreCell(row.plain, observed),
    polite: markObservedCoreCell(row.polite, observed),
  }));
}

function markObservedCoreCell(
  cell: JapaneseFormTableObservedCell,
  observed: JapaneseObservedMarker
): JapaneseFormTableCoreCell {
  const { observedForm: cellObservedForm, ...rest } = cell;
  if (
    (cellObservedForm === undefined || cellObservedForm !== observed.observedForm) &&
    !formValueMatchesSurface(cell.value, observed.surface)
  ) {
    return rest;
  }

  return {
    ...rest,
    observed: true,
    note: "Seen here",
  };
}

function markObservedRows(
  rows: JapaneseFormTableObservedRow[],
  observed: JapaneseObservedMarker
): JapaneseFormTableRow[] {
  return rows.map(({ observedForm: rowObservedForm, ...row }) => {
    const isObserved =
      (rowObservedForm !== undefined && observed.observedForm === rowObservedForm) ||
      formValueMatchesSurface(row.value, observed.surface);
    if (!isObserved) {
      return row;
    }

    return {
      ...row,
      observed: true,
      note: "Seen here",
    };
  });
}
