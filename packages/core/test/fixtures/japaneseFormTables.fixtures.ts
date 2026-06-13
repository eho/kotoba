import type {
  JapaneseFormTableRow,
  JapaneseObservedForm,
  JapaneseVerbClass,
  StudyTokenMetadata,
} from "../../src";

export interface JapaneseFormTableFixture {
  name: string;
  metadata: StudyTokenMetadata;
  expectedKind: "verb" | "adjective";
  expectedSubtitle: string;
  expectedRows: JapaneseFormTableRow[];
}

export const japaneseFormTableFixtures: JapaneseFormTableFixture[] = [
  {
    name: "ichidan 食べる",
    metadata: verb("食べた", "食べる", "ichidan", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Ichidan verb: 食べる",
    expectedRows: verbRows("食べる", "食べます", "食べない", "食べた", "食べなかった", "食べて", "食べられる", "Past"),
  },
  {
    name: "ichidan 見る",
    metadata: verb("見ます", "見る", "ichidan", "polite"),
    expectedKind: "verb",
    expectedSubtitle: "Ichidan verb: 見る",
    expectedRows: verbRows("見る", "見ます", "見ない", "見た", "見なかった", "見て", "見られる", "Polite"),
  },
  {
    name: "godan-u 買う",
    metadata: verb("買わない", "買う", "godan-u", "negative"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 買う",
    expectedRows: verbRows("買う", "買います", "買わない", "買った", "買わなかった", "買って", "買える", "Negative"),
  },
  {
    name: "godan-ku 書く",
    metadata: verb("書いて", "書く", "godan-ku", "te-form"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 書く",
    expectedRows: verbRows("書く", "書きます", "書かない", "書いた", "書かなかった", "書いて", "書ける", "Te-form"),
  },
  {
    name: "godan-gu 泳ぐ",
    metadata: verb("泳いだ", "泳ぐ", "godan-gu", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 泳ぐ",
    expectedRows: verbRows("泳ぐ", "泳ぎます", "泳がない", "泳いだ", "泳がなかった", "泳いで", "泳げる", "Past"),
  },
  {
    name: "godan-su 話す",
    metadata: verb("話せる", "話す", "godan-su", "potential"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 話す",
    expectedRows: verbRows("話す", "話します", "話さない", "話した", "話さなかった", "話して", "話せる", "Potential"),
  },
  {
    name: "godan-tsu 待つ",
    metadata: verb("待った", "待つ", "godan-tsu", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 待つ",
    expectedRows: verbRows("待つ", "待ちます", "待たない", "待った", "待たなかった", "待って", "待てる", "Past"),
  },
  {
    name: "godan-nu 死ぬ",
    metadata: verb("死んで", "死ぬ", "godan-nu", "te-form"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 死ぬ",
    expectedRows: verbRows("死ぬ", "死にます", "死なない", "死んだ", "死ななかった", "死んで", "死ねる", "Te-form"),
  },
  {
    name: "godan-bu 遊ぶ",
    metadata: verb("遊びます", "遊ぶ", "godan-bu", "polite"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 遊ぶ",
    expectedRows: verbRows("遊ぶ", "遊びます", "遊ばない", "遊んだ", "遊ばなかった", "遊んで", "遊べる", "Polite"),
  },
  {
    name: "godan-mu 飲む",
    metadata: verb("飲んだ", "飲む", "godan-mu", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 飲む",
    expectedRows: verbRows("飲む", "飲みます", "飲まない", "飲んだ", "飲まなかった", "飲んで", "飲める", "Past"),
  },
  {
    name: "godan-ru 帰る",
    metadata: verb("帰ります", "帰る", "godan-ru", "polite"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 帰る",
    expectedRows: verbRows("帰る", "帰ります", "帰らない", "帰った", "帰らなかった", "帰って", "帰れる", "Polite"),
  },
  {
    name: "suru する",
    metadata: verb("した", "する", "suru", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Suru verb: する",
    expectedRows: verbRows("する", "します", "しない", "した", "しなかった", "して", "できる", "Past"),
  },
  {
    name: "suru 勉強する",
    metadata: verb("勉強して", "勉強する", "suru", "te-form"),
    expectedKind: "verb",
    expectedSubtitle: "Suru verb: 勉強する",
    expectedRows: verbRows("勉強する", "勉強します", "勉強しない", "勉強した", "勉強しなかった", "勉強して", "勉強できる", "Te-form"),
  },
  {
    name: "kuru 来る",
    metadata: verb("来た", "来る", "kuru", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Kuru verb: 来る",
    expectedRows: verbRows("来る", "来ます", "来ない", "来た", "来なかった", "来て", "来られる", "Past"),
  },
  {
    name: "kuru 持って来る",
    metadata: verb("持って来ない", "持って来る", "kuru", "negative"),
    expectedKind: "verb",
    expectedSubtitle: "Kuru verb: 持って来る",
    expectedRows: verbRows("持って来る", "持って来ます", "持って来ない", "持って来た", "持って来なかった", "持って来て", "持って来られる", "Negative"),
  },
  {
    name: "special 行く",
    metadata: verb("行って", "行く", "godan-ku", "te-form"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 行く",
    expectedRows: verbRows("行く", "行きます", "行かない", "行った", "行かなかった", "行って", "行ける", "Te-form"),
  },
  {
    name: "special ある irregular",
    metadata: verb("ない", "ある", "irregular", "negative"),
    expectedKind: "verb",
    expectedSubtitle: "Irregular verb: ある",
    expectedRows: verbRows("ある", "あります", "ない", "あった", "なかった", "あって", "あり得る", "Negative"),
  },
  {
    name: "special ある godan-ru",
    metadata: verb("あった", "ある", "godan-ru", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: ある",
    expectedRows: verbRows("ある", "あります", "ない", "あった", "なかった", "あって", "あり得る", "Past"),
  },
  {
    name: "godan-ru 走る",
    metadata: verb("走った", "走る", "godan-ru", "past"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 走る",
    expectedRows: verbRows("走る", "走ります", "走らない", "走った", "走らなかった", "走って", "走れる", "Past"),
  },
  {
    name: "godan-tsu 立つ",
    metadata: verb("立てる", "立つ", "godan-tsu", "potential"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 立つ",
    expectedRows: verbRows("立つ", "立ちます", "立たない", "立った", "立たなかった", "立って", "立てる", "Potential"),
  },
  {
    name: "godan-ku 聞く",
    metadata: verb("聞かない", "聞く", "godan-ku", "negative"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 聞く",
    expectedRows: verbRows("聞く", "聞きます", "聞かない", "聞いた", "聞かなかった", "聞いて", "聞ける", "Negative"),
  },
  {
    name: "godan-mu 読む",
    metadata: verb("読める", "読む", "godan-mu", "potential"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 読む",
    expectedRows: verbRows("読む", "読みます", "読まない", "読んだ", "読まなかった", "読んで", "読める", "Potential"),
  },
  {
    name: "godan-ru 作る",
    metadata: verb("作って", "作る", "godan-ru", "te-form"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 作る",
    expectedRows: verbRows("作る", "作ります", "作らない", "作った", "作らなかった", "作って", "作れる", "Te-form"),
  },
  {
    name: "godan-u 会う",
    metadata: verb("会います", "会う", "godan-u", "polite"),
    expectedKind: "verb",
    expectedSubtitle: "Godan verb: 会う",
    expectedRows: verbRows("会う", "会います", "会わない", "会った", "会わなかった", "会って", "会える", "Polite"),
  },
  {
    name: "i-adjective 高い",
    metadata: adjective("高かった", "高い", "i", "past"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: 高い",
    expectedRows: iAdjectiveRows("高い", "高いです", "高くない", "高かった", "高くなかった", "高くて", "高く", "Past"),
  },
  {
    name: "i-adjective 新しい",
    metadata: adjective("新しくて", "新しい", "i", "te-form"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: 新しい",
    expectedRows: iAdjectiveRows("新しい", "新しいです", "新しくない", "新しかった", "新しくなかった", "新しくて", "新しく", "Te-form"),
  },
  {
    name: "i-adjective 楽しい",
    metadata: adjective("楽しくない", "楽しい", "i", "negative"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: 楽しい",
    expectedRows: iAdjectiveRows("楽しい", "楽しいです", "楽しくない", "楽しかった", "楽しくなかった", "楽しくて", "楽しく", "Negative"),
  },
  {
    name: "i-adjective 寒い",
    metadata: adjective("寒く", "寒い", "i", "adverbial"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: 寒い",
    expectedRows: iAdjectiveRows("寒い", "寒いです", "寒くない", "寒かった", "寒くなかった", "寒くて", "寒く", "Adverbial"),
  },
  {
    name: "i-adjective 忙しい",
    metadata: adjective("忙しいです", "忙しい", "i", "polite"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: 忙しい",
    expectedRows: iAdjectiveRows("忙しい", "忙しいです", "忙しくない", "忙しかった", "忙しくなかった", "忙しくて", "忙しく", "Polite"),
  },
  {
    name: "special いい",
    metadata: adjective("よかった", "いい", "i", "past"),
    expectedKind: "adjective",
    expectedSubtitle: "i-adjective: いい",
    expectedRows: iAdjectiveRows("いい", "いいです", "よくない", "よかった", "よくなかった", "よくて", "よく", "Past"),
  },
  {
    name: "na-adjective 静か",
    metadata: adjective("静かだった", "静か", "na", "past"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: 静か",
    expectedRows: naAdjectiveRows("静か", "Past"),
  },
  {
    name: "na-adjective 便利",
    metadata: adjective("便利な", "便利", "na", "before-noun"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: 便利",
    expectedRows: naAdjectiveRows("便利", "Before noun"),
  },
  {
    name: "na-adjective きれい",
    metadata: adjective("きれいで", "きれい", "na", "te-form"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: きれい",
    expectedRows: naAdjectiveRows("きれい", "Te-form"),
  },
  {
    name: "na-adjective 大切な",
    metadata: adjective("大切に", "大切な", "na", "adverbial"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: 大切",
    expectedRows: naAdjectiveRows("大切", "Adverbial"),
  },
  {
    name: "na-adjective 好き",
    metadata: adjective("好きじゃない", "好き", "na", "negative"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: 好き",
    expectedRows: naAdjectiveRows("好き", "Negative"),
  },
  {
    name: "na-adjective 有名",
    metadata: adjective("有名です", "有名", "na", "polite"),
    expectedKind: "adjective",
    expectedSubtitle: "na-adjective: 有名",
    expectedRows: naAdjectiveRows("有名", "Polite"),
  },
];

export const malformedStudyTokenMetadata = {
  language: "ja",
  category: "morphology",
  kind: "verb",
  surface: "食べた",
  lemma: "",
  verbClass: "ichidan",
  confidence: "high",
};

export const unsupportedFallbackMetadata: StudyTokenMetadata[] = [
  verb("知らない", "知る", "irregular", "negative"),
  adjective("変だった", "変", "na", "unknown", "low"),
];

function verb(
  surface: string,
  lemma: string,
  verbClass: JapaneseVerbClass,
  observedForm: JapaneseObservedForm,
  confidence: "high" | "medium" | "low" = "high"
): StudyTokenMetadata {
  return {
    language: "ja",
    category: "morphology",
    kind: "verb",
    surface,
    lemma,
    verbClass,
    observedForm,
    confidence,
  };
}

function adjective(
  surface: string,
  lemma: string,
  adjectiveClass: "i" | "na",
  observedForm: JapaneseObservedForm,
  confidence: "high" | "medium" | "low" = "high"
): StudyTokenMetadata {
  return {
    language: "ja",
    category: "morphology",
    kind: "adjective",
    surface,
    lemma,
    adjectiveClass,
    observedForm,
    confidence,
  };
}

function verbRows(
  dictionary: string,
  polite: string,
  negative: string,
  past: string,
  pastNegative: string,
  teForm: string,
  potential: string,
  observedLabel: string
): JapaneseFormTableRow[] {
  return markObserved(
    [
      ["Dictionary", dictionary],
      ["Polite", polite],
      ["Negative", negative],
      ["Past", past],
      ["Past negative", pastNegative],
      ["Te-form", teForm],
      ["Potential", potential],
    ],
    observedLabel
  );
}

function iAdjectiveRows(
  plain: string,
  polite: string,
  negative: string,
  past: string,
  pastNegative: string,
  teForm: string,
  adverbial: string,
  observedLabel: string
): JapaneseFormTableRow[] {
  return markObserved(
    [
      ["Plain", plain],
      ["Polite", polite],
      ["Negative", negative],
      ["Past", past],
      ["Past negative", pastNegative],
      ["Te-form", teForm],
      ["Adverbial", adverbial],
    ],
    observedLabel
  );
}

function naAdjectiveRows(
  base: string,
  observedLabel: string
): JapaneseFormTableRow[] {
  return markObserved(
    [
      ["Plain", `${base}だ`],
      ["Polite", `${base}です`],
      ["Before noun", `${base}な`],
      ["Negative", `${base}じゃない / ${base}ではない`],
      ["Past", `${base}だった`],
      ["Past negative", `${base}じゃなかった`],
      ["Past polite", `${base}でした`],
      ["Te-form", `${base}で`],
      ["Adverbial", `${base}に`],
    ],
    observedLabel
  );
}

function markObserved(
  rows: Array<[label: string, value: string]>,
  observedLabel: string
): JapaneseFormTableRow[] {
  return rows.map(([label, value]) => {
    if (label !== observedLabel) {
      return { label, value };
    }
    return { label, value, observed: true, note: "Seen here" };
  });
}
