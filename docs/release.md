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
- package-level `typecheck` and `test` scripts
- README examples using `@edwinho/*` package names

## Release Checks

Before publishing:

```bash
bun install
bun run check:boundaries
bun run typecheck
bun run test
bun packages/cli/src/index.ts translate --help
```

Use a live Gemini smoke test only with a safe test API key:

```bash
GEMINI_API_KEY=... bun packages/cli/src/index.ts translate "thanks for today" --to ja
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

The npm account or automation token must have permission to publish under `@edwinho`.

## Manual Publish Fallback

If publishing manually, publish in dependency order:

```bash
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
