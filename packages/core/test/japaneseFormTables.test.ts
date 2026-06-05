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
    }
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
