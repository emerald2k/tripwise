# Canada Trip PWA

## Software Requirements Specification (SRS)

**Status:** Validated product direction
**Date:** 2026-08-27
**Product:** Mobile-first Progressive Web App

## 1. Product Philosophy

> **One glance. One decision. One action.**

The application is a guide, not a monitoring system and not a trip-planning engine.

> **The itinerary is guidance, not enforcement.**

> **The app guides. The user decides.**

The product follows a KISS approach and an Apple-inspired UX philosophy: clarity, hierarchy, contextual information, native interactions, restrained animation, and minimal cognitive load.

## 1.1 Project and White-Label Naming

`tripwise` is the technical product and repository identity.

```text
Product / Engine: tripwise
GitHub Repository: tripwise
Package / Project: tripwise
Current Application Brand: Voya
```

`tripwise` is a white-label travel-guide product/engine. The displayed application brand is deployment/configuration-specific and must not be hardcoded into the application code.

The current deployment uses:

```text
Brand: Voya
Netlify: voya.netlify.app
```

The brand configuration must remain minimal and static for MVP. Do not introduce a complex white-label platform, CMS, backend, tenant system, or runtime branding service.

Changing the white-label brand must not require changing the core itinerary, progress, routing, or application logic.

Do not use `tripwise` as the user-facing application brand unless explicitly configured for a deployment.

## 2.1 White-Label Architecture

Tripwise is the reusable white-label product/engine. A deployment supplies a brand configuration.

For MVP, branding is intentionally simple:

```text
tripwise engine
      ↓
static brand configuration
      ↓
Voya deployment
```

Brand configuration may contain the application name and other presentation-level brand values required by the UI.

Brand configuration must not contain itinerary decisions or business logic.

The application must not contain Voya-specific product logic. Voya is the current brand, not the application architecture.

## 2. Scope

The PWA loads pre-built itinerary DATA from JSON, validates it with Zod, renders days and itinerary items, resolves Today using the device's local date/time, tracks manual progress locally, provides Days and Search, opens Google Maps when a verified URL exists, supports Web Share API, works offline after caching, and supports RO/EN UI.

The application does not plan trips, calculate routes live, make tourist decisions, use a backend/database/CMS, edit DATA, monitor behavior, score itinerary adherence, calculate lateness, translate DATA, or use custom gestures.

## 3. Technology

Core:

- React
- TypeScript
- Vite
- React Router
- Zod
- Fuse.js

State:

- React state/hooks
- Context only where genuinely necessary
- custom hooks
- no Redux
- no Zustand

Prefer native browser APIs:

- localStorage
- Cache Storage
- Service Worker
- Web App Manifest
- navigator.language
- local date/time APIs
- navigator.onLine
- matchMedia()
- prefers-reduced-motion
- Web Share API
- browser History API through React Router

## 4. DATA Architecture

JSON DATA is the single source of truth for itinerary content.

> **The application is a renderer and execution layer, not a trip-planning engine.**

The assistant is responsible for authoring the trip DATA from the approved travel guide. The application loads, validates, renders, searches, applies local progress, handles user actions, and opens external links.

Tourist/logistical decisions belong to DATA authoring, including itinerary order, walking vs transport, distances, walking times, visit durations, meals, nightlife, and verified Google Maps URLs.

The application must not make these decisions at runtime.

### 4.1 Data organization

Keep DATA logically split without over-engineering:

```text
data/
├── manifest.json
├── itineraries/
│   └── canada-2026.json
└── cities/
    ├── montreal.json
    └── quebec-city.json
```

`manifest.json` provides the statically available itineraries and city files. A separate file for every location is unnecessary.

### 4.2 Strict JSON contract

The JSON model is intentionally small and strict. Unknown fields are invalid. Zod must reject fields that are not part of the contract.

#### Itinerary

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

Required:

- `id: string`
- `name: string`
- `journey.departureDate: YYYY-MM-DD`
- `journey.destinationArrivalDate: YYYY-MM-DD`, on or after `departureDate`
- `days: Day[]`, minimum 1

#### Day

```json
{
  "date": "2026-09-05",
  "title": "Olympic Park 50th Anniversary + Downtown",
  "items": []
}
```

Required:

- `date: YYYY-MM-DD`
- `items: Item[]`, minimum 1

Optional:

- `title: string`

A day has no `cityId`. A day may contain multiple cities or travel segments.

#### Location Item

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

Required:

