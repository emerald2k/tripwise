# Tripwise DATA generation and validation

This document describes the recommended workflow for generating and validating Tripwise DATA.

The important rule is that `src/data/schema.ts` remains the canonical DATA contract. Do not duplicate
the Zod schema inside generation scripts.

## Quick start: adding a new itinerary

For a new itinerary, follow these steps:

1. Create the operational guide for the trip. This is the source for the intended itinerary content.
2. Create the itinerary and city JSON files in `staging/`, following `src/data/schema.ts` exactly:
   ```text
   staging/
     my-trip.json
     city-1.json
     city-2.json
   ```
3. Run the generation/integrity script:
   ```bash
   node scripts/generate-trip-data.mjs \
     --itinerary ./staging/my-trip.json \
     --city ./staging/city-1.json \
     --city ./staging/city-2.json \
     --out-dir ./src/data \
     --zod-command "npm run validate:data"
   ```
4. Review the generated files in `src/data/` and `generation-summary.json`.
5. Run the Zod validator explicitly:
   ```bash
   npm run validate:data
   ```
6. Continue only if the result is:
   ```text
   ✅ DATA validation PASSED.
   ```
7. Check `manifest.json` and add the new itinerary/city files if they are required by the application's package manifest.
8. Commit the changes only after the DATA validation passes.

The complete flow is:

```text
Operational guide
       ↓
staging/*.json
       ↓
generate-trip-data.mjs
       ↓
src/data/*.json
       ↓
npm run validate:data
       ↓
Zod PASS
       ↓
commit
```

Important: do not modify `schema.ts` just to make generated JSON pass validation. The JSON must be
constructed according to the existing Zod contract. If the application requirements genuinely need
a new DATA field, update the schema deliberately first, then update the generator and DATA files.

## 1. Prerequisites

From the project root, make sure Node.js and the project dependencies are installed:

```bash
npm install
```

The validation script is TypeScript and is intended to be executed with `tsx`.

If `tsx` is not already installed in the project, install it as a development dependency:

```bash
npm install -D tsx
```

The project should expose these scripts in `package.json`:

```json
{
  "scripts": {
    "validate:data": "tsx scripts/validate-data.ts"
  }
}
```

If the project already has a `validate:data` script, keep the existing implementation rather than
creating a duplicate command.

## 2. Files involved

The relevant files are:

```text
src/
  data/
    schema.ts
    canada-2026.json
    montreal.json
    quebec-city.json
    manifest.json

scripts/
  validate-data.ts
  generate-trip-data.mjs
```

`schema.ts` is the source of truth for the DATA structure.

`validate-data.ts` imports the real schemas from `src/data/schema.ts` and validates the JSON files
with Zod.

`generate-trip-data.mjs` is an optional generation/integrity helper. It does not replace Zod.

## 3. Validate existing JSON

From the project root:

```bash
npm run validate:data
```

The validator checks:

```text
canada-2026.json   → itinerarySchema
montreal.json      → citySchema
quebec-city.json   → citySchema
manifest.json      → manifestSchema
```

A successful run should look approximately like:

```text
Tripwise DATA Zod validation
============================
✅ canada-2026.json
✅ montreal.json
✅ quebec-city.json
✅ manifest.json

============================
Passed: 4/4
Failed: 0/4

✅ DATA validation PASSED.
```

The process exits with code `0` when everything passes.

If any file fails, the process exits with code `1`.

## 4. Understanding Zod errors

The validator prints the exact Zod path and error message.

For example:

```text
❌ canada-2026.json
   days.4.items.7.locationId: Invalid input: expected string, received undefined
```

This means:

```text
days
  → day index 4
    → items
      → item index 7
        → locationId
```

Fix the source JSON according to `src/data/schema.ts`, then run:

```bash
npm run validate:data
```

again.

Do not modify the validator to make an invalid JSON pass.

## 5. Recommended generation workflow

When creating or changing an itinerary, use a staging directory so that the source JSON can be
reviewed before replacing the application's DATA.

Example:

```text
staging/
  canada-2026.json
  montreal.json
  quebec-city.json
```

After the JSON has been generated or manually edited, run the generation/integrity helper:

