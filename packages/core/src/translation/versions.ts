// Bump this only when persisted translation rows need a new read/write
// contract, data upgrade behavior, or compatibility gate.
export const CURRENT_TRANSLATION_SCHEMA_VERSION = 1;

// Bump this for prompt-only enrichment quality changes that should lazily
// refresh cache rows without changing the persisted schema contract.
export const CURRENT_ENRICHMENT_PROMPT_VERSION = 5;

export type TranslationRefreshPolicy = "default" | "prefer_fresh" | "force";

export type TranslationStaleReason =
  | "schema_version"
  | "enrichment_prompt_version"
  | "force_refresh";

export interface TranslationVersionMetadata {
  translationSchemaVersion: number;
  enrichmentPromptVersion: number;
}

export interface TranslationVersionRequirement {
  minTranslationSchemaVersion?: number;
  minEnrichmentPromptVersion?: number;
  refreshPolicy?: TranslationRefreshPolicy;
}

export interface ResolvedTranslationVersionRequirement {
  minTranslationSchemaVersion: number;
  minEnrichmentPromptVersion: number;
  refreshPolicy: TranslationRefreshPolicy;
}

export function isPositiveIntegerVersion(value: unknown): value is number {
  return Number.isInteger(value) && typeof value === "number" && value > 0;
}

export function resolveTranslationVersionRequirement(
  requirement: TranslationVersionRequirement = {}
): ResolvedTranslationVersionRequirement {
  return {
    minTranslationSchemaVersion: Math.max(
      requirement.minTranslationSchemaVersion ?? CURRENT_TRANSLATION_SCHEMA_VERSION,
      CURRENT_TRANSLATION_SCHEMA_VERSION
    ),
    minEnrichmentPromptVersion: Math.max(
      requirement.minEnrichmentPromptVersion ?? CURRENT_ENRICHMENT_PROMPT_VERSION,
      CURRENT_ENRICHMENT_PROMPT_VERSION
    ),
    refreshPolicy: requirement.refreshPolicy ?? "default",
  };
}

export function getTranslationCacheStaleReason(
  metadata: {
    translationSchemaVersion: number | null | undefined;
    enrichmentPromptVersion: number | null | undefined;
  },
  requirement: ResolvedTranslationVersionRequirement
): TranslationStaleReason | null {
  if (requirement.refreshPolicy === "force") {
    return "force_refresh";
  }

  if (
    metadata.translationSchemaVersion == null ||
    metadata.translationSchemaVersion < requirement.minTranslationSchemaVersion
  ) {
    return "schema_version";
  }

  if (
    metadata.enrichmentPromptVersion == null ||
    metadata.enrichmentPromptVersion < requirement.minEnrichmentPromptVersion
  ) {
    return "enrichment_prompt_version";
  }

  return null;
}

export function isSavedPhraseStaleForTranslationUpdate(phrase: {
  translationSchemaVersion?: number | null;
  enrichmentPromptVersion?: number | null;
}): boolean {
  return (
    getTranslationCacheStaleReason(
      {
        translationSchemaVersion: phrase.translationSchemaVersion,
        enrichmentPromptVersion: phrase.enrichmentPromptVersion,
      },
      resolveTranslationVersionRequirement()
    ) != null
  );
}

export function isDraftFreshForSavedPhraseReplacement(draft: {
  translationSchemaVersion?: number | null;
  enrichmentPromptVersion?: number | null;
}): boolean {
  return (
    getTranslationCacheStaleReason(
      {
        translationSchemaVersion: draft.translationSchemaVersion,
        enrichmentPromptVersion: draft.enrichmentPromptVersion,
      },
      resolveTranslationVersionRequirement()
    ) == null
  );
}