- `itemId: string`
- `startTime: HH:mm`
- `title: string`
- `locationId: string`

Optional:

- `durationMinutes: positive integer`
- `progress: true`

`progress` is omitted for informational items. `progress: false` is not allowed.

#### Transport Item

```json
{
  "itemId": "sep04-darmes-pac",
  "startTime": "11:10",
  "title": "→ Pointe-à-Callière exterior + surroundings",
  "transport": {
    "mode": "walk",
    "distanceMeters": 400,
    "durationMinutes": 5
  }
}
```

Required:

- `itemId: string`
- `startTime: HH:mm`
- `title: string`
- `transport.mode`

Optional:

- `transport.distanceMeters: non-negative integer`
- `transport.durationMinutes: positive integer`

Transport items never have `locationId` or `progress`.

Allowed transport modes are strictly:

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

The DATA may omit distance/duration when the source guide provides a range, a qualitative value, or no numeric value. The application must not invent a midpoint or derive a value.

#### Location

```json
{
  "locationId": "montreal-notre-dame-basilica",
  "name": "Notre-Dame Basilica",
  "category": "attraction",
  "googleMapsUrl": "https://www.google.com/maps/..."
}
```

Required:

- `locationId: string`
- `name: string`
- `category`

Optional:

- `address: string`
- `description: string`
- `coordinates: { latitude: number, longitude: number }`
- `googleMapsUrl: string`

Allowed categories are strictly:

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

Coordinates are included only when verified DATA provides them. The application does not derive or convert coordinates.

#### City

```json
{
  "cityId": "montreal",
  "name": "Montréal",
  "locations": []
}
```

Required:

- `cityId: string`
- `name: string`
- `locations: Location[]`, minimum 1

Every `locationId` is unique across all city files in the active DATA set.

#### Manifest

```json
{
  "itineraries": [
    {
      "id": "canada-2026",
      "file": "./itineraries/canada-2026.json",
      "name": "Canada 2026"
    }
  ],
  "cities": ["./cities/montreal.json", "./cities/quebec-city.json"]
}
```

Required:

- `itineraries: ManifestItinerary[]`
- `cities: string[]`

Both manifest arrays may be empty. When entries are present, each must satisfy the constraints below.

Each manifest itinerary contains:

- `id: string`
- `file: string`
- `name: string`

Manifest paths are relative DATA paths. The validator must verify that referenced files exist and validate them against their schemas.

### 4.3 Source fidelity

The approved travel guide is the source for this trip DATA. Do not invent missing times, distances, coordinates, events, or attractions.

The strict MVP model stores `startTime` as `HH:mm` and numeric duration/distance only when a single numeric value is available. If the guide gives an approximate clock value such as `~17:00`, DATA uses `17:00` because the schema does not introduce an additional approximation field. If the guide gives a range such as `20–25 min`, `45–60 min`, or `90–120 min`, the numeric duration is omitted rather than replaced with an invented midpoint.

If the guide contains an objective or note without a concrete timed itinerary row, keep the information out of the timed item list rather than inventing a schedule.

For example, the detailed 5 September table identifies Olympic Park as the day's central objective in its heading and notes, but does not provide a concrete timed Olympic Park row. Therefore no artificial Olympic Park start time is introduced into the JSON.

### 4.4 Item ordering

There is no `order` field. Items are authored in source order and rendered chronologically by `startTime`. Stable array order is retained when two items have the same `startTime`.

This is necessary for source-faithful cases where a transport connector and the following location share the same target time.

## 5. Locations

Every location uses a stable `locationId`.

The same logical location uses the same `locationId` everywhere.

`googleMapsUrl` is optional.

If it exists, display:

```text
[ Navigate GMaps ]
```

If absent, display no navigation button and no placeholder.

The URL is generated and verified during DATA authoring. The PWA does not geocode or route.

Google Maps determines the user's current location independently.

## 6. DATA Language

DATA is language-agnostic and is displayed exactly as defined.

No translation fields such as `name.ro`, `name.en`, `descriptionRo`, or `descriptionEn`.

UI translations are separate:

```text
i18n/
├── ro.json
└── en.json
```

Only application-generated UI labels are translated.

## 7. Dates and Times

DATA uses stable formats:

```json
{
  "date": "2026-09-05",
  "startTime": "10:00"
}
```

Use the device's local date/time.

Day classification:

```text
day.date < device.localDate → PAST
day.date = device.localDate → TODAY
day.date > device.localDate → FUTURE
```

