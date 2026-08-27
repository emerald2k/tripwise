# Tripwise DATA

This DATA package is derived from the approved Montréal + Québec City operational guide for 3–12 September 2026.

## Files

```text
data/
├── manifest.json
├── itineraries/
│   └── canada-2026.json
└── cities/
    ├── montreal.json
    └── quebec-city.json
```

The executable Zod contract is provided at `src/data/schema.ts`. The application should import this schema rather than create a second manual TypeScript model.

## Rules

- JSON is strict. Unknown fields are invalid.
- Locations are defined once in city files and referenced by `locationId`.
- A day has no `cityId`.
- A location item uses `locationId`; a transport item uses `transport`.
- Only `progress: true` makes a location item trackable. `progress: false` is not used.
- Transport modes are restricted to the enum in `schema.ts`.
- No runtime route calculation or tourist-planning logic belongs in DATA.
- Google Maps URLs are optional and are carried as authored DATA.
- Missing source values are omitted rather than invented.

## Source fidelity note

The guide contains approximate clock times and range values such as `20–25 min`, `45–60 min`, `90–120 min`, and distance ranges. The strict MVP model accepts `HH:mm` and integer minute/meter values. Approximate clock values are represented by their stated clock value. Range-based numeric durations/distances are omitted rather than replaced by invented midpoints.

The guide also contains optional/alternative nightlife choices. They are retained as separate location items with the source wording in their titles because the current KISS model has no additional option-group field.
