import { describe, expect, it } from "bun:test";
import { generateJapaneseFormTable } from "../src";
import {
  japaneseFormTableFixtures,
  unsupportedFallbackMetadata,
} from "./fixtures/japaneseFormTables.fixtures";

describe("generateJapaneseFormTable", () => {
  it("generates deterministic Phase 1 rows for high-confidence verb and adjective metadata", () => {
    expect(japaneseFormTableFixtures.length).toBeGreaterThanOrEqual(30);
    expect(japaneseFormTableFixtures.every((fixture) => fixture.metadata.confidence === "high")).toBe(
      true
    );

    for (const fixture of japaneseFormTableFixtures) {
      const table = generateJapaneseFormTable(fixture.metadata);

      expect(table, fixture.name).not.toBeNull();
      expect(table).toMatchObject({
        language: "ja",
        category: "morphology",
        kind: fixture.expectedKind,
        title: "Forms",
        subtitle: fixture.expectedSubtitle,
        confidence: "high",
      });
      expect(table?.rows).toEqual(fixture.expectedRows);
      expect(table?.coreRows.length).toBe(4);
      expect(table?.otherRows.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("generates a plain and polite core matrix for verbs", () => {
    const table = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: "飲んだ",
      lemma: "飲む",
      verbClass: "godan-mu",
      observedForm: "past",
      confidence: "high",
    });

    expect(table?.coreRows).toEqual([
      {
        key: "non-past",
        label: "Non-past",
        plain: { value: "飲む" },
        polite: { value: "飲みます" },
      },
      {
        key: "negative",
        label: "Negative",
        plain: { value: "飲まない" },
        polite: { value: "飲みません" },
      },
      {
        key: "past",
        label: "Past",
        plain: { value: "飲んだ", observed: true, note: "Seen here" },
        polite: { value: "飲みました" },
      },
      {
        key: "past-negative",
        label: "Past negative",
        plain: { value: "飲まなかった" },
        polite: { value: "飲みませんでした" },
      },
    ]);
    expect(table?.otherRows).toEqual([
      { label: "Te-form", value: "飲んで" },
      { label: "Potential", value: "飲める" },
    ]);
  });

  it("marks the observed cell from the surface when observedForm is unavailable", () => {
    const table = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: "飲みませんでした",
      lemma: "飲む",
      verbClass: "godan-mu",
      observedForm: null,
      confidence: "high",
    });

    expect(table?.coreRows.find((row) => row.key === "past-negative")).toEqual({
      key: "past-negative",
      label: "Past negative",
      plain: { value: "飲まなかった" },
      polite: {
        value: "飲みませんでした",
        observed: true,
        note: "Seen here",
      },
    });
  });

  it("marks polite adjective cells from the surface when observedForm is unavailable", () => {
    const iAdjectiveTable = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: "高かったです",
      lemma: "高い",
      adjectiveClass: "i",
      observedForm: null,
      confidence: "high",
    });
    const naAdjectiveTable = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: "静かでした",
      lemma: "静か",
      adjectiveClass: "na",
      observedForm: null,
      confidence: "high",
    });

    expect(iAdjectiveTable?.coreRows.find((row) => row.key === "past")?.polite).toEqual({
      value: "高かったです",
      observed: true,
      note: "Seen here",
    });
    expect(naAdjectiveTable?.coreRows.find((row) => row.key === "past")?.polite).toEqual({
      value: "静かでした",
      observed: true,
      note: "Seen here",
    });
  });

  it("generates a plain and polite core matrix for i-adjectives", () => {
    const table = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: "高かった",
      lemma: "高い",
      adjectiveClass: "i",
      observedForm: "past",
      confidence: "high",
    });

    expect(table?.coreRows).toEqual([
      {
        key: "non-past",
        label: "Non-past",
        plain: { value: "高い" },
        polite: { value: "高いです" },
      },
      {
        key: "negative",
        label: "Negative",
        plain: { value: "高くない" },
        polite: { value: "高くないです / 高くありません" },
      },
      {
        key: "past",
        label: "Past",
        plain: { value: "高かった", observed: true, note: "Seen here" },
        polite: { value: "高かったです" },
      },
      {
        key: "past-negative",
        label: "Past negative",
        plain: { value: "高くなかった" },
        polite: { value: "高くなかったです / 高くありませんでした" },
      },
    ]);
    expect(table?.otherRows).toEqual([
      { label: "Te-form", value: "高くて" },
      { label: "Adverbial", value: "高く" },
    ]);
  });

  it("generates a plain and polite core matrix for na-adjectives", () => {
    const table = generateJapaneseFormTable({
      language: "ja",
      category: "morphology",
      kind: "adjective",
      surface: "静かだった",
      lemma: "静か",
      adjectiveClass: "na",
      observedForm: "past",
      confidence: "high",
    });

    expect(table?.coreRows).toEqual([
      {
        key: "non-past",
        label: "Non-past",
        plain: { value: "静かだ" },
        polite: { value: "静かです" },
      },
      {
        key: "negative",
        label: "Negative",
        plain: { value: "静かじゃない / 静かではない" },
        polite: { value: "静かじゃありません / 静かではありません" },
      },
      {
        key: "past",
        label: "Past",
        plain: { value: "静かだった", observed: true, note: "Seen here" },
        polite: { value: "静かでした" },
      },
      {
        key: "past-negative",
        label: "Past negative",
        plain: { value: "静かじゃなかった" },
        polite: { value: "静かじゃありませんでした / 静かではありませんでした" },
      },
    ]);
    expect(table?.otherRows).toEqual([
      { label: "Before noun", value: "静かな" },
      { label: "Te-form", value: "静かで" },
      { label: "Adverbial", value: "静かに" },
    ]);
  });

  it("uses the high confidence threshold by default and allows explicit medium confidence generation", () => {
    const metadata = {
      language: "ja",
      category: "morphology",
      kind: "verb",
      surface: "飲んだ",
      lemma: "飲む",
      verbClass: "godan-mu",
      observedForm: "past",
      confidence: "medium",
    } as const;

    expect(generateJapaneseFormTable(metadata)).toBeNull();
    expect(generateJapaneseFormTable(metadata, { minConfidence: "medium" })).toMatchObject({
      kind: "verb",
      rows: expect.arrayContaining([
        { label: "Past", value: "飲んだ", observed: true, note: "Seen here" },
      ]),
    });
  });

  it("returns null for low confidence and unsupported metadata", () => {
    for (const metadata of unsupportedFallbackMetadata) {
      expect(generateJapaneseFormTable(metadata)).toBeNull();
    }
  });

  it("returns null when required class endings do not match the lemma", () => {
    expect(
      generateJapaneseFormTable({
        language: "ja",
        category: "morphology",
        kind: "verb",
        surface: "食べた",
        lemma: "食べる",
        verbClass: "godan-ku",
        observedForm: "past",
        confidence: "high",
      })
    ).toBeNull();

    expect(
      generateJapaneseFormTable({
        language: "ja",
        category: "morphology",
        kind: "adjective",
        surface: "静かだった",
        lemma: "静か",
        adjectiveClass: "i",
        observedForm: "past",
        confidence: "high",
      })
    ).toBeNull();
  });
});