No server time or hardcoded timezone is required for normal day selection.

Use 24-hour time:

```text
10:00
13:30
18:45
```

## 8. Itinerary Ordering and Duration

There is no `order` field. Items are rendered chronologically by `startTime`.

`durationMinutes` is optional.

If duration is missing, do not show zero, unknown, or empty placeholders.

Flights, trains, transport, hotels, meals, nightlife, visits, and activities can all be itinerary items. Hotel has no special runtime behavior.

## 9. Transport

Transport information is defined directly in Day DATA.

Walking distance/time is predefined in DATA.

The application does not calculate routing.

Conceptually:

```text
TransportSegment
├── mode
├── duration
├── distance
└── optional details
```

Only fields present in DATA are displayed.

Use metric European units. Internal distance/duration values may use:

```text
distanceMeters
durationMinutes
```

UI examples:

```text
600 m
8 min
1.2 km
18 min
```

No currency conversion or business/content conversion is performed. DATA values are displayed as defined.

The 30-minute walking rule is an authoring rule, not runtime logic.

## 10. Progress Tracking

Progress is strictly individual and local.

Persistent item statuses are only:

```text
done
skipped
```

Missing status means `pending`.

An item is progress-trackable only when:

```json
{
  "progress": true
}
```

Do not use `progress: false`.

DONE/SKIP can be used at any time, regardless of `startTime`.

DONE/SKIP never modify DATA or planned times.

UNDO removes the local status.

## 11. Progress Storage

Conceptual localStorage shape:

```json
{
  "canada-2026": {
    "2026-09-05": {
      "item-001": "done",
      "item-002": "skipped"
    }
  }
}
```

Store only IDs and statuses. Do not duplicate DATA.

Persist:

```text
activeItineraryId
language
progress
```

No IndexedDB is needed for MVP.

## 12. CURRENT Logic

Only Today is time-aware.

For an eligible item:

- `progress: true`
- not `done`
- not `skipped`
- `startTime <= current local time`

Time determines the current applicable item when the user has not manually intervened.

Before the first eligible item:

```text
UP NEXT
```

There is no separate NEXT card.

The application must never assume an item was completed because its time passed.

Manual DONE/SKIP overrides item state.

DONE/SKIP do not artificially advance the schedule. If the next eligible item is still in the future, it remains UP NEXT until its time is reached.

## 13. No Lateness Logic

Never display:

- late
- behind schedule
- overdue
- schedule adherence
- scores or warnings about timing

The application does not judge user behavior.

## 14. Today and Day Page

Today is the primary entry point and uses the same Day Page structure as every other day.

Conceptually:

```text
TODAY
5 SEPTEMBRIE · Montréal

CURRENT

Olympic Park
10:30 · 30 min

[ DONE ] [ SKIP ]
[ Navigate GMaps ]

↓ 5 min · 350 m

11:05
Place Nadia-Comaneci

↓ 8 min · 600 m

11:35
Old Port
```

CURRENT is a visual focus within the same timeline. There is no duplicated CURRENT card and separate itinerary section.

The whole day is available through one normal scroll.

DONE/SKIP items become compact and greyed out.

Optional DATA produces optional UI. Missing data never produces empty placeholders.

## 15. Auto-scroll

Today auto-scrolls to CURRENT when Today is initially opened or when CURRENT genuinely changes.

Do not scroll on every render.

Use subtle smooth scrolling when allowed. Respect `prefers-reduced-motion` and use direct scrolling when necessary.

Other manually opened days do not auto-scroll and do not calculate CURRENT from the current device time.

## 16. All Done

When all progress-trackable items are `done` or `skipped`:

```text
✓ All done
```

The timeline remains available.

No percentages, scores, celebrations, or statistics.

If a day has no `progress: true` items, show no CURRENT, DONE, SKIP, or All done UI.

## 17. Days

Main navigation:

```text
Today | Days | Search
```

Days displays all days defined in the active itinerary.

Each day is a simple tappable row.

Example:

```text
05 SEP    Montréal             ◐
06 SEP    Québec City          ○
07 SEP    Québec City          ✓
```

No percentages or statistics.

Day progress indicators:

```text
○  no progress
◐  partial progress
✓  completed / past
```

A past day is automatically considered complete at day level, but this must not fabricate item-level DONE statuses.

## 18. Multiple Itineraries

The model supports multiple itineraries.

Examples:

