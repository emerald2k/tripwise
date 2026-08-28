import fs from "node:fs";
import path from "node:path";

import {
  itinerarySchema,
  citySchema,
  manifestSchema,
} from "../src/data/schema";

const DATA_DIR = path.resolve("src/data");

const FILES = {
  itinerary: "canada-2026.json",
  montreal: "montreal.json",
  quebec: "quebec-city.json",
  manifest: "manifest.json",
} as const;

type SchemaName = keyof typeof FILES;

function readJson(filename: string): unknown {
  const filePath = path.join(DATA_DIR, filename);

  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch (error) {
    throw new Error(
      `Invalid JSON in ${filename}: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

function printZodError(label: string, error: unknown): void {
  console.error(`\n❌ ${label}`);

  if (
    error &&
    typeof error === "object" &&
    "issues" in error &&
    Array.isArray(error.issues)
  ) {
    for (const issue of error.issues) {
      const issuePath =
        Array.isArray(issue.path) && issue.path.length > 0
          ? issue.path.join(".")
          : "<root>";

      console.error(`   ${issuePath}: ${issue.message}`);
    }

    return;
  }

  console.error(
    `   ${error instanceof Error ? error.message : String(error)}`
  );
}

function validate(
  name: SchemaName,
  schema: { parse: (value: unknown) => unknown }
): boolean {
  const filename = FILES[name];

  try {
    const data = readJson(filename);
    schema.parse(data);

    console.log(`✅ ${filename}`);
    return true;
  } catch (error) {
    printZodError(filename, error);
    return false;
  }
}

console.log("Tripwise DATA Zod validation");
console.log("============================");

const results = [
  validate("itinerary", itinerarySchema),
  validate("montreal", citySchema),
  validate("quebec", citySchema),
  validate("manifest", manifestSchema),
];

const passed = results.filter(Boolean).length;
const failed = results.length - passed;

console.log("\n============================");
console.log(`Passed: ${passed}/${results.length}`);
console.log(`Failed: ${failed}/${results.length}`);

if (failed > 0) {
  console.error("\n❌ DATA validation FAILED.");
  process.exit(1);
}

console.log("\n✅ DATA validation PASSED.");
process.exit(0);
