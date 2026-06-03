import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const packageDir = Bun.argv[2];

if (packageDir == null || packageDir.length === 0) {
  throw new Error("Usage: bun scripts/clean-package-dist.ts <package-dir>");
}

await rm(resolve(packageDir, "dist"), { force: true, recursive: true });
