export type PhraseFragmentKind =
  | "alternate"
  | "example"
  | "confusable"
  | "cantonese_colloquial"
  | "formal_written"
  | "register_variant"
  | "usage_contrast"
  | "structured_example";

export type PhraseFragmentSourcePath =
  | "alternateForm"
  | "enrichment.exampleSentence"
  | `enrichment.confusableAlternatives.${number}`
  | "enrichment.cantoneseExamples.colloquial"
  | "enrichment.cantoneseExamples.formalWritten"
  | `enrichment.registerVariants.${number}`
  | `enrichment.usageContrasts.${number}`
  | `enrichment.examples.${number}`;
