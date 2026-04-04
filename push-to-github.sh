#!/bin/bash
# StreetRise — Push to GitHub
# Double-click this file in Finder, or run: bash push-to-github.sh

set -e

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
REMOTE="https://github.com/rodnrr/StreetRise.git"

echo ""
echo "================================================"
echo "  StreetRise → GitHub Push Script"
echo "================================================"
echo "  Folder: $REPO_DIR"
echo "  Remote: $REMOTE"
echo ""

cd "$REPO_DIR"

# Clean up any broken git state from previous attempts
if [ -d ".git" ]; then
  rm -f .git/index.lock
  echo "✓ Cleaned up existing git state"
fi

# Init if needed
if [ ! -d ".git" ]; then
  git init
  git branch -m main
  echo "✓ Git initialized"
else
  git branch -M main 2>/dev/null || true
  echo "✓ Git already initialized"
fi

# Config
git config user.name "Rodner"
git config user.email "rodner.salgado@yahoo.com"

# Stage and commit
git add -A
CHANGED=$(git status --short | wc -l | tr -d ' ')
echo "✓ Staged $CHANGED files"

if git diff --cached --quiet; then
  echo "✓ Nothing new to commit (already up to date)"
else
  git commit -m "Initial StreetRise scaffold — full app complete"
  echo "✓ Committed"
fi

# Remote
git remote remove origin 2>/dev/null || true
git remote add origin "$REMOTE"
echo "✓ Remote set to $REMOTE"

echo ""
echo "================================================"
echo "  Ready to push. GitHub will ask for:"
echo "  Username: rodnrr"
echo "  Password: your Personal Access Token"
echo "  (github.com → Settings → Developer settings"
echo "   → Personal access tokens → Generate new token"
echo "   → check 'repo' → copy the token)"
echo "================================================"
echo ""

git push -u origin main

echo ""
echo "✅ Done! Your code is live at:"
echo "   https://github.com/rodnrr/StreetRise"
echo ""
