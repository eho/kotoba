# Kotoba

TypeScript packages for building language-learning translation workflows.

Kotoba turns short phrases into structured learning material: normalized
translation drafts, reading metadata, study tokens, language profiles, and
provider-backed enrichment. The packages are framework-neutral, so they can be
used from scripts, CLIs, servers, and apps that want consistent language-learning
data without adopting a full product stack.

## Kotoba Mobile App

<a href="https://apps.apple.com/app/id6761883207">
  <img src="assets/kotoba-app-icon.png" alt="Kotoba app icon" width="72" />
</a>

The official [Kotoba mobile app](https://kotobah.edwinho.net) uses this package
model for its language-learning core. The app is available on the
[App Store](https://apps.apple.com/app/id6761883207).

## Packages

- `@edwinho/kotoba-core` - language profiles, learning-entry contracts, translation draft types, normalizers, validators, cache keys, and version helpers.
- `@edwinho/kotoba-gemini` - Gemini prompt, schema, provider-call, parsing, warning, and draft-normalization logic. Callers pass their own Gemini API key.
- `@edwinho/kotoba-cli` - terminal translator built on the core and Gemini packages.

## Install

```bash
bun add @edwinho/kotoba-core
bun add @edwinho/kotoba-gemini
bun add -g @edwinho/kotoba-cli
```

## CLI

```bash
GEMINI_API_KEY=... kotoba translate "thanks for today" --to ja
GEMINI_API_KEY=... kotoba translate "thank you" --to ko --format json
echo "thanks" | GEMINI_API_KEY=... kotoba translate --to zh --variant cantonese-traditional --format markdown
```

The CLI sends input text directly to Gemini using your Gemini API key.

### Example Output

These examples assume `GEMINI_API_KEY` is set in your environment.

Japanese:

```bash
kotoba translate "I am hungry" --to ja
```

```text
お腹が空きました。
Reading: onaka ga sukimashita
Meaning: I am hungry.
Notes: polite | common | JLPT N5

Learning notes:
- Use: A natural way to say you are hungry.
- Literal: stomach became empty
- Best for: Plain statements about feeling hungry.
- Grammar (high): お腹: noun, stomach; が: particle, subject marker; 空きました: verb, became empty

Study tokens:
- お腹 (おなか): stomach [word]
- が: subject marker [grammar]
- 空きました (すきました): became empty; got hungry [word]

Examples:
- 昼ご飯の前にお腹が空きました。 (hirugohan no mae ni onaka ga sukimashita) - I got hungry before lunch.
```

Simplified Chinese:

```bash
kotoba translate "I am hungry" --to zh --variant mandarin-simplified
```

```text
我饿了。
Reading: wo3 e4 le5
Meaning: I am hungry.

Study tokens:
- 我: I; me
- 饿: hungry
- 了: completed-change particle
```

Cantonese:

```bash
kotoba translate "thank you" --to zh --variant cantonese-traditional
```

```text
多謝
Reading: do1 ze6
Meaning: Thank you.

Study tokens:
- 多謝: thank you
```

Korean:

```bash
kotoba translate "I am going now" --to ko
```

```text
저 지금 가요.
Reading: jeo jigeum gayo
Meaning: I am going now.
Register: polite

Study tokens:
- 저: I; me
- 지금: now
- 가요: go; going
```

## What This Is For

Use these packages when you want to:

- normalize provider output into stable language-learning contracts
- add Japanese, Chinese, or Korean translation enrichment to a tool or app
- keep provider prompts and response parsing separate from product code
- share language profiles, variants, cache keys, and validation logic across runtimes
- experiment from the terminal before integrating the libraries

See [Package Boundary](docs/package-boundary.md) for how the packages fit
together.

## Documentation

- [Documentation Index](docs/README.md)
- [Package Boundary](docs/package-boundary.md)
- [Language Support](docs/language-support.md)
- [Development](docs/development.md)
- [Release](docs/release.md)
- [Contributing](CONTRIBUTING.md)
- [Security](SECURITY.md)

## Development

```bash
bun install
bun run check:boundaries
bun run typecheck
bun run test
```

## License

MIT
