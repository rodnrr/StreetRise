# Change Review Report: "Add ESLint config, task proposals, and minor MapPage fixes"

## Workable changes to keep

1. **Add ESLint config** (`.eslintrc.cjs`)  
   - Fixes the immediate `npm run lint` blocker (missing config).
   - Establishes a baseline TypeScript + React Hooks lint workflow.

2. **Map sync effect dependency update** (`src/pages/MapPage.tsx`)  
   - Including `map` in the dependency list is safe and correct for hook consistency.

3. **Realtime callback cleanup** (`src/pages/MapPage.tsx`)  
   - Removing unused parameters improves readability and lint cleanliness.

## Workarounds / issues identified and fixed in this follow-up

1. **Temporary backlog doc was mixed with production fix scope**  
   - `TASK_PROPOSALS.md` was not required to solve the lint blocker and added noise to the change.
   - **Fix applied:** removed `TASK_PROPOSALS.md` from this branch.

2. **Potentially misleading availability sort comment**  
   - Existing inline comment said `available first`, but lexicographic sort does not guarantee business-priority order in every enum/data scenario.
   - **Fix applied:** updated the comment to describe actual behavior precisely.

3. **Overly broad lint workaround for explicit any**  
   - Global `@typescript-eslint/no-explicit-any: off` can hide type quality issues.
   - **Fix applied:** removed that override; keep recommended defaults.

## Result

- Lint remains functional.
- Scope is tightened to practical, directly actionable fixes.
- Comments and lint policy are more accurate for maintainers.
