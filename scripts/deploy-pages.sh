#!/usr/bin/env bash
set -euo pipefail

PROJECT_NAME="${CLOUDFLARE_PAGES_PROJECT_NAME:-streetrise}"
ACCOUNT_ID="${CLOUDFLARE_ACCOUNT_ID:-${CF_ACCOUNT_ID:-}}"
DIST_DIR="${1:-dist}"

if [[ -z "$ACCOUNT_ID" ]]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID is required for Pages deploys."
  echo "Set it in your shell or CI secrets, then retry."
  exit 1
fi

if [[ ! "$ACCOUNT_ID" =~ ^[a-fA-F0-9]{32}$ ]]; then
  echo "Error: CLOUDFLARE_ACCOUNT_ID must be a 32-character hex string."
  echo "Received: $ACCOUNT_ID"
  exit 1
fi

npx wrangler pages deploy "$DIST_DIR" \
  --project-name "$PROJECT_NAME" \
  --account-id "$ACCOUNT_ID"
