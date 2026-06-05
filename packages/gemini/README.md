# @edwinho/kotoba-gemini

Gemini translation provider for Kotoba `TranslationDraft` data. It is framework-neutral and depends only on `@edwinho/kotoba-core` and `@google/genai`.

`@edwinho/kotoba-gemini` owns prompt construction, Gemini calls, response
parsing, warning metadata, and draft normalization. Callers own where the
package runs, how API keys are stored, and any auth, quota, cache, persistence,
or product policy around the request.

## API Key

The package does not read environment variables directly. Resolve the API key in the caller and pass it explicitly:

```ts
import { translateWithKotobaGemini } from "@edwinho/kotoba-gemini";

const result = await translateWithKotobaGemini(
  {
    inputText: "thanks for today",
    learningLanguage: "ja",
  },
  {
    apiKey: process.env.GEMINI_API_KEY ?? "",
  }
);
```

Callers may use `GEMINI_API_KEY`, a secret manager, or an explicit CLI flag. Missing keys throw a configuration error before any provider request is made.

## Privacy

Input text and draft context are sent to Gemini to generate enrichment. Do not pass secrets, credentials, or personal data that should not be processed by the provider. The package returns sanitized warnings and does not log API keys.

When used by `@edwinho/kotoba-cli`, the CLI sends the user's input text directly
to Gemini using the user's Gemini API key.

## Examples

Japanese:

```ts
const japanese = await translateWithKotobaGemini(
  { inputText: "I am hungry", learningLanguage: "ja" },
  { apiKey }
);
console.log(japanese.draft.targetText);
```

Mandarin:

```ts
const mandarin = await translateWithKotobaGemini(
  {
    inputText: "welcome",
    learningLanguage: "zh",
    chineseVariant: "mandarin-simplified",
  },
  { apiKey }
);
console.log(mandarin.draft.readingSystem);
```

Korean:

```ts
const korean = await translateWithKotobaGemini(
  { inputText: "thank you", learningLanguage: "ko" },
  { apiKey }
);
console.log(korean.draft.enrichment?.korean);
```

The default model is `gemini-2.5-flash-lite`. Pass `model` in the options object to override it for evaluation.

## Study Token Metadata

Japanese `draft.studyTokens` may include optional `metadata` for confident verb
and adjective tokens. The package asks Gemini for Phase 1 morphology metadata,
validates it through `@edwinho/kotoba-core`, preserves valid metadata on the
normalized draft, and drops malformed metadata with a warning while keeping the
token itself.

```ts
const result = await translateWithKotobaGemini(
  { inputText: "I drank tea", learningLanguage: "ja" },
  { apiKey }
);

const verbMetadata = result.draft.studyTokens.find(
  (token) => token.surface === "飲んだ"
)?.metadata;
```

Only Japanese verb and adjective metadata is supported in this phase. Gemini
does not return pre-rendered form tables; callers can pass validated metadata to
`generateJapaneseFormTable()` from `@edwinho/kotoba-core` after JFORM-002B
publishes package versions that include both the core metadata contract and this
Gemini normalization update.

## Development

```bash
bun run --cwd packages/gemini build
bun run --cwd packages/gemini typecheck
bun run --cwd packages/gemini test
```