```bash
node scripts/generate-trip-data.mjs   --itinerary ./staging/canada-2026.json   --city ./staging/montreal.json   --city ./staging/quebec-city.json   --out-dir ./src/data   --source ./docs/Ghid_Operational_Montreal_Quebec_3-12_Septembrie_2026_FINAL.docx   --airport-dates 2026-09-03,2026-09-11   --zod-command "npm run validate:data"
```

The command:

1. Reads the staging JSON files.
2. Checks duplicate `itemId` values.
3. Checks duplicate `locationId` values.
4. Checks that every referenced `locationId` exists in a city file.
5. Checks chronological ordering of days.
6. Checks chronological ordering of items inside each day.
7. Optionally checks special itinerary invariants, such as allowed airport dates.
8. Writes the canonical DATA files into `src/data`.
9. Writes `generation-summary.json`.
10. Runs the real project Zod validation when `--zod-command` is provided.

## 6. Airport-date example

For the Canada itinerary, the airport rule can be explicitly checked with:

```bash
--airport-dates 2026-09-03,2026-09-11
```

This means airport-related itinerary items are expected only on:

```text
2026-09-03  Arrival in Montréal
2026-09-11  Departure from Montréal
```

If an airport item accidentally appears on 2026-09-05, for example, the generation step reports it
as an unexpected airport date.

This is an additional business/integrity check. It is not a replacement for the Zod schema.

## 7. Recommended day-to-DATA process

For future itinerary updates, follow this order:

```text
Operational guide
       ↓
Review / reconcile the daily itinerary
       ↓
Generate or edit staging JSON
       ↓
generate-trip-data.mjs
       ↓
Cross-file integrity checks
       ↓
src/data/*.json
       ↓
npm run validate:data
       ↓
Zod validation
       ↓
generation-summary.json
```

The operational guide should be the source for the intended travel plan.

`schema.ts` should be the source for what the application is allowed to store.

The generated JSON must satisfy both.

## 8. Adding a new city

If another city is added:

```text
staging/
  canada-2026.json
  montreal.json
  quebec-city.json
  new-city.json
```

Run the generator with another `--city` argument:

```bash
node scripts/generate-trip-data.mjs   --itinerary ./staging/canada-2026.json   --city ./staging/montreal.json   --city ./staging/quebec-city.json   --city ./staging/new-city.json   --out-dir ./src/data   --zod-command "npm run validate:data"
```

The new city must still satisfy the application's `citySchema`.

## 9. Updating generation-summary.json

`generation-summary.json` should be generated by the generation workflow, not manually edited.

It records information such as:

```json
{
  "itineraryId": "canada-2026",
  "days": 10,
  "items": 195,
  "locations": 77,
  "cityFiles": 2,
  "validation": {
    "structural": "pass",
    "zod": "pass"
  }
}
```

The exact values depend on the current DATA files.

The summary is a report about generation/validation. It is not part of the Zod DATA contract unless
the application schema explicitly includes it.

## 10. Troubleshooting

### `tsx: command not found`

Install it:

```bash
npm install -D tsx
```

Then run:

```bash
npm run validate:data
```

### `Cannot find module ../src/data/schema`

Run the command from the project root and verify that:

```text
src/data/schema.ts
```

exists.

### JSON parsing error

The file contains invalid JSON. Check it with your editor or a JSON parser before investigating Zod.

### Zod validation error

Do not change the validator first. Inspect the error path and compare the offending data with
`src/data/schema.ts`.

### Location reference error

If an itinerary item contains:

```json
{
  "locationId": "some-location"
}
```

then `some-location` must exist in one of the city JSON files and satisfy the application's
`locationSchema`.

## 11. Final pre-commit checklist

Before committing DATA changes:

```bash
npm run validate:data
```

Then verify:

```text
[ ] Operational guide matches the intended itinerary
[ ] JSON uses only fields allowed by schema.ts
[ ] No duplicate itemId
[ ] No duplicate locationId
[ ] All itinerary locationId references exist
[ ] Days are chronological
[ ] Items inside each day are chronological
[ ] Fixed flights/trains match the guide
[ ] Special business rules have been checked
[ ] Zod validation passes
[ ] generation-summary.json reflects the generated DATA
```

The generator is an integrity and assembly helper. The application's Zod schema remains the final
authority for DATA validity.
