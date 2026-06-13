# @edwinho/kotoba-gemini

Gemini translation provider for Kotoba `TranslationDraft` data. It is framework-neutral and depends only on `@edwinho/kotoba-core` and `@google/genai`.

`@edwinho/kotoba-gemini` owns prompt construction, Gemini calls, response
parsing, warning metadata, and draft normalization. Callers own where the
package runs, how API keys are stored, and any auth, quota, cache, persistence,
or product policy around the request.

## Provider Backends

The package does not read environment variables directly. Resolve provider
configuration in the caller and pass it explicitly.

### Gemini Developer API

The Developer API path is the default. Existing callers can keep passing only
`apiKey`; `provider: "developer_api"` is optional.

```ts
import { translateWithKotobaGemini } from "@edwinho/kotoba-gemini";

const result = await translateWithKotobaGemini(
  {
    inputText: "thanks for today",
    learningLanguage: "ja",
  },
  {
    provider: "developer_api",
    apiKey: process.env.GEMINI_API_KEY ?? "",
  }
);
```

Callers may use `GEMINI_API_KEY`, a secret manager, or an explicit CLI flag.
Missing keys throw a sanitized configuration error before any provider request
is made.

### Vertex AI

Use Vertex AI when Gemini requests should be billed through a Google Cloud
project. The package passes `vertexai: true`, `project`, `location`, and
`apiVersion` to `@google/genai`; `apiVersion` defaults to `"v1"`.

```ts
import { translateWithKotobaGemini } from "@edwinho/kotoba-gemini";

const result = await translateWithKotobaGemini(
  {
    inputText: "thanks for today",
    learningLanguage: "ja",
  },
  {
    provider: "vertex_ai",
    project: process.env.GOOGLE_CLOUD_PROJECT ?? "",
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "global",
  }
);
```

Pass `googleAuthOptions` when the runtime needs explicit credentials. When no
auth options are provided, `@google/genai` uses its normal runtime credential
behavior.

```ts
import { createKotobaGeminiClient } from "@edwinho/kotoba-gemini";

const client = createKotobaGeminiClient({
  provider: "vertex_ai",
  project: "kotoba-prod",
  location: "global",
  googleAuthOptions: {
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: serviceAccount.private_key,
    },
  },
});
```

Missing Vertex `project` or `location` values throw sanitized configuration
errors before any provider request is made. Successful translation results
return `provider: "gemini"` and `providerBackend` as either `"developer_api"` or
`"vertex_ai"` so callers can log the selected backend without changing the
translation draft contract.

## Privacy

Input text and draft context are sent to Gemini to generate enrichment. Do not pass secrets, credentials, or personal data that should not be processed by the provider. The package returns sanitized warnings and does not log API keys or Vertex credentials.

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

The default model is `gemini-2.5-flash-lite`. Pass `model` in the options
object to override it for evaluation. In live morphology evaluation,
`gemini-2.5-flash` produced cleaner Japanese adjective metadata and fewer JSON
reliability issues than `gemini-2.5-flash-lite`, at higher latency/cost. Keep
the default when cost and speed are the priority; consider `gemini-2.5-flash`
for Japanese morphology-sensitive paths or as a fallback after repeated JSON or
metadata-quality warnings.

## Study Token Metadata

Version `0.2.0` includes Gemini prompt, schema, and normalization support for
Japanese study-token metadata.

The provider asks Gemini to include `metadata` for every confident Japanese verb
or adjective study token, especially full inflected surfaces such as `食べます`
or `高かった`. The field remains nullable for non-Japanese tokens,
non-morphology tokens, and low-confidence analysis. The package validates
metadata through `@edwinho/kotoba-core`, preserves valid metadata on the
normalized draft, and drops malformed metadata with a warning while keeping the
token itself.

Gemini responses are still treated as provider output, not ground truth. The
provider layer retries malformed JSON once and can ask Gemini to repair missing
verb/adjective metadata once. Core then applies deterministic validation and
bounded Japanese morphology repairs. For example, if Gemini splits
`高くないです` into `高く` + `ない` + `です`, core can repair the metadata to the
full observed adjective form when the spans and adjective evidence are
contiguous. If the provider does not return enough reliable evidence, callers
should expect missing metadata rather than a guessed form table.

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
`generateJapaneseFormTable()` from `@edwinho/kotoba-core`.

For learner-facing UI, treat form tables as AI-assisted grammar support. They
are most reliable for common ichidan/godan verbs and common i-adjective and
na-adjective forms. Retain provider warnings in logs so bad translations,
unexpected tokenization, and repair failures can be audited.

## Development

```bash
bun run --cwd packages/gemini build
bun run --cwd packages/gemini typecheck
bun run --cwd packages/gemini test
```
