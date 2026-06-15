# Seed Import — Batch 2

Instructions for importing `streetrise_seed_candidates_batch_2_normalized.csv` into the live Supabase database.

---

## Prerequisites

### 1. Apply migration 009

Migration 009 adds `external_id`, `import_batch_id`, `last_imported_at`, `geocode_quality`, and `source_file` columns that the script depends on.

```bash
# Via Supabase CLI
supabase db push

# Or paste supabase/migrations/009_import_tracking_fields.sql
# into the Supabase Dashboard SQL editor and run it.
```

### 2. Add the service role key to .env.local

The import script bypasses RLS using the service-role key. This key has full database access — **never commit it to git**.

```bash
# .env.local (already in .gitignore)
VITE_SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # Dashboard → Project Settings → API → service_role
```

### 3. Install script dependencies

```bash
npm install   # installs tsx (added to devDependencies)
```

---

## Running the import

### Dry run first (always)

```bash
npm run import:seed -- \
  --file data/seed/streetrise_seed_candidates_batch_2_normalized.csv \
  --dry-run
```

The dry run reads the CSV, validates every row, applies all safety rules, and prints exactly what would be inserted, updated, or skipped — without touching the database.

### Apply (write to Supabase)

Only run after reviewing the dry-run output:

```bash
npm run import:seed -- \
  --file data/seed/streetrise_seed_candidates_batch_2_normalized.csv \
  --apply
```

---

## What the script does

### Filtering

| Condition | Action |
|---|---|
| `import_status = needs_review` | **Skipped** — printed as a list, never imported |
| `import_status = ready_for_import` | Processed |
| `geocode_status = confidential_no_map` | `is_map_ready = false`, lat/lng set to NULL |
| `access_type = confidential_address` | `is_map_ready = false`, lat/lng set to NULL |
| `access_type = confidential_phone_web` | `is_map_ready = false`, lat/lng set to NULL |

### Provider upsert logic

1. Match existing provider by `external_id` (set by a previous import of this batch).
2. If not found, try case-insensitive match on `organization_name` (catches providers already seeded by migration 008).
3. If still not found, insert a new unclaimed provider (`user_id = NULL`, `verification_status = pending`).

All new and updated providers get `import_batch_id` and `last_imported_at` stamped.

### Resource upsert logic

1. Match by `external_id` (idempotent re-runs).
2. If not found, try match by `provider_id + name` to avoid blind duplicates.
3. Insert if no match.

### Category fields

The CSV has two category columns:

| CSV column | Purpose |
|---|---|
| `current_app_category` | Used for `resources.category` (must match existing DB enum) |
| `category` | Preferred future vocabulary (stored as `category:<value>` in `resources.tags`) |

Valid `current_app_category` values: `shelter`, `food`, `work_exchange`, `mental_health`, `medical`, `legal`, `hygiene`, `clothing`, `childcare`, `transportation`, `outdoor_space`, `other`.

### Access type mapping

| CSV `access_type` | DB `resource_access_type` |
|---|---|
| `physical_site` | `onsite` |
| `phone_web_intake` | `phone_intake` |
| `phone_intake` | `phone_intake` |
| `confidential_phone_web` | `confidential_address` + non-map |
| `confidential_address` | `confidential_address` + non-map |
| *(empty)* | `onsite` |

---

## Output format

```
=== DRY RUN — no changes will be written to Supabase ===

CSV rows read: 95

  ready_for_import   : 77
  needs_review       : 18 (skipped — not imported)
  other/unrecognized : 0 (skipped)

  Needs-review rows (NOT imported):
    - resource_mary_and_martha_house_shelter_for_women_and_children: Potential confidential/sensitive shelter...
    ...

── Phase 1: Providers ──
Processing 42 unique providers...

  [DRY] Would upsert provider: ACTS (provider_acts)
  [DRY] Would upsert provider: Metropolitan Ministries (provider_metropolitan_ministries)
  ...

── Phase 2: Resources ──

  [DRY] Would upsert resource: Emergency Shelter / Temporary Housing (resource_acts_...) [shelter] 📍 map-ready
  [DRY] Would upsert resource: Shelter for Women and Children (resource_mary_...) [shelter] 🔒 non-map
  ...

────────────────────────────────────────────────────────────
  Import summary (DRY RUN)
────────────────────────────────────────────────────────────
  Total rows read         : 95
  ready_for_import        : 77
  Skipped (needs_review)  : 18
  Skipped (other/unknown) : 0

  Providers inserted      : 42
  Providers updated       : 0

  Resources inserted      : 74
  Resources updated       : 0
  Resources skipped       : 3
────────────────────────────────────────────────────────────

  This was a DRY RUN. Re-run with --apply to write changes.
```

---

## Schema fields added by migration 009

These fields are NOT in the original schema. They exist only after migration 009 is applied.

| Table | Column | Type | Purpose |
|---|---|---|---|
| `providers` | `external_id` | `TEXT UNIQUE` | Stable dedup key matching CSV `provider_external_id` |
| `providers` | `import_batch_id` | `TEXT` | Which batch inserted/updated this row |
| `providers` | `last_imported_at` | `TIMESTAMPTZ` | When last touched by import script |
| `resources` | `external_id` | `TEXT UNIQUE` | Stable dedup key matching CSV `external_id` |
| `resources` | `source_file` | `TEXT` | CSV file that produced this row |
| `resources` | `import_batch_id` | `TEXT` | Which batch inserted/updated this row |
| `resources` | `last_imported_at` | `TIMESTAMPTZ` | When last imported |
| `resources` | `last_verified_at` | `TIMESTAMPTZ` | When a human last verified this listing |
| `resources` | `geocode_quality` | `TEXT` | Geocoding confidence from source CSV |

### Fields that need a future migration

| Field | Reason not added yet |
|---|---|
| `normalized_category` / `preferred_category` | Requires extending `resource_category` enum with new values (`housing_assistance`, `employment`, etc.). This is a schema-breaking change that needs a separate review. For now, preferred category is stored in `tags` as `category:<value>`. |

---

## Confidentiality rules

The script enforces these rules and will **never** ignore them:

- `geocode_status = confidential_no_map` → lat/lng always NULL, `is_map_ready = false`
- `access_type` in `[confidential_address, confidential_phone_web]` → lat/lng always NULL
- Rows with `import_status = needs_review` are never written to the database

If you are uncertain whether an address is confidential, **do not import it**. Add it to the `needs_review` bucket in the CSV instead.

---

## Re-running safely

The script is **idempotent**. Running `--apply` twice on the same CSV will update existing rows rather than create duplicates, because it matches on `external_id` first.

The batch ID (e.g. `batch2_20260522`) is stamped onto every row so you can identify all rows from a specific import run via:

```sql
SELECT * FROM resources WHERE import_batch_id = 'batch2_20260522';
SELECT * FROM providers WHERE import_batch_id = 'batch2_20260522';
```
