#!/usr/bin/env bun
import { runKotobaCli } from "./commands/translate";

export { runKotobaCli };
export type { KotobaCliIO, RunKotobaCliResult } from "./commands/translate";

declare const Bun: {
  stdin: {
    text(): Promise<string>;
  };
};
declare const process: {
  argv: string[];
  env: Record<string, string | undefined>;
  exit(code?: number): never;
  stdout: {
    write(value: string): void;
  };
  stderr: {
    write(value: string): void;
  };
};

if (import.meta.main) {
  const result = await runKotobaCli(process.argv.slice(2), {
    env: process.env,
    stdinText: () => Bun.stdin.text(),
    stdout: process.stdout,
    stderr: process.stderr,
  });
  process.exit(result.exitCode);
}
