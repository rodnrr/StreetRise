# Blog publisher deployment note

Changes to `workers/blog-publisher/src/index.ts` do not affect the live blog publisher until the Worker is redeployed.

After this PR is merged and CI is green, deploy the Worker with the repository's existing blog Worker deployment workflow or `npm run worker:blog:deploy` from an environment that already has the required Cloudflare and Supabase configuration.

No database migration is required for this formatting update.
