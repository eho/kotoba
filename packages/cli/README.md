# @edwinho/kotoba-cli

Kotoba command-line translator backed by `@edwinho/kotoba-core` and `@edwinho/kotoba-gemini`.

The CLI is a reference consumer of the public packages. `@edwinho/kotoba-core` supplies
language profiles and normalized draft contracts; `@edwinho/kotoba-gemini` sends the
text to Gemini and returns a sanitized `TranslationDraft`; the CLI validates
input, resolves the user's API key, and formats terminal output.

## Commands

```bash
kotoba translate [text] --to <ja|zh|ko> [--from en|auto] [--variant <variant>] [--format json|pretty|markdown]
```

Examples:

```bash
GEMINI_API_KEY=... kotoba translate "thanks for today" --to ja
GEMINI_API_KEY=... kotoba translate "thank you" --to ko --format json
echo "thanks" | GEMINI_API_KEY=... kotoba translate --to zh --variant cantonese-traditional --format markdown
```

## Flags

| Flag | Values | Default | Notes |
| --- | --- | --- | --- |
| `--to` | `ja`, `zh`, `ko` | required | Learning language to enrich. |
| `--from` | `auto`, `en` | `auto` | `en` rejects target-language input locally. |
| `--variant` | `mandarin-simplified`, `mandarin-traditional-taiwan`, `cantonese-traditional` | language default | Chinese only. |
| `--format` | `pretty`, `json`, `markdown` | `pretty` | Pretty output respects `NO_COLOR=1`. |
| `--api-key` | string | `GEMINI_API_KEY` | Prefer the environment variable so secrets do not enter shell history. |
| `--model` | string | `KOTOBA_GEMINI_MODEL` or package default | Overrides the Gemini model for evaluation. |

Human-readable `pretty` and `markdown` output includes enriched learning notes
when Gemini returns them: literal glosses, grammar notes, naturalness,
proficiency, study-token notes, variants, contrasts, examples, confusables, and
language-specific Cantonese or Korean notes. Use `--format json` when you need
the complete normalized `TranslationDraft` for another program.

## Environment

- `GEMINI_API_KEY`: required unless `--api-key` is supplied.
- `KOTOBA_GEMINI_MODEL`: optional model override.
- `NO_COLOR`: disables ANSI escape codes in pretty output.

## Privacy

The CLI sends input text directly to Gemini using your Gemini API key. It does
not log or persist the key.

Prefer the environment variable over `--api-key` to avoid storing secrets in
shell history.

## Development

```bash
bun run --cwd packages/cli build
bun run --cwd packages/cli typecheck
bun run --cwd packages/cli test
```
