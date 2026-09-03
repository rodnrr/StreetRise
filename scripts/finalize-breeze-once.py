from pathlib import Path

# Future GTFS migrations must call migration 054's canonical derivation instead
# of carrying a second copy of the old 400 m/no-expiry proximity rule.
p = Path('scripts/build-transit-sql.ts')
s = p.read_text()
start_marker = "/**\n * Re-derive `resources.public_transit_accessible`"
end_marker = "// ── Emit ─────────────────────────────────────────────────────────"
start = s.index(start_marker)
end = s.index(end_marker, start)
replacement = '''/**
 * Re-derive the feed-managed transit-access flag after every future GTFS load.
 *
 * Migration 054 owns the product rule: a currently-valid GTFS stop within
 * exactly 1,609.34 m (1 mile), while preserving human-set TRUE values. Keeping
 * that rule in one database function prevents a later feed refresh from
 * reintroducing the generator's former 400 m / no-expiry behavior.
 *
 * Historical migrations 043–053 retain the SQL they were generated with;
 * migrations generated after 054 call this canonical function instead.
 */
const BACKFILL_SQL = `-- Recompute feed-derived transit accessibility using migration 054's canonical rule.
SELECT public.refresh_transit_accessibility_flags();`

'''
s = s[:start] + replacement + s[end:]
p.write_text(s)

# Resolve common, unambiguous Sarasota County place names. Do not hard-code
# cross-county places such as Englewood or Longboat Key.
p = Path('src/lib/rideOptions.ts')
s = p.read_text()
old = "  sarasota: 'sarasota', venice: 'sarasota',"
new = "  sarasota: 'sarasota', venice: 'sarasota', 'north port': 'sarasota',\n  nokomis: 'sarasota', osprey: 'sarasota', 'siesta key': 'sarasota', laurel: 'sarasota',"
assert old in s, 'Sarasota city mapping anchor changed'
s = s.replace(old, new, 1)
p.write_text(s)

# Record the exact validated archive used to generate migration 055.
p = Path('docs/transit-feed-provenance-2026-09-03.md')
s = p.read_text()
if '`055_seed_breeze_transit.sql`' not in s:
    anchor_prefix = "| `053_seed_citrus_connection_transit.sql` | `citrus_connection` |"
    line = next((ln for ln in s.splitlines() if ln.startswith(anchor_prefix)), None)
    assert line, 'provenance table anchor changed'
    breeze = (
        "| `055_seed_breeze_transit.sql` | `breeze` | Breeze Transit — Sarasota County | "
        "`https://breezerider.tripsparkhost.com/static/google_transit.zip` | "
        "`e658c0031c44d8947ac02b1db6b6f5d464fcc37fcf2f1d23a2295978c13a95d9` | "
        "1,310 stops / 15 routes | 2026-12-04 |"
    )
    s = s.replace(line, line + '\n' + breeze, 1)
p.write_text(s)
