# Development

Kotoba uses Bun workspaces.

## Setup

```bash
bun install
```

## Repository Layout

```text
packages/core      # @edwinho/kotoba-core
packages/gemini    # @edwinho/kotoba-gemini
packages/cli       # @edwinho/kotoba-cli
scripts/           # repository checks
.github/workflows  # CI
```

## Verification

Run all checks from the repository root:

```bash
bun run build
bun run check:boundaries
bun run typecheck
bun run test
```

Package-level checks:

```bash
bun run --cwd packages/core typecheck
bun run --cwd packages/core test
bun run --cwd packages/gemini typecheck
bun run --cwd packages/gemini test
bun run --cwd packages/cli typecheck
bun run --cwd packages/cli test
```

CLI help smoke test:

```bash
bun packages/cli/dist/index.js translate --help
```

Optional live Gemini smoke test:

```bash
GEMINI_API_KEY=... bun packages/cli/dist/index.js translate "thanks for today" --to ja
```

## Build Output

Each package publishes generated ESM JavaScript and TypeScript declarations from
`dist/`. Build artifacts are intentionally ignored by git and regenerated before
release.

## Import Boundaries

`scripts/check-import-boundaries.ts` enforces package direction:

- `@edwinho/kotoba-core` must not import provider, CLI, mobile runtime, or Node/Bun runtime modules.
- `@edwinho/kotoba-gemini` must not import CLI or product runtime modules.
- `@edwinho/kotoba-cli` must not import product runtime or policy modules.

## Package Ownership

The core package should stay pure and framework-neutral. Provider logic belongs in `packages/gemini`. Terminal I/O belongs in `packages/cli`.

When a change affects multiple packages, update tests in the lowest package that owns the behavior and add integration coverage in dependents only where the contract crosses package boundaries.
