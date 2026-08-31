# tripwise

PWA travel guide with offline capabilities for itineraries, daily planning, search, and local progress.

> **One glance. One decision. One action.**

Tripwise is a minimalist, mobile-first travel guide. It renders a pre-built itinerary from versioned JSON DATA, helps the user understand what is relevant now, and lets the user manually track progress locally.

The application is deliberately not a trip-planning engine. Travel decisions are made while authoring the DATA. The runtime application executes and displays that DATA.

---

# Table of Contents

1. [Product Philosophy](#product-philosophy)
2. [Source of Truth](#source-of-truth)
3. [Architecture](#architecture)
4. [Technology Stack](#technology-stack)
5. [Why These Technologies](#why-these-technologies)
6. [Repository Structure](#repository-structure)
7. [Getting Started](#getting-started)
8. [NPM Scripts](#npm-scripts)
9. [Environment and Debug Mode](#environment-and-debug-mode)
10. [DATA Architecture](#data-architecture)
11. [JSON DATA Structure](#json-data-structure)
12. [Generating Itinerary DATA](#generating-itinerary-data)
13. [DATA Authoring Rules](#data-authoring-rules)
14. [Zod Validation](#zod-validation)
15. [Adding a City](#adding-a-city)
16. [Adding a Location](#adding-a-location)
17. [Adding a Day](#adding-a-day)
18. [Adding Progress-Trackable Items](#adding-progress-trackable-items)
19. [Progress System](#progress-system)
20. [Today and CURRENT](#today-and-current)
21. [Days](#days)
22. [Search](#search)
23. [Routing](#routing)
24. [Google Maps](#google-maps)
25. [Sharing](#sharing)
26. [Internationalization](#internationalization)
27. [PWA and Offline](#pwa-and-offline)
28. [Caching and DATA Updates](#caching-and-data-updates)
29. [Responsive UX](#responsive-ux)
30. [Accessibility](#accessibility)
31. [Testing](#testing)
32. [Development Workflow](#development-workflow)
33. [Git and DATA Changes](#git-and-data-changes)
34. [Netlify Deployment](#netlify-deployment)
35. [Troubleshooting](#troubleshooting)
36. [Coding-Agent Instructions](#coding-agent-instructions)
37. [KISS Rules](#kiss-rules)
38. [Non-Goals](#non-goals)
39. [Implementation Checklist](#implementation-checklist)

---

# White-Label Product Model

`tripwise` is the technical product, repository, and reusable white-label travel-guide engine.

The current application build is branded:

```text
Product / Engine: tripwise
Repository: tripwise
Package / Project: tripwise
Application Brand: Volala
Deployment: volala.netlify.app
```

The production site is reachable at `https://volala.netlify.app/`; its
currently deployed bundle remains the pre-Phase-1 Voya version until the
Phase 1 branch is published and deployed.

The application brand is configuration-driven and must not be hardcoded into core application logic.

For MVP, white-label support is intentionally minimal. A static build/deployment configuration is sufficient.

```text
tripwise
   ↓
brand configuration
   ↓
Voya
```

A future deployment could use a different brand without changing the core application.

Do not introduce:

- backend tenant management;
- runtime branding services;
- CMS;
- database-backed configuration;
- complex multi-tenant architecture.

Brand configuration is presentation configuration. It must not contain itinerary decisions, travel-planning logic, or user progress.

# Development Roadmap

The project is developed through sequential milestone phases with a mandatory quality gate between phases.

See [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md) for the complete roadmap.

A phase can be closed only after:

- implementation is complete;
- automated tests pass;
- DATA validation passes where applicable;
- production build passes;
- manual validation passes;
- regression validation passes;
- acceptance criteria pass;
- no known blocking defects remain.

Current phase: **Phase 5 — SEARCH, SETTINGS, AND LOCALIZATION — COMPLETED;
READY FOR THE NEXT PHASE**.

Phase 5 is formally accepted on
`phase/5-search-settings-localization` at version `0.5.0`. It includes
active-itinerary search, Settings, RO/EN language persistence, and a compact
install-awareness prompt that explains the offline benefit and links to
Settings. The prompt is informational only; the existing Settings → PWA
Install control remains the canonical mechanism that performs installation.
The prompt resolves its visible application name from `brand.name`; the
primary bottom navigation uses comfortable mobile touch targets and the
canonical `public/icon.svg` asset is referenced by the favicon and manifest.
Gate 5: Utility UX PASS. Desktop, mobile, and real PWA installation manual
validation passed; Phase 6 has not started.

No later phase should be used to bypass an unresolved quality gate.

# Product Philosophy

Tripwise follows a strict KISS approach.

The primary UX principle is:

> **One glance. One decision. One action.**

The application should feel like a calm travel companion rather than a dashboard.

The application:

- shows the itinerary;
- tells the user what the itinerary recommends now;
- provides the next planned information;
- allows the user to mark things as DONE or SKIP;
- remembers that progress locally;
- opens Google Maps when a verified link exists;
- works offline after required resources have been cached.

The application does not:

- tell the user what they must do;
- monitor their physical location;
- determine whether they actually visited something;
- judge whether they are late;
- calculate whether they are following the itinerary;
- dynamically re-plan the trip;
- make tourist decisions.

The user remains in control.

---

# Source of Truth

There are two different sources of truth with different responsibilities.

## SRS.md

`SRS.md` is the product and technical requirements specification.

It defines:

- product behavior;
- UX decisions;
- architecture direction;
- data philosophy;
- progress behavior;
- routing;
- PWA behavior;
- testing strategy;
- non-goals;
- KISS constraints.

When a product or architectural question arises, read `SRS.md` first.

## JSON DATA

JSON files are the source of truth for the actual itinerary content.

They define:

- cities;
- locations;
- dates;
- times;
- itinerary items;
- transport;
- walking distances;
- walking durations;
- descriptions;
- Google Maps links;
- other travel information.

The application must not invent itinerary content at runtime.

Conceptually:

```text
SRS.md
  ↓
defines how the application behaves

JSON DATA
  ↓
defines what the itinerary contains

React application
  ↓
renders and executes both
```

---

# Architecture

Tripwise intentionally uses a thin client-side architecture.

```text
                    ┌──────────────────┐
                    │   JSON DATA      │
                    │ itinerary/cities │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │  Zod Validation  │
                    └────────┬─────────┘
                             │
                             ▼
                    ┌──────────────────┐
                    │ Typed DATA Model │
                    └────────┬─────────┘
                             │
              ┌──────────────┼──────────────┐
              ▼              ▼              ▼
         React UI        Domain Logic    Local State
              │              │              │
              └──────────────┼──────────────┘
                             ▼
                    Browser / PWA APIs
```

Runtime logic is deliberately limited to:

- rendering;
- date/time resolution;
- CURRENT resolution;
- local progress;
- search;
- navigation;
- language;
- offline/cache behavior;
- native browser actions.

Travel planning remains outside the runtime application.

---

# Technology Stack

## React

React is the UI framework.

It is used for:

- application shell;
- pages;
- timeline;
- progress controls;
- Settings;
- Search;
- reusable UI components.

The UI should remain componentized enough to be maintainable, but not fragmented into dozens of unnecessary abstractions.

## TypeScript

TypeScript provides:

- compile-time type safety;
- safer DATA handling;
- better editor support;
- safer domain logic;
- safer refactoring.

Types should preferably be inferred from Zod schemas.

```text
Zod schema
    ↓
z.infer
    ↓
TypeScript type
```

Avoid maintaining duplicate interfaces when inference is sufficient.

## Vite

Vite provides:

- development server;
- fast development feedback;
- production build;
- environment handling;
- modern frontend bundling.

No custom bundler configuration should be introduced unless required.

## React Router

React Router handles:

```text
/
/days
/search
/settings
/day/:date
```

Browser History is used normally.

There is no custom navigation stack.

## Zod

Zod validates external DATA at runtime.

TypeScript alone cannot validate JSON received at runtime. Zod provides the runtime boundary.

```text
JSON
 ↓
Zod
 ↓
trusted application DATA
```

## Fuse.js

Fuse.js provides local fuzzy search.

Search is deliberately day-oriented.

The user searches the active itinerary and receives relevant days, not individual location search results.

## Vitest

Vitest is used for pure domain and utility behavior.

Examples:

- CURRENT;
- date classification;
- progress;
- local persistence;
- search;
- DATA validation.

## Playwright

Playwright tests real user journeys.

Examples:

- open Today;
- navigate Days;
- Search;
- DONE/SKIP;
- reload;
- language switching;
- offline shell;
- navigation links.

## Service Worker

The Service Worker enables offline application behavior.

It works with Cache Storage.

## Cache Storage

Cache Storage is used for:

- application assets;
- DATA;
- icons;
- thumbnails;
- other cacheable application resources.

## localStorage

`localStorage` is sufficient for the small amount of persistent client state required by MVP.

Persist:

```text
activeItineraryId
language
progress
```

Do not use IndexedDB unless a concrete future requirement makes it necessary.

## Web Share API

The native Web Share API is preferred over a custom sharing system.

If unavailable, use Copy Link.

## Browser APIs

Prefer native platform capabilities whenever possible:

- `navigator.language`
- local date/time
- `navigator.onLine`
- `matchMedia`
- `prefers-reduced-motion`
- `navigator.share`
- History API
- Service Worker
- Cache Storage
- localStorage

## Netlify

Netlify hosts the static PWA.

No backend is required.

---

# Why These Technologies

The stack is intentionally small.

| Technology     | Purpose                | Reason                                    |
| -------------- | ---------------------- | ----------------------------------------- |
| React          | UI                     | Mature, simple component model            |
| TypeScript     | Types                  | Safer development                         |
| Vite           | Build                  | Fast, minimal frontend tooling            |
| React Router   | Routing                | Simple client-side routes                 |
| Zod            | Runtime validation     | Protects against invalid JSON             |
| Fuse.js        | Search                 | Small local fuzzy search solution         |
| Vitest         | Unit/domain tests      | Fast                                      |
| Playwright     | E2E                    | Real browser behavior                     |
| Service Worker | Offline                | Native browser capability                 |
| Cache Storage  | Cache                  | Native browser capability                 |
| localStorage   | Small persistent state | Enough for MVP                            |
| Web Share API  | Sharing                | Native OS/browser sharing                 |
| Netlify        | Hosting                | Static deployment with simple SPA support |

Do not add another library simply because it is popular.

---

# Repository Structure

The intended repository structure is approximately:

```text
tripwise/
├── .github/
│   └── copilot-instructions.md
│
├── data/
│   ├── itineraries/
│   │   └── canada-2026.json
│   │
│   └── cities/
│       ├── montreal.json
│       ├── quebec-city.json
│       └── ottawa.json
│
├── i18n/
│   ├── ro.json
│   └── en.json
│
├── public/
│   ├── icons/
│   ├── manifest.webmanifest
│   └── ...
│
├── src/
│   ├── config/
│   │   └── brand.ts
│   ├── components/
│   ├── data/
│   ├── domain/
│   ├── hooks/
│   ├── pages/
│   ├── i18n/
│   ├── lib/
│   ├── styles/
│   └── main.tsx
│
├── tests/
│   ├── unit/
│   └── e2e/
│
├── SRS.md
├── README.md
├── package.json
├── vite.config.ts
├── tsconfig.json
├── playwright.config.ts
├── vitest.config.ts
└── netlify.toml
```

The exact source directory organization may evolve during implementation.

The important rule is:

> Keep responsibilities clear without creating unnecessary layers.

---

# Getting Started

## Requirements

Use a current LTS version of Node.js compatible with the project configuration.

Verify:

```bash
node --version
npm --version
```

## Clone

```bash
git clone <repository-url>
cd tripwise
```

## Install dependencies

```bash
npm install
```

## Start development

```bash
npm run dev
```

Vite will print the local development URL.

Open it in the browser.

## Production build

```bash
npm run build
```

## Preview production build

```bash
npm run preview
```

---

# NPM Scripts

The project should expose a small, explicit set of scripts.

Typical scripts:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "validate:data": "...",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

The exact commands may vary with the final implementation.

## `npm run dev`

Starts the development server.

## `npm run build`

Runs the production build.

The build must fail if TypeScript or production compilation fails.

## `npm run preview`

Serves the production build locally.

This is useful for checking:

- routing;
- PWA behavior;
- production-only behavior;
- asset paths.

## `npm run validate:data`

Validates all JSON DATA using Zod and additional structural checks.

This should be run before committing DATA changes.

## `npm test`

Runs Vitest.

## `npm run test:watch`

Runs Vitest in watch mode during development.

## `npm run test:e2e`

Runs Playwright browser tests.

## Development Quality Workflow

Husky provides local checks before changes are committed or pushed:

```text
git commit
    ↓
pre-commit
    ↓
lint-staged
    ↓
ESLint + Prettier

commit message
    ↓
commit-msg
    ↓
Commitlint / Conventional Commits

git push
    ↓
pre-push
    ↓
npm run verify
```

`lint-staged` checks only staged source and configuration files; authored DATA JSON is excluded. `npm run verify` runs the complete local quality sequence: typecheck, lint, formatting, DATA validation, unit tests, E2E tests, and production build.

Run `npm run test:coverage` to measure Vitest coverage with the V8 provider. Coverage is currently informational and has no blocking threshold.

If a hook fails, read the reported command output, fix the issue, and rerun the failed command (or `npm run verify`) before committing or pushing again.

## CI Quality Gate

GitHub Actions runs the same `npm run verify` quality gate for every push and pull request. The workflow installs dependencies with `npm ci`, installs the Chromium browser required by Playwright, and blocks the job on typecheck, ESLint, Prettier, DATA validation, unit/component tests, E2E/accessibility tests, or the production build. It also runs `npm run test:coverage` for informational coverage output and reports production dependency vulnerabilities with `npm audit` without changing dependencies.

## Git Governance

Tripwise uses lightweight GitHub Flow with a dedicated `phase/*` branch for
every Development Phase. Each Phase Branch starts from the latest accepted
`master` state. Optional short-lived `feature/*`, `fix/*`, `test/*`,
`refactor/*`, `chore/*`, `docs/*`, `perf/*`, `build/*`, and `ci/*` Task
Branches must merge into their Phase Branch, never directly into `master`.
After the Phase Quality Gate passes, the Phase Branch is squash-merged into
`master` and deleted.

Use lowercase, descriptive, hyphen-separated branch names, Conventional
Commits, and `npm run verify` before pushing. The complete branching, merge,
release, and GitHub protection policy is maintained in the
[Git Governance section of the development roadmap](./DEVELOPMENT_ROADMAP.md#git-governance).

---

# Environment and Debug Mode

Environment variables are not currently required for local development,
testing, GitHub Actions, or Netlify production.

`VITE_DEBUG` is a conceptual, inactive future option. The current application
does not consume it, and no `.env` file is required.

Conceptually:

```text
VITE_DEBUG=true
```

Debug information may include:

- Zod errors;
- JSON parsing errors;
- stack traces;
- local progress;
- cache state;
- routing state;
- development diagnostics.

Production must not expose technical debug information.

If a future debug mode is implemented, its output should be guarded using both:

```text
import.meta.env.DEV
```

and the debug flag.

Do not expose a production debug switch in the UI.

## Development logging

Use native console methods:

```text
console.debug()
console.info()
console.warn()
console.error()
```

No external logging or monitoring service is required for MVP.

---

# DATA Architecture

The DATA layer is intentionally simple and strict.

```text
Itinerary
  ↓
Days
  ↓
Items
  ├── Location Item → locationId → City DATA
  └── Transport Item → transport
```

`tripwise` is the white-label engine. Itinerary DATA is authored outside the runtime application. For the current deployment, the generated trip is `Canada 2026` and the application brand is `Volala`.

```text
data/
├── manifest.json
├── itineraries/
│   └── canada-2026.json
└── cities/
    ├── montreal.json
    └── quebec-city.json
```

# JSON DATA Structure

The canonical schema is defined in `src/data/schema.ts` and must be implemented with strict Zod validation. Unknown fields are invalid.

## Itinerary

Required fields:

```json
{
  "id": "canada-2026",
  "name": "Canada 2026",
  "journey": {
    "departureDate": "2026-09-03",
    "destinationArrivalDate": "2026-09-03"
  },
  "days": []
}
```

`journey.departureDate` and `journey.destinationArrivalDate` are required
calendar dates (`YYYY-MM-DD`). The departure date must match the first
itinerary day and cannot be after destination arrival.

`days` contains at least one `Day`.

## Day

```json
{
  "date": "2026-09-05",
  "title": "Olympic Park 50th Anniversary + Downtown",
  "items": []
}
```

`date` and `items` are required. `title` is optional. A Day has no `cityId`.

## Location Item

```json
{
  "itemId": "sep04-notredame",
  "startTime": "10:20",
  "title": "Notre-Dame Basilica",
  "locationId": "montreal-notre-dame-basilica",
  "durationMinutes": 50,
  "progress": true
}
```

`progress` is optional but, when present, must be `true`. It is the only way a location item becomes progress-trackable.

## Transport Item

```json
{
  "itemId": "sep04-darmes-pac",
  "startTime": "11:30",
  "title": "Place d'Armes → Pointe-à-Callière",
  "transport": {
    "mode": "walk",
    "distanceMeters": 400,
    "durationMinutes": 5
  }
}
```

Transport items never have `locationId` or `progress`.

Allowed modes:

```text
walk
metro
bus
train
tram
taxi
car
flight
```

Distance and duration are optional when the source guide does not provide numeric values.

## Location

```json
{
  "locationId": "montreal-notre-dame-basilica",
  "name": "Notre-Dame Basilica",
  "category": "attraction",
  "googleMapsUrl": "https://www.google.com/maps/..."
}
```

Required fields are `locationId`, `name`, and `category`.

Optional fields are `address`, `description`, `coordinates`, and `googleMapsUrl`.

Allowed categories:

```text
attraction
restaurant
hotel
nightlife
activity
airport
station
other
```

## Source fidelity

The uploaded operational guide is the source for the Canada DATA. Do not invent times, distances, coordinates, events, or attractions when converting the guide to JSON.

The guide's detailed 5 September table names Olympic Park as the day's central objective but does not provide a concrete timed Olympic Park row. The JSON therefore does not invent a start time for that objective.

# DATA IDs

IDs are part of the DATA compatibility contract.

## `locationId`

`locationId` is globally unique across all city DATA.

Example:

```text
montreal-olympic-park
montreal-old-port-montreal
quebec-city-chateau-frontenac
```

## `itemId`

`itemId` identifies an itinerary item and must be unique within the itinerary.

Keep it stable when the logical item remains the same. Local progress depends on this stability.

> Same logical item = same stable ID.

# Generating Itinerary DATA

DATA is generated outside the runtime application.

For the Canada trip, the assistant generates the itinerary DATA according to the travel rules established in the project.

The generation workflow is:

```text
Travel research
      ↓
Itinerary planning
      ↓
Location verification
      ↓
Walking/transport decisions
      ↓
Google Maps URL verification
      ↓
JSON generation
      ↓
Zod validation
      ↓
Tests
      ↓
Git commit
```

The application does not perform the planning step.

## DATA generation rules

When generating DATA:

1. Group activities geographically where practical.
2. Prefer walking between nearby locations.
3. Use predefined walking distance/time.
4. Avoid unnecessary city crossing.
5. Use public transport where the planned walking route would be impractical.
6. Define realistic start times and durations.
7. Include verified Google Maps links where useful.
8. Use stable IDs.
9. Avoid duplicate location records.
10. Keep optional fields optional.
11. Do not add fields that are not part of the schema.
12. Validate every generated file.

These are DATA authoring rules, not runtime algorithms.

---

# DATA Authoring Example

Conceptual example:

```json
{
  "date": "2026-09-05",
  "items": [
    {
      "itemId": "olympic-park-visit",
      "locationId": "olympic-park",
      "startTime": "10:30",
      "durationMinutes": 30,
      "progress": true
    },
    {
      "itemId": "walk-to-old-port",
      "startTime": "11:00",
      "transport": {
        "mode": "walk",
        "distanceMeters": 350,
        "durationMinutes": 5
      }
    },
    {
      "itemId": "old-port-visit",
      "locationId": "old-port-montreal",
      "startTime": "11:05",
      "progress": true
    }
  ]
}
```

This is illustrative. The actual JSON must match the implemented Zod schema.

---

# DATA Authoring: Units

Use metric European units.

Technical DATA values:

```text
distanceMeters
durationMinutes
```

Examples:

```text
350 m
1200 m
5 min
75 min
```

The UI may format normalized technical values:

```text
1200 m → 1.2 km
75 min → 1 h 15 min
```

This is presentation formatting, not a change to itinerary DATA.

Business/content values are displayed exactly as authored.

For example:

```text
25 CAD
€18
$20
```

No currency conversion is performed.

---

# DATA Authoring: Google Maps

A location may contain:

```json
{
  "googleMapsUrl": "..."
}
```

The URL must be verified during DATA authoring.

Do not add a fake URL.

If there is no reliable Google Maps URL:

```text
omit googleMapsUrl
```

The application will simply not display the navigation button.

---

# DATA Authoring: Optional Fields

Optional fields should remain optional.

Do not use placeholder values such as:

```json
{
  "durationMinutes": 0,
  "googleMapsUrl": "",
  "description": "N/A"
}
```

Prefer:

```json
{
  "locationId": "example"
}
```

and only add information that exists.

---

# DATA Authoring: No Runtime Planning

Never move logic like this into React:

```text
if walking > 30 minutes:
    choose metro
```

That is itinerary authoring logic.

Instead, the generated DATA should already say:

```text
transport.mode = "metro"
```

The application displays the decision.

This distinction is fundamental.

---

# Zod Validation

All DATA must pass Zod validation before it is considered valid.

Conceptually:

```text
JSON
 ↓
parse
 ↓
Zod
 ↓
cross-reference validation
 ↓
consistency validation
 ↓
valid DATA
```

## Validation should check

- JSON syntax;
- schema shape;
- required fields;
- optional fields;
- unique IDs;
- valid references;
- dates;
- times;
- URLs;
- transport modes;
- numeric ranges;
- chronological consistency;
- valid `progress` usage.

## Cross references

Examples:

```text
item.locationId
       ↓
must exist in location DATA
```

```text
day.cityId
       ↓
must exist where the schema requires it
```

## Validation command

```bash
npm run validate:data
```

A failed validation must produce a non-zero process exit code.

That allows CI and Git workflows to detect invalid DATA.

---

# Adding a City

To add a city:

1. Create the city DATA file.
2. Add its locations.
3. Assign stable unique `locationId` values.
4. Add Google Maps URLs where available.
5. Reference those locations from itinerary DATA.
6. Run validation.
7. Run tests.
8. Build the application.

Example:

```text
data/cities/ottawa.json
```

The React application should require no Ottawa-specific code.

Adding a city is a DATA operation, not an application-code operation.

---

# Adding a Location

When adding a location:

```json
{
  "locationId": "rideau-canal",
  "name": "Rideau Canal",
  "description": "...",
  "category": "visit",
  "googleMapsUrl": "..."
}
```

Rules:

- use a stable `locationId`;
- do not duplicate an existing location;
- use the actual location name;
- include only known data;
- verify the Google Maps URL;
- validate the JSON.

---

# Adding a Day

To add a day:

1. Add the date.
2. Add itinerary items in chronological order.
3. Reference existing locations where possible.
4. Add transport segments where required.
5. Add walking distances and times from the authored itinerary.
6. Mark only genuinely trackable items with `progress: true`.
7. Validate.

Example:

```json
{
  "date": "2026-09-07",
  "items": [
    {
      "itemId": "old-quebec",
      "locationId": "old-quebec",
      "startTime": "09:30",
      "durationMinutes": 90,
      "progress": true
    }
  ]
}
```

---

# Adding Progress-Trackable Items

Use:

```json
{
  "progress": true
}
```

only when the user should be able to mark the item as completed/skipped.

Do not use:

```json
{
  "progress": false
}
```

Absence of `progress` means the item is informational.

Examples that may be trackable:

```text
museum visit
restaurant
activity
nightlife
attraction
```

Examples that may be informational:

```text
walking segment
transport segment
flight information
general note
```

The final choice is DATA authoring, not runtime inference.

---

# Progress System

Progress is local and individual.

It is not stored in the itinerary JSON.

Conceptually:

```text
DATA
  ↓
planned itinerary

localStorage
  ↓
what this user says they did
```

## Item states

```text
missing status → pending
done
skipped
```

No explicit `pending` value is stored.

## DONE

The user manually confirms:

```text
DONE
```

The application stores:

```text
done
```

## SKIP

The user manually confirms:

```text
SKIP
```

The application stores:

```text
skipped
```

## UNDO

Undo removes the stored status.

```text
done → pending
skipped → pending
```

## Timing

DONE and SKIP can be used at any time.

The application does not prevent:

```text
DONE at 09:00
for an item scheduled at 14:00
```

The user is authoritative about what they actually did.

---

# Today and CURRENT

Today is the only time-aware day.

Day classification uses the device's local date:

```text
day.date < local date → past
day.date = local date → today
day.date > local date → future
```

CURRENT uses the device's local time.

Eligible items:

```text
progress === true
AND
status is not done
AND
status is not skipped
AND
startTime <= current local time
```

CURRENT is the latest eligible item chronologically.

## Before the first item

Show:

```text
UP NEXT
```

There is no separate NEXT card.

## After manual intervention

If the user marks an item DONE or SKIP:

```text
save status
 ↓
recalculate CURRENT
```

If the next eligible item is still in the future, it remains:

```text
UP NEXT
```

Do not artificially move the schedule forward.

## No completion inference

The application must never do:

```text
startTime passed
→ automatically mark DONE
```

Time determines relevance, not completion.

---

# Today Auto-scroll

Today scrolls to CURRENT:

- when Today is initially opened;
- when CURRENT genuinely changes.

It does not scroll on every render.

Use smooth scrolling where appropriate.

Respect:

```text
prefers-reduced-motion
```

When reduced motion is requested, use direct scrolling.

Other days do not auto-scroll.

---

## Location Item presentation

Location Items present their content in this order:

1. Title
2. Primary description
3. Secondary description
4. Suggested visit duration
5. Actions

The secondary description is the location address and uses a smaller font size
than the primary description. Duration uses the compact duration format, while
progress, Maps navigation, and sharing actions retain their existing
eligibility rules.

The estimated visit duration is displayed as right-aligned metadata in the
Location Item title row, accompanied by a small decorative clock icon. It is
omitted with the clock when no valid duration is available.

All applicable Location Item actions remain in one horizontal row across
supported viewport widths. Location Share is intentionally a minimal,
transparent icon action.

## Active Location Items

A Location Item's temporary active state starts at its explicit `startTime`
and ends exclusively at the next Location Item's `startTime` on the same day.
For the final Location Item only, a valid `durationMinutes` value supplies the
end boundary. Transport Items are ignored. All simultaneously active Location
Items are highlighted, while the first in DATA order is the one automatic
scroll target; no active item means no automatic scroll. Active state is not
persisted, and explicit Search navigation takes priority over automatic
scrolling.

---

# Header behavior

The Header is visible at the top of the page. Scrolling down hides it, while
scrolling up reveals it. The transition slides vertically when motion is
allowed and is disabled when reduced motion is requested.

---

# Days

The Days page uses a prominent heading and localized subtitle, followed by
generous, uniformly sized cards. Each card has a compact dedicated month/day
date region, with the month and day vertically stacked. A subtle divider
follows closely after the date, then a flexible central title region and a
right-side status region.

The first itinerary day is marked as departure/take-off and the final day as
arrival/landing. Middle days have no journey-boundary icon. A one-day
itinerary shows one combined departure-and-arrival indicator. These indicators
are derived from itinerary order, so they apply to every manifest-loaded
itinerary without DATA-specific conditions.

Day titles receive the flexible central space and truncate with an ellipsis
only when necessary. Departure/arrival and progress indicators remain inline
in their dedicated, non-wrapping status region without altering card height.
At narrow viewport widths, modestly reduced internal spacing preserves the
stacked date, divider, title, and inline status hierarchy without overflow.

## Duration display

Visit and transport `durationMinutes` values are displayed compactly:

```text
<60 min -> X min
60+ min -> Xh
hours plus remaining minutes -> Xh Ym
```

Examples: `45 min`, `1h`, and `2h 30m`. Missing or invalid durations are not
displayed.

Indicators:

```text
○  no progress
◐  partial
✓  completed / past
```

No percentages.

No scores.

No statistics.

## Past days

A past day is automatically considered complete at day level.

This does not create item-level DONE statuses.

For example:

```text
Day → ✓
```

does not mean:

```text
item 1 → done
item 2 → done
item 3 → done
```

Item-level progress remains exactly what the user recorded.

---

# Search

Search is:

- local;
- instant;
- day-oriented.

Search is case-insensitive and deterministic. It inspects each active-itinerary
day title and each Location Item's name, primary description, and secondary
description. It does not index transport details, categories, city metadata, or
serialized DATA.

Matching locations are returned individually and grouped beneath their authored
day, preserving day and Location Item order. Selecting a location result opens
its day, scrolls to the matching item, and applies the search highlight.

A day-title-only match is returned as a standalone day result only when no
Location Item on that day matches. Selecting it opens the day normally without
an item target. Search is manifest/data-driven and applies to every itinerary
without itinerary, city, or location-specific conditions.

Do not display:

- result count;
- score;
- advanced filters;
- sorting controls;
- AI semantic interpretation.

No results:

```text
No days found.
```

---

# Routing

Routes:

```text
/
/days
/search
/settings
/day/:date
```

## `/`

Today.

## `/days`

Days list.

## `/search`

Search.

## `/settings`

Settings.

## `/day/:date`

Specific day.

Example:

```text
/day/2026-09-05
```

The day is resolved in the context of the active itinerary.

If it does not exist:

```text
No itinerary for this day.

[ Days ]
```

Do not automatically switch itineraries.

---

# Browser History

Use standard browser history.

Example:

```text
Today
 ↓
Days
 ↓
05 Sep
 ↓
Settings
```

Browser Back returns through those pages normally.

Do not create:

- custom navigation stacks;
- custom history state;
- custom swipe navigation.

---

# Google Maps

Google Maps navigation is optional.

Location Items with a verified Google Maps URL also provide a direct Share
action. It uses the same native-share and Clipboard fallback behavior as Day
Share, independently of DONE/SKIP eligibility. Locations without a Google
Maps URL and Transport Items do not receive this action.

If:

```text
googleMapsUrl exists
```

show:

```text
Navigate GMaps
```

If absent, show nothing.

The application does not:

- use Google Maps APIs;
- calculate routes;
- geocode;
- determine current position.

Google Maps handles location/navigation independently.

---

# Sharing

Use:

```js
navigator.share(...)
```

for supported browsers/devices.

The Day Page shares its current URL.

Example:

```text
/day/2026-09-05
```

If Web Share API is unavailable:

```text
Copy Link
```

Do not implement:

- share tokens;
- tracking;
- backend share records;
- social integrations;
- custom share infrastructure.

---

# Internationalization

Supported UI languages:

```text
RO
EN
```

Romanian is the default.

UI translation files:

```text
i18n/
├── ro.json
└── en.json
```

DATA is not translated.

## Language resolution

First launch:

```text
saved language?
 ↓
YES → use saved language
NO
 ↓
navigator.language
 ↓
en-* → EN
other → RO
```

Examples:

```text
en-US → EN
en-CA → EN
ro-RO → RO
fr-FR → RO
```

Manual language selection is persisted locally.

---

# PWA and Offline

Tripwise is an offline-capable PWA.

The application version is derived from `package.json`. Production builds emit
`/version.json` from that value. When online, the PWA checks this file at
startup and after the browser regains connectivity. Any exact version mismatch
(including an intentional rollback) requests the existing service-worker update
and reloads after activation. Failed, unavailable, or invalid version checks
are ignored so offline startup continues normally. This process does not alter
locally persisted DONE/SKIP progress.

Required capabilities:

- Web App Manifest;
- Service Worker;
- Cache Storage.

The application shell and required DATA should remain usable after caching.

## Phase 7 Acceptance

Phase 7 — PWA and Offline was accepted at version `0.7.0`. Automated
typecheck, lint, formatting, DATA validation, unit, coverage, E2E, build, and
verification gates passed. Genuine manual desktop, mobile, PWA installation,
standalone-mode, offline shell/DATA, and Service Worker/cache validation also
passed.

The application uses cache-first application assets and manifest-driven DATA.
Background DATA candidates are validated before activation; invalid candidates
leave the previous valid DATA package active. Google Maps URLs remain external
resources.

### Verifying a production PWA update

1. Install production version `0.9.0`, then create and confirm DONE/SKIP progress.
2. Deploy `0.9.1` and open the still-installed PWA while online.
3. It updates without interaction; after reload, Settings displays `0.9.1` and the progress remains.
4. Repeat by launching offline, restoring connectivity, and confirming the same automatic update.
5. Optionally deploy an older stable version: any unequal remote version still updates, supporting rollback.

## Media

No large images.

Only:

- icons;
- thumbnails;
- application assets.

No large image galleries.

## Install

There is no onboarding.

The first opening goes directly into the application.

An install prompt may appear if the browser supports it.

If dismissed, do not interrupt the user with repeated intrusive prompts.

---

# Caching and DATA Updates

Recommended simple strategy:

```text
App assets
→ Cache First

JSON DATA
→ Cache First + background update

icons/thumbnails
→ Cache First

Google Maps
→ external
```

When new DATA is available:

```text
download
 ↓
validate
 ↓
valid?
 ├── YES → replace cached DATA
 └── NO  → keep previous valid DATA
```

This rule is critical:

> **Invalid new DATA must never replace valid cached DATA.**

---

# Offline Indicator

The offline state may be shown using a small indicator.

Do not use:

```text
YOU ARE OFFLINE
```

as a large blocking banner.

The application should remain usable.

Use:

```text
navigator.onLine
```

for the UI signal.

The Service Worker/cache is what provides actual offline capability.

---

# Responsive UX

Mobile-first.

Supported:

- mobile;
- tablet;
- desktop.

The information architecture remains the same.

Desktop should not become a dashboard.

Conceptually:

```text
mobile
  ↓
single focused column

tablet
  ↓
same structure + more spacing

desktop
  ↓
same structure + centered content
```

---

# UI Design

Dark theme only.

The UI should be:

- calm;
- minimal;
- readable;
- touch-friendly;
- focused.

Glass effects may be used selectively.

Avoid excessive cards.

Avoid information density.

Completed/skipped items should become visually quiet:

- compact;
- greyed out;
- unfolded only when useful.

The application should prioritize the current relevant information.

---

# Accessibility

Use semantic HTML.

Prefer native:

```text
<button>
<a>
<nav>
<main>
<header>
<section>
```

Avoid custom controls when native controls are sufficient.

Support:

- keyboard navigation;
- visible focus;
- adequate contrast;
- sufficient touch targets;
- reduced motion;
- accessible labels where required.

Do not rely only on color to communicate state.

---

# Settings

Settings is a separate page.

It is accessed using a single header icon.

Minimal contents:

```text
Settings

Language
RO / EN

Install App

Reset Progress
```

No Info page.

No unnecessary preferences.

## Reset Progress

Reset affects only the active itinerary.

It requires explicit confirmation.

It removes local progress.

It does not modify:

- JSON DATA;
- other itineraries;
- language;
- active itinerary.

---

# Error Handling

## Development

Detailed errors are allowed:

```text
JSON error
Zod error
stack trace
cache information
progress information
routing information
```

## Production

Show a simple user-facing error.

Do not expose:

- stack traces;
- internal paths;
- Zod internals;
- raw JSON errors;
- debug state.

If valid cached DATA exists, prefer continuing with it.

---

# Testing

The project follows:

> **Test behavior, not implementation details.**

## Vitest

Test pure/domain behavior:

- date classification;
- Today;
- CURRENT;
- progress;
- DONE;
- SKIP;
- UNDO;
- day progress;
- local persistence;
- language persistence;
- Search;
- DATA validation.

## Playwright

Test real user journeys:

```text
open app
→ Today
```

```text
Days
→ select day
```

```text
Search
→ search
→ select result
→ Day
```

```text
Today
→ DONE
→ CURRENT changes
```

```text
Today
→ SKIP
→ CURRENT changes
```

```text
progress
→ reload
→ progress remains
```

```text
language
→ switch
→ UI changes
→ reload
→ language remains
```

Also test:

- offline shell;
- cached DATA;
- Google Maps link presence/absence;
- Share fallback where testable.

Do not create excessive pixel-level tests.

---

# Development Workflow

Recommended workflow:

```text
1. Read SRS.md
        ↓
2. Understand DATA model
        ↓
3. Make small change
        ↓
4. Run validation
        ↓
5. Run tests
        ↓
6. Run build
        ↓
7. Inspect behavior
        ↓
8. Commit
```

For DATA changes:

```text
Edit JSON
 ↓
npm run validate:data
 ↓
npm test
 ↓
npm run build
 ↓
commit
```

For UI/domain changes:

```text
Implement
 ↓
npm test
 ↓
npm run test:e2e
 ↓
npm run build
```

---

# Git and DATA Changes

The repository is the canonical versioned source for the application and itinerary DATA.

Keep commits small and focused.

Good examples:

```text
feat: add Montreal itinerary data
feat: add Today current item logic
feat: add local progress
fix: preserve cached data on validation failure
test: cover skip and undo behavior
```

Avoid giant commits containing unrelated changes.

---

# Netlify Deployment

Tripwise is a static application.

Build:

```bash
npm run build
```

Netlify serves the generated production assets.

SPA routing requires a fallback:

```text
/*    /index.html   200
```

This allows:

```text
/day/2026-09-05
```

to work when opened directly or refreshed.

The exact Netlify configuration can be provided through:

```text
netlify.toml
```

or the equivalent `_redirects` configuration.

---

# Coding-Agent Instructions

Tripwise may be developed using AI coding agents such as GitHub Copilot CLI or OpenAI Codex.

The agent must read:

```text
SRS.md
```

before making architectural decisions.

Repository guidance is also available in:

```text
.github/copilot-instructions.md
```

## Required agent behavior

The agent should:

- inspect existing code before changing it;
- follow SRS.md;
- preserve correct existing implementation;
- use KISS;
- avoid unnecessary dependencies;
- avoid speculative abstractions;
- keep changes small;
- run validation;
- run tests;
- run the build;
- report assumptions.

The agent should not:

- invent product requirements;
- change UX decisions without discussion;
- add backend infrastructure;
- add state-management libraries;
- add unnecessary frameworks;
- move travel planning logic into runtime;
- modify DATA semantics casually;
- rewrite working code without reason.

---

# KISS Rules

These rules are intentionally strict.

## Do

```text
Prefer native browser API
Prefer simple data structures
Prefer pure functions
Prefer local state
Prefer stable IDs
Prefer optional fields
Prefer semantic HTML
Prefer one obvious action
Prefer simple routes
Prefer one source of truth
```

## Do not

```text
Add abstraction for abstraction's sake
Add state libraries without need
Add backend infrastructure
Add service layers without a concrete purpose
Add API clients without an API
Add analytics without a requirement
Add monitoring without a requirement
Add complex routing
Add custom gestures
Add unnecessary UI
Duplicate DATA
Translate DATA
Calculate tourist decisions at runtime
```

When two technically valid solutions exist:

> Choose the simpler one.

---

# Non-Goals

The MVP does not include:

- backend;
- database;
- CMS;
- authentication;
- accounts;
- cloud synchronization;
- live routing;
- Google Maps API;
- live weather;
- currency conversion;
- AI search;
- semantic search;
- itinerary editing;
- trip-planning algorithms;
- behavior tracking;
- gamification;
- schedule adherence scoring;
- complex notification infrastructure;
- large photo galleries;
- complex desktop dashboard;
- custom gesture system.

---

# Troubleshooting

## `npm install` fails

Check:

```bash
node --version
npm --version
```

Use a current supported Node.js version.

Delete `node_modules` and the lockfile only when there is a genuine dependency-resolution problem. Prefer preserving the lockfile.

## DATA validation fails

Run:

```bash
npm run validate:data
```

Read the first validation error.

Typical causes:

- missing required field;
- invalid ID;
- duplicate ID;
- invalid `locationId`;
- malformed URL;
- invalid date;
- invalid time;
- unsupported transport mode;
- malformed progress field.

Fix DATA rather than weakening the schema.

## Tests fail

Run:

```bash
npm test
```

Then isolate the failing behavior.

Do not change tests simply to make them pass unless the test itself is incorrect.

## E2E tests fail

Run:

```bash
npm run test:e2e
```

Check:

- development/build server;
- browser installation;
- route handling;
- test data;
- expected user behavior.

## Direct route returns 404 on Netlify

Check the SPA fallback:

```text
/*    /index.html   200
```

## Offline does not work

Check:

- Service Worker registration;
- Cache Storage;
- production build;
- browser support;
- whether the required DATA was cached;
- whether the application is being served over HTTPS or localhost.

Test the production build rather than relying only on the Vite development server.

## Google Maps button missing

Check whether the location has:

```text
googleMapsUrl
```

If the field is absent, the missing button is expected.

Do not add runtime fallback logic.

## Progress disappeared

Check:

```text
localStorage
activeItineraryId
itemId
```

Stable IDs are required for progress continuity.

Do not change an existing item's `itemId` unnecessarily.

---

# Implementation Checklist

Before considering the MVP complete:

## Foundation

- [ ] React + TypeScript + Vite
- [ ] React Router
- [ ] Zod
- [ ] Fuse.js
- [ ] Vitest
- [ ] Playwright

## DATA

- [ ] Itinerary schema
- [ ] Day schema
- [ ] Item schema
- [ ] Location schema
- [ ] Transport schema
- [ ] Stable IDs
- [ ] Cross-reference validation
- [ ] `npm run validate:data`

## Core UX

- [ ] Today
- [ ] Day Page
- [ ] Days
- [ ] Search
- [ ] Settings
- [ ] RO/EN
- [ ] local progress

## Progress

- [ ] DONE
- [ ] SKIP
- [ ] UNDO
- [ ] CURRENT
- [ ] UP NEXT
- [ ] All done
- [ ] Day indicators
- [ ] Past-day automatic completion
- [ ] Persistence

## Browser/PWA

- [ ] Manifest
- [ ] Service Worker
- [ ] Cache Storage
- [ ] Offline indicator
- [ ] Validated DATA cache updates
- [ ] Install support

## External

- [ ] Google Maps optional links
- [ ] Web Share API
- [ ] Copy Link fallback

## Routing

- [ ] `/`
- [ ] `/days`
- [ ] `/search`
- [ ] `/settings`
- [ ] `/day/:date`
- [ ] Netlify SPA fallback

## Quality

- [ ] Unit/domain tests
- [ ] E2E tests
- [ ] Production build
- [ ] Accessibility checks
- [ ] Reduced-motion support
- [ ] Development debug flag
- [ ] Production error handling

---

# Final Product Definition

Tripwise is a minimalist, offline-capable travel-guide PWA.

It receives a pre-built itinerary as JSON, validates it, displays the relevant day, helps the user understand what the itinerary recommends next, allows manual local progress tracking, and provides Google Maps navigation where a verified link exists.

It does not plan the trip.

It does not monitor the user.

It does not judge the user.

It does not force adherence to the schedule.

It simply provides the right information at the right moment.

> **One glance. One decision. One action.**