```text
Canada 2026
Canada 2027
Japan 2027
```

Only one itinerary is active in normal UI.

Startup:

```text
APP OPEN
 ↓
activeItineraryId exists?
 ├── YES → TODAY
 └── NO
      ↓
Existing itineraries
      ↓
one itinerary?
 ├── YES → select automatically → TODAY
 └── NO → user selects → TODAY
```

Persist `activeItineraryId` locally.

If the stored itinerary no longer exists, return to itinerary selection.

A single day may contain multiple cities and multiple itinerary segments. The model is time-based and does not require a separate trip object for each city movement.

## 19. Search

Search is local and instant.

The user searches the active itinerary DATA. Fuse.js returns days only.

No:

- result count;
- location-level results;
- snippets;
- technical scores;
- filters;
- sorting;
- AI/semantic interpretation;
- translation between languages;
- external search.

Example:

```text
Search

05 SEP
Montréal

06 SEP
Québec City
```

No results:

```text
No days found.
```

Search indexes relevant textual DATA for each day, such as location names, descriptions, categories, transport details, hotels, restaurants, flights, and notes.

## 20. Language

Supported UI languages:

```text
RO
EN
```

RO is default.

First-launch resolution:

```text
localStorage language
 ↓
exists?
 ├── YES → saved language
 └── NO
      ↓
navigator.language
      ↓
en-* → EN
anything else → RO
```

Examples:

- `en-US` → EN
- `en-CA` → EN
- `ro-RO` → RO
- other languages → RO

Manual selection has priority and persists locally.

Language changes immediately.

## 21. Settings

Settings is a separate page, accessed through one icon in the header.

No Info page.

Minimal contents:

```text
Settings

Language
RO / EN

Install App

Reset Progress
```

Settings uses a simple Back control and browser history through React Router.

Reset Progress affects only the active itinerary and requires explicit confirmation.

## 22. Share

Use the native Web Share API.

For a day, share the current URL:

```text
/day/2026-09-05
```

If Web Share API is unavailable, provide `Copy Link`.

No sharing backend, tracking, tokens, social integrations, or share history.

## 23. Routing

Routes:

```text
/
/days
/search
/settings
/day/:date
```

`/day/:date` is resolved using the active itinerary.

If the requested day does not exist:

```text
No itinerary for this day.

[ Days ]
```

Do not automatically switch itineraries.

Use standard browser History through React Router. No custom navigation stack or gestures.

Netlify SPA fallback:

```text
/*    /index.html   200
```

## 24. PWA and Offline

Use:

- Web App Manifest
- Service Worker
- Cache Storage

The application should function offline after required assets and DATA have been cached.

Media is limited to icons, thumbnails, and required UI assets. No large image galleries.

Caching:

```text
App assets        → Cache First
JSON DATA         → Cache First + background update
icons/thumbnails  → Cache First
Google Maps       → external / not cached
```

New DATA must be validated before replacing cached DATA.

> **Invalid new DATA must never replace valid cached DATA.**

Offline indication is a tiny icon/indicator in a corner only when offline.

No onboarding. First opening goes directly into the application. The install prompt is the only additional element that may appear.

## 25. UI and UX

Dark theme only.

Glass effects may be used selectively.

Mobile-first responsive design.

Same information architecture on mobile, tablet, and desktop. No complex desktop dashboard.

No custom gestures.

Use native scrolling and native touch/click behavior.

Avoid excessive information. Visited items should occupy approximately 1–2 lines where practical.

Core principle:

> **One glance. One decision. One action.**

## 26. Accessibility

Use React + semantic HTML.

No dedicated accessibility library.

Requirements:

- semantic HTML;
- native buttons and links;
- visible focus;
- adequate contrast;
- adequate touch targets;
- `prefers-reduced-motion`;
- no information conveyed only through color;
- `aria-label` only where visible text is insufficient.

## 27. Error Handling and Debug

Development may expose:

- stack traces;
- JSON errors;
- Zod errors;
- debug state;
- cache information;
- progress state;
- routing/debug information.

Production must not expose technical details.

Use a development-only debug flag, conceptually:

```text
VITE_DEBUG=true
```

There is no production debug mode.

Logging in development uses native console methods:

```text
console.debug()
console.info()
console.warn()
console.error()
```

No external monitoring/logging service is required for MVP.

## 28. DATA Validation

Required command:

```text
npm run validate:data
```

Validation flow:

