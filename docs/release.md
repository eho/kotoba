# Release

Kotoba packages are published to npm under the `@edwinho` scope.

## Packages

Publication order follows dependency order:

1. `@edwinho/kotoba-core`
2. `@edwinho/kotoba-gemini`
3. `@edwinho/kotoba-cli`

Each package should include:

- `publishConfig.access = "public"`
- repository metadata pointing to `https://github.com/eho/kotoba`
- ESM JavaScript and TypeScript declarations under `dist/`
- package `files` limited to `dist` and `README.md`
- package-level `typecheck` and `test` scripts
- README examples using `@edwinho/*` package names

## Release Checks

Before publishing:

```bash
bun install
bun run build
bun run check:boundaries
bun run typecheck
bun run test
bun packages/cli/dist/index.js translate --help
npm pack --dry-run --ignore-scripts --json --workspace @edwinho/kotoba-core
npm pack --dry-run --ignore-scripts --json --workspace @edwinho/kotoba-gemini
npm pack --dry-run --ignore-scripts --json --workspace @edwinho/kotoba-cli
```

Use a live Gemini smoke test only with a safe test API key:

```bash
GEMINI_API_KEY=... bun packages/cli/dist/index.js translate "thanks for today" --to ja
```

## Changesets Flow

Create a changeset:

```bash
bun run changeset
```

Version packages:

```bash
bun run version-packages
bun install
```

Publish:

```bash
bun run release
```

`bun run release` builds all packages before running Changesets publish. The npm
account or automation token must have permission to publish under `@edwinho`.

## Manual Publish Fallback

If publishing manually, build once from the repository root, then publish in
dependency order:

```bash
bun run build

cd packages/core
npm publish --access public

cd ../gemini
npm publish --access public

cd ../cli
npm publish --access public
```

## Guardrails

- Publish only from a clean working tree.
- Do not publish operational docs, environment files, or production configuration.
- Do not add service credentials or default API keys.
- Keep the CLI path direct-to-Gemini with caller-owned credentials.
- Keep product-specific implementation details out of package releases.
