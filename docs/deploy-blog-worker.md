# Deploying the blog publisher Worker (no terminal required)

**As of 2026-08-25, deploys normally happen automatically** via
`.github/workflows/deploy-blog-worker.yml` — a push to `main` that touches
`workers/blog-publisher/**`, the workflow file itself, or the root
`package.json`/`package-lock.json` (a dependency or `wrangler` version bump
also redeploys the Worker with the new tooling) — runs
`npm run worker:blog:deploy` and sets the two Supabase secrets on GitHub's
runners, which aren't behind Cloudflare's flaky native "Workers Builds" Git
integration. It needs two repo secrets set once in GitHub (Settings → Secrets
and variables → Actions): `CLOUDFLARE_API_TOKEN` (Workers Scripts: Edit) and
`CLOUDFLARE_ACCOUNT_ID`. It can also be run on demand via that workflow's
"Run workflow" button (`workflow_dispatch`) without waiting for a push.

Everything below is the **dashboard-only fallback path** — useful if the
GitHub Actions workflow itself needs debugging, or you want to do this from a
phone without touching GitHub at all. It predates the workflow above and is
what originally kept failing: Cloudflare's "Import a repository" Root
Directory setting repeatedly reverted to the repo root instead of
`workers/blog-publisher`, so every build ran the main SPA's `npm run build`
instead of the Worker's. The app and the Worker are still two separate
deployments either way — `main` reaching production through the Pages
integration does not by itself ship the Worker.

The terminal equivalent of steps 3–4 is `npm run worker:blog:deploy` plus two
`wrangler secret put` calls — see `workers/blog-publisher/README.md`.

---

## 1. Merge the PR

Merge PR #82. It contains PR #81's commits as well, so close #81 as superseded
rather than merging it — merging both is unnecessary and #81 alone would not
deploy (it names an R2 bucket that does not exist).

Merging is safe on its own: the AI Draft panel only renders when
`VITE_BLOG_WORKER_URL` is set, which happens in step 6.

## 2. Collect the two Supabase values

In the Supabase dashboard, open the StreetRise project (`mldatfcwnmvrmxumzxyb`)
→ **Project Settings** → **API**:

| Value | What to copy |
|---|---|
| `SUPABASE_URL` | `https://mldatfcwnmvrmxumzxyb.supabase.co` |
| `SUPABASE_ANON_KEY` | the **anon / public** key — *not* the service-role key |

The Worker deliberately holds no service-role key. It runs every call on the
admin's own token, so Supabase's existing RLS stays the real gate.

## 3. Fix the existing Worker's build settings

**The Worker already exists — do not use Create application.** A Worker named
`streetrise-blog-publisher`, connected to this repo via Workers Builds, was
created on 2026-08-21. Creating a second one from **Create application** →
**Import a repository** either fails on the duplicate name or creates a
differently-named Worker whose `*.workers.dev` URL the app doesn't reference
— either way it does not fix anything. Instead:

Cloudflare dashboard → **Workers & Pages** → **streetrise-blog-publisher** →
**Settings** → **Build**, and check/set:

| Setting | Value |
|---|---|
| Root directory | `workers/blog-publisher` |
| Build command | *(leave empty)* |
| Deploy command | `npx wrangler deploy` |
| Build watch paths → Include paths | `workers/blog-publisher/**` (not the default `*`, which fires on every push to the repo, including ones that don't touch the Worker) |

**This setting has proven unreliable** — in practice it repeatedly reverted to
Root directory `/` even after saving, which sent every build against the main
app's `npm run build` instead of the Worker's. If you save this and a fresh
build still installs ~600 packages and runs `tsc && vite build` rather than
deploying `workers/blog-publisher/src/index.ts`, that reversion is happening
again — re-check the field rather than assuming it's some other bug. This is
exactly why the GitHub Actions workflow at the top of this doc is the
preferred path now.

Trigger a fresh build after saving (Deployments tab → push a commit, or
retry). The first successful build cannot serve requests yet — the secrets
from step 2 are not on it.

The Worker's `*.workers.dev` URL is unchanged by any of this — step 6 needs
it; find it on the Worker's Overview tab if you don't already have it.

## 4. Add the two secrets

Open the new Worker → **Settings** → **Variables and Secrets** → **Add**.

Add both values from step 2, each with type **Secret** (not Text):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

Type matters. A plaintext variable that is not declared in `wrangler.jsonc`
gets cleared by the next deploy; an encrypted secret survives.

Then redeploy so the running Worker picks them up: **Deployments** → the latest
build → **Retry**.

## 5. Check it is alive

Open this in the phone browser, substituting the Worker's hostname:

```text
https://streetrise-blog-publisher.<your-subdomain>.workers.dev/health
```

| Response | Meaning |
|---|---|
| `{"ok":true,"service":"streetrise-blog-publisher"}` | Ready. |
| `{"ok":false,...,"error":"SUPABASE_URL is not set."}` | Step 4 did not take — check the name and that it saved as a Secret. |

The Worker names whichever value is missing, so the error says what to fix.

## 6. Point the app at the Worker

Cloudflare dashboard → **Workers & Pages** → the **streetrise** Pages project →
**Settings** → **Environment variables** → **Production** → **Add**:

```text
VITE_BLOG_WORKER_URL = https://streetrise-blog-publisher.<your-subdomain>.workers.dev
```

No trailing slash.

Then **Deployments** → latest production deployment → **Retry deployment**.
This rebuild is required, not optional: Vite reads `VITE_` variables at build
time and bakes them into the bundle, so the currently-live bundle cannot see a
variable added after it was built.

## 7. Generate a draft

Sign in at `app.streetrise.org/admin/blog` as an admin. An **AI Draft** button
now sits next to **New Post**.

Fill in a topic, and put anything concrete the post should claim — dates,
counts, city names, partner names — in **Facts**, one per line. The prompt
tells the model those are the only facts it may assert; without them it writes
around the specifics rather than inventing them.

Generation takes up to about a minute (longer with a cover image). The draft
opens in the edit form when it lands. Read it before publishing: it arrives
unpublished, and nothing publishes it but you.

---

## If something fails

| Symptom | Cause |
|---|---|
| No AI Draft button | `VITE_BLOG_WORKER_URL` unset, or the Pages deployment was not retried after adding it. |
| "Admin access required" | The signed-in account is not `admin`/`super_admin` with `verification_status = 'verified'`. |
| "Your session has expired" | Sign out and back in. |
| A CORS error in the browser | The page origin is not in the Worker's `ALLOWED_ORIGIN`, which ships as `https://app.streetrise.org` only. Add a Pages preview host to that variable in `wrangler.jsonc` to test from a preview URL. |
| The draft appears with no cover | Image generation failed; the panel reports why. The text draft is kept deliberately — add a cover with the Upload button. |

Generated covers land in the Supabase `blog-images` bucket, the same place the
Upload button writes to. Workers AI usage is metered per request; the first
real run is also the first test of the AI calls, so check the Workers AI
dashboard for usage after it.
