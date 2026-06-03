# Contributing

Thanks for helping improve Kotoba.

## Setup

```bash
bun install
bun run check:boundaries
bun run typecheck
bun run test
```

Use Bun for package scripts and dependency management.

## Package Boundaries

- `@edwinho/kotoba-core` must stay framework-neutral. It should not import Gemini,
  CLI, UI, file-system, or service code.
- `@edwinho/kotoba-gemini` owns Gemini prompt, schema, provider-call, parsing,
  warning, and draft-normalization logic.
- `@edwinho/kotoba-cli` is a terminal consumer of the public packages.

Run `bun run check:boundaries` before opening a pull request.

## Pull Requests

- Keep changes scoped to one package or behavior when possible.
- Add or update tests for contract, normalization, provider, and CLI behavior.
- Update package READMEs or docs when public APIs, supported languages, CLI flags,
  release steps, or data-flow expectations change.
- Do not include API keys, environment files, operational docs, service
  configuration, or product-only implementation details.

## Releases

Package releases use Changesets. For user-facing package changes, include a
changeset with:

```bash
bun run changeset
```

Maintainers publish packages under the `@edwinho` npm scope.