```text
Load JSON
 ↓
Zod validation
 ↓
Cross-reference validation
 ↓
Consistency checks
 ↓
PASS / FAIL
```

Validate:

- valid JSON;
- Zod schemas;
- unique IDs;
- valid location references;
- valid city references where applicable;
- valid dates/times;
- valid coordinates where provided;
- valid URLs;
- valid transport modes;
- valid itinerary date ranges;
- valid day references;
- valid translation keys;
- chronological consistency;
- transport references;
- progress item structure.

Do not make the validator a tourist-planning engine.

## 29. Zod

Zod is required.

Prefer:

```text
Zod schema
 ↓
z.infer
 ↓
TypeScript types
```

Avoid duplicate manual type definitions when inference is sufficient.

## 30. Testing

> **Test behavior, not implementation details.**

Vitest:

- date/Today resolution;
- day selection;
- CURRENT;
- DONE/SKIP/UNDO;
- progress persistence;
- progress compatibility;
- language persistence;
- Search;
- DATA validation.

Playwright:

- app load;
- Today;
- Days;
- Search;
- Search → Day;
- DONE/SKIP → CURRENT transition;
- UNDO;
- reload persistence;
- language switch;
- offline shell;
- cached DATA;
- Google Maps link behavior where testable;
- install capability where testable.

No excessive component/pixel testing.

## 30.1 Development Roadmap and Phase Quality Gates

The complete sequential roadmap, reusable quality-gate process, and development/release governance are maintained in [`DEVELOPMENT_ROADMAP.md`](./DEVELOPMENT_ROADMAP.md). This SRS defines product requirements and does not define the Git process; roadmap status is recorded in that document.

Current phase: **Phase 1 — DATA MODEL & RUNTIME CONTRACT**.

Phase 0 automated and manual validation passed, and Gate 0 passed. For Phase 1, implementation, DATA validation, unit tests, production build, old schema reference checks, and DATA file checks passed; manual validation and Gate 1 are pending.

A phase cannot be considered complete until its applicable automated, manual, regression, and acceptance checks pass.

## 31. DATA Version Compatibility

Stable IDs are the compatibility contract.

> **Same logical item = same stable itemId.**

If an item remains logically the same, keep its ID so local progress survives DATA versions.

If an item disappears, its local progress may remain stored but is no longer displayed.

No migration framework is required for MVP.

## 32. GitHub and Deployment

Git-versioned JSON is the single source of truth.

Changes happen through:

```text
Edit JSON
 ↓
Git commit
 ↓
GitHub
 ↓
validate:data
 ↓
tests
 ↓
build
 ↓
Netlify deployment
```

There is no CMS, admin interface, API, database, or in-app itinerary editing.

## 33. Non-goals

Do not add:

- backend;
- database;
- CMS;
- authentication;
- accounts;
- cloud sync;
- live routing;
- Google Maps API;
- live currency conversion;
- AI search;
- semantic search;
- itinerary editing;
- trip-planning algorithms;
- behavior tracking;
- gamification;
- schedule adherence scoring;
- complex notifications;
- large photo galleries;
- complex desktop dashboards;
- custom gestures.

## 34. Core Rules

1. One glance. One decision. One action.
2. KISS.
3. The app guides; the user decides.
4. DATA is the single source of truth.
5. The application is not a trip-planning engine.
6. Travel decisions are encoded during DATA authoring.
7. Progress is strictly individual and local.
8. DONE/SKIP never modify DATA.
9. Time may determine CURRENT but never proves completion.
10. Manual progress overrides item state.
11. Past days may be automatically marked complete at day level without fabricating item DONE states.
12. Optional DATA produces optional UI.
13. Missing DATA produces no empty placeholders.
14. Prefer browser APIs over unnecessary dependencies.
15. Search returns relevant days only.
16. UI translations are separate from DATA.
17. DATA is displayed exactly as defined.
18. Google Maps navigation is optional per location.
19. Offline operation is a first-class requirement.
20. Invalid DATA never replaces valid cached DATA.
21. Test behavior, not implementation details.

## 35. Final Product Definition

The product is a minimalist, offline-capable travel-guide PWA.

It receives a pre-built itinerary as JSON, validates it, displays the relevant day, helps the user understand what the itinerary recommends next, allows manual local progress tracking, and provides Google Maps navigation where a verified link exists.

It does not plan the trip, judge the user, monitor behavior, or force adherence to the schedule.

> **One glance. One decision. One action.**
