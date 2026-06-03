import type { SupportedLearningLanguage, TranslationDraft } from "@edwinho/kotoba-core";

export function formatJson(
  draft: TranslationDraft<SupportedLearningLanguage>
): string {
  return JSON.stringify(draft, null, 2);
}
