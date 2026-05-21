# StreetRise Data Dictionary

StreetRise uses a controlled vocabulary for resource/provider data so imports, map filters, provider forms, and analytics stay consistent.

## Source of truth

- Human working copy: spreadsheet tab named `controlled_vocab`
- Version-controlled copy: `data/reference/controlled_vocab.csv`
- Live app enforcement: Supabase lookup/validation tables once admin/provider forms need dropdowns

## Import rule

Every seeded or geocoded resource/provider row should use approved lowercase `snake_case` values. Multi-value fields should use comma-separated tokens.

Example:

```csv
category,subcategory,population_served,provider_type,facility_features
day_use_space,park,general,government,"restrooms,showers,outdoor_space,parking"
```

## Core controlled fields

| Field | Purpose |
|---|---|
| `category` | Primary resource type. Single value. |
| `subcategory` | More specific service classification within the category. |
| `population_served` | Who the resource is intended for. Multi-value. |
| `provider_type` | What kind of organization operates the resource. |
| `facility_features` | Amenities or on-site features. Multi-value. |
| `access_requirements` | What a person needs before receiving help. Multi-value. |
| `verification_status` | Freshness/trust status of the listing. |
| `verification_method` | How the listing was verified. |
| `resource_status` | Operational availability of the resource. |
| `service_area_type` | Whether help is onsite, mobile, virtual, countywide, etc. |
| `geocode_quality` | Confidence level of coordinates. |
| `county` | Florida county, lowercase. |

## Current top-level categories

Use these as the preferred `category` values for new imports:

```text
shelter
food
hygiene
medical
mental_health
substance_abuse
legal
employment
education
transportation
financial_assistance
housing_assistance
crisis_services
community_center
day_use_space
```

## Day-use spaces

Parks, libraries, cooling/warming centers, drop-in centers, public restrooms, and similar non-overnight places should use:

```text
category = day_use_space
```

Then use `subcategory` and `facility_features` to describe the actual function.

Examples:

| Place | category | subcategory | facility_features |
|---|---|---|---|
| Linda Pedersen Park | `day_use_space` | `park` | `restrooms,showers,outdoor_space,parking` |
| Public Library | `day_use_space` | `library` | `wifi,charging,computer_access,air_conditioning,restrooms` |
| Cooling center | `day_use_space` | `cooling_center` | `air_conditioning,restrooms,indoor_waiting_area` |

## Faith-based providers

Do not use `faith_based` as a category or tag if `provider_type` already exists.

Use:

```text
provider_type = faith_based
```

Optional field:

```text
religious_requirement = none | optional | required | unknown
```

## Last verified

Every resource should eventually include:

```text
last_verified_at
verification_status
verification_method
```

Suggested freshness logic:

| Age | Status |
|---|---|
| 0–30 days | `verified` |
| 31–90 days | `aging` |
| 90+ days | `stale` |

## Notes for Supabase

The CSV can later seed a single lookup table:

```sql
controlled_vocab (
  id uuid primary key,
  vocab_type text not null,
  value text not null,
  label text,
  description text,
  sort_order int,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
)
```

Until then, keep the CSV in GitHub and use it as the import-cleaning reference.
