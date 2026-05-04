# StreetRise → Wix Resources Migration Summary

**Export date:** 2026-05-04  
**Source:** Supabase project `mldatfcwnmvrmxumzxyb` (`public.resources` table)  
**Export file:** `streetrise-resources-export.csv`

---

## Record counts

| Category | Total | Active | Inactive |
|---|---|---|---|
| shelter | 10 | 8 | 2 |
| food | 8 | 5 | 3 |
| mental_health | 6 | 6 | 0 |
| medical | 3 | 3 | 0 |
| legal | 2 | 2 | 0 |
| clothing | 1 | 1 | 0 |
| childcare | 1 | 0 | 1 |
| work_exchange | 1 | 1 | 0 |
| other | 2 | 1 | 1 |
| **Total** | **34** | **27** | **7** |

**Excluded:** 1 smoke-test row (`[SMOKE TEST] Not Map Ready Resource`, id `00000000-...-0102`, tagged `smoke_test`, `is_active=false`, `verification_status=rejected`).

---

## Inactive rows — review before publishing

These 7 rows are included in the CSV with `is_active=false`. Do not publish them in Wix until verified:

| Name | Reason for caution |
|---|---|
| Safe Harbor Pinellas | `verification_status=pending` |
| Community Services Foundation - Pasco | Deactivated (unknown reason) |
| Salvation Army - New Port Richey | Deactivated (unknown reason) |
| Sunrise of Pasco County | Deactivated (unknown reason) |
| Pasco Kids First - Child Welfare | Deactivated (unknown reason) |
| Pasco County Social Services | Deactivated (unknown reason) |
| Pasco Behavioral Health - Morton Plant Hospital | `verification_status=rejected` — do not publish |

---

## Wix collection schema mapping

| CSV column | Wix field type | Notes |
|---|---|---|
| `id` | Text (hidden) | Keep as reference back to Supabase |
| `name` | Text | Collection item title |
| `description` | Long Text | |
| `category` | Text / Dropdown | Values: shelter, food, mental_health, medical, legal, hygiene, clothing, childcare, transportation, work_exchange, other |
| `subcategory` | Text | |
| `address_street` | Text | |
| `address_city` | Text | |
| `address_state` | Text | |
| `address_zip` | Text | |
| `lat` | Number | For map pin |
| `lng` | Number | For map pin |
| `phone` | Text | |
| `email` | Text | |
| `website` | URL | |
| `availability_status` | Text / Dropdown | Values: available, limited, full, unknown, closed |
| `beds_total` | Number | Nullable |
| `beds_available` | Number | Nullable |
| `walk_ins_accepted` | Boolean | |
| `requires_id` | Boolean | |
| `requires_referral` | Boolean | |
| `age_min` | Number | Nullable |
| `age_max` | Number | Nullable |
| `gender_restriction` | Text | Default: "any" |
| `hours_of_operation` | Long Text | JSON string — display as-is or parse per day |
| `verification_status` | Text | Values: pending, verified, rejected, suspended |
| `is_active` | Boolean | Filter to `true` for public directory |
| `access_type` | Text | Values: onsite, phone_intake, web_intake, confidential_address, not_map_ready |
| `is_map_ready` | Boolean | Only show on map if `true` |
| `languages_spoken` | Text | Pipe-delimited — split or keep as string |
| `tags` | Text | Pipe-delimited — split or keep as string |

---

## Wix collection permissions (recommended)

| Permission | Role |
|---|---|
| View | Everyone |
| Add | Members |
| Update | Item's creator |
| Delete | Admins only |

---

## Import steps

1. In Wix CMS, create a new collection named **Resources**.
2. Define the schema using the mapping table above.
3. Use **Import Items** → upload `streetrise-resources-export.csv`.
4. Map each CSV column to the matching collection field.
5. After import, filter `is_active = false` and set those items to **Draft** or delete — do not publish.
6. Spot-check 5–10 records for name, address, phone, and website accuracy.
7. Connect the public directory page repeater to this collection, filtered to `is_active = true` and `is_map_ready = true` for map pins.

---

## Field notes

- **`hours_of_operation`** — stored as JSONB in Supabase, serialised to a JSON string in CSV. In Wix, either display as raw text or write a Velo function to render per-day hours.
- **`languages_spoken` / `tags`** — pipe (`|`) delimited. Wix does not have a native multi-value field in basic CMS; keep as text and filter with `.contains()` or split into a Tags field if using Velo.
- **`beds_total` / `beds_available`** — most records have these blank (null). Only show bed counts where the value is present and `beds_updated_at` is recent.
- **`lat` / `lng`** — use these to populate a Wix Pro Gallery map or Google Maps embed. Do not show pins where `is_map_ready = false`.
