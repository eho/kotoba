# Package Boundary

Kotoba is published as a small package set for language-learning translation
workflows. Each package has a narrow runtime boundary so it can be used from
apps, servers, scripts, and CLIs without pulling in unrelated product
infrastructure.

## Included

### @edwinho/kotoba-core

Framework-neutral TypeScript contracts and utilities:

- language and variant profiles
- translation draft types
- learning-entry and study-token contracts
- enrichment sanitizers and normalizers
- phrase-fragment helpers
- cache-key and translation-version helpers

The core package is pure. It does not call Gemini, read environment variables, access files, render UI, use app storage, or import mobile runtime modules.

### @edwinho/kotoba-gemini

Gemini provider logic for producing normalized Kotoba translation drafts:

- prompt builders
- response schema construction
- provider request wrapper
- response parsing
- warning metadata
- draft normalization through `@edwinho/kotoba-core`

Callers must pass a Gemini API key explicitly. The package does not read `GEMINI_API_KEY` by itself and does not log API keys.

### @edwinho/kotoba-cli

A terminal consumer of the public packages:

- accepts argv text or stdin
- supports JSON, pretty, and Markdown output
- resolves `GEMINI_API_KEY` or `--api-key`
- calls Gemini directly through `@edwinho/kotoba-gemini`

## Scope

Kotoba's packages focus on framework-neutral translation contracts, provider
integration, and CLI usage. Product surfaces built on top of them own their UI,
storage, accounts, quotas, playback infrastructure, and release operations.

## Data Flow

CLI usage:

```text
user terminal
  -> @edwinho/kotoba-cli
  -> @edwinho/kotoba-gemini with the user's Gemini API key
  -> Gemini
```

Library usage:

```text
consumer app or script
  -> @edwinho/kotoba-core for contracts and normalization
  -> optionally @edwinho/kotoba-gemini with caller-owned provider credentials
```

The official Kotoba mobile app is one product built on this package model.

## Privacy

The CLI and Gemini package send input text to Gemini when translation is requested. Do not pass secrets, credentials, or personal data that should not be processed by the provider.

The packages do not persist API keys or log provider credentials.
