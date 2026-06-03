import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

interface BoundaryRule {
  root: string;
  forbidden: RegExp;
  description: string;
}

const rules: BoundaryRule[] = [
  {
    root: "packages/gemini/src",
    forbidden: new RegExp(
      "apps/mobile|@kotoba/mobile|@edwinho/kotoba-cli|@kotoba/cli|expo(?:-|/)|react-native|@supabase|RevenueCat|react-native-purchases|expo-sqlite|zustand|drizzle-orm|drizzle-kit"
    ),
    description:
      "@edwinho/kotoba-gemini must not import app, mobile runtime, backend policy, storage, subscription, or CLI modules",
  },
  {
    root: "packages/core/src",
    forbidden: new RegExp(
      "@edwinho/kotoba-cli|@kotoba/cli|packages/cli|node:|bun|react-native|expo(?:-|/)"
    ),
    description: "@edwinho/kotoba-core must not import CLI or runtime modules",
  },
  {
    root: "packages/cli/src",
    forbidden: new RegExp(
      "apps/mobile|@supabase|RevenueCat|react-native-purchases|expo-sqlite|zustand|drizzle-orm|drizzle-kit"
    ),
    description: "@edwinho/kotoba-cli must not import private app, backend policy, storage, or subscription modules",
  },
];

const importLikePattern =
  /\b(?:import|export)\s+(?:type\s+)?(?:[^'"]*from\s+)?["']([^"']+)["']|require\(["']([^"']+)["']\)/g;

function listTypeScriptFiles(root: string): string[] {
  const files: string[] = [];

  for (const entry of readdirSync(root)) {
    const path = join(root, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".expo" || entry === "dist") {
        continue;
      }
      files.push(...listTypeScriptFiles(path));
      continue;
    }

    if (/\.(ts|tsx)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

const failures: string[] = [];

for (const rule of rules) {
  for (const file of listTypeScriptFiles(rule.root)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(importLikePattern)) {
      const specifier = match[1] ?? match[2] ?? "";
      if (rule.forbidden.test(specifier)) {
        failures.push(
          `${relative(process.cwd(), file)} imports "${specifier}" (${rule.description})`
        );
      }
    }
  }
}

if (failures.length > 0) {
  console.error("Import boundary check failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("Import boundary check passed.");
