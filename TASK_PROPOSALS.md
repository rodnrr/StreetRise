# Task Proposals (Codebase Review)

## 1) Fix typo in trust copy on Home page
**Type:** Typo / copy polish  
**Where:** `src/pages/HomePage.tsx`

### Issue
The trust bullet uses title-case phrasing (`"Community Listed resources"`) in the middle of a sentence, which reads like a typo/inconsistent copy style compared to the rest of the list.

### Proposed task
Change:
- `Community Listed resources are publicly submitted ...`

To:
- `Community-listed resources are publicly submitted ...`

### Acceptance criteria
- Home page trust bullet uses consistent sentence casing and hyphenation.
- No behavioral/UI regressions.

---

## 2) Fix booking date validation bug
**Type:** Bug fix  
**Where:** `src/pages/BookingPage.tsx`

### Issue
The booking form schema accepts `check_in_date` and `check_out_date` independently, but does not prevent an invalid date range (e.g., check-out earlier than check-in). This can create invalid booking records.

### Proposed task
Add a schema-level refinement to enforce:
- If both dates are provided, `check_out_date >= check_in_date`.
- Show a user-facing error message on the form when invalid.

### Acceptance criteria
- Invalid date ranges cannot be submitted.
- Valid ranges and missing optional dates still submit successfully.

---

## 3) Fix code comment/documentation discrepancy for availability ordering
**Type:** Comment / docs discrepancy  
**Where:** `src/pages/MapPage.tsx`

### Issue
The query orders by `availability_status` ascending and comments `// available first`. Lexicographic ordering does **not** guarantee business-priority ordering (`available`, `limited`, `full`, ...), so the comment is misleading and can confuse future maintenance.

### Proposed task
- Either implement explicit status-priority ordering in query logic, **or**
- Update the comment to accurately describe the actual ordering behavior.

### Acceptance criteria
- Comment matches real behavior.
- If business-priority ordering is required, it is explicit and tested.

---

## 4) Improve test coverage for route/category mapping and booking labels
**Type:** Test improvement  
**Where:** `src/pages/MapPage.tsx`, `src/pages/BookingPage.tsx` (or extracted utils)

### Issue
There is no automated test coverage for key user-facing mapping/label logic:
- category slug normalization (`legal_help -> legal`),
- booking CTA label behavior (`Request a Spot` / `Request Help` / `Join the Waitlist`).

### Proposed task
Add unit tests (e.g., Vitest) for:
- category slug mapping table,
- booking label function behavior for shelter/non-shelter + full/closed states,
- (optionally) date-range validation from Task #2.

### Acceptance criteria
- Tests run in CI/local via a `test` script.
- Core label/mapping logic has deterministic coverage.
