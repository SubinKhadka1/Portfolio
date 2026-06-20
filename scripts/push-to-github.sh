#!/bin/bash
# Push this repo to GitHub using bundled git (works without Xcode Command Line Tools).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GIT="$ROOT/node_modules/dugite/git/bin/git"

if [[ ! -x "$GIT" ]]; then
  echo "Installing bundled git..."
  cd "$ROOT"
  npm install dugite --no-save
fi

export GIT_EXEC_PATH="$ROOT/node_modules/dugite/git/libexec/git-core"
export GIT_TEMPLATE_DIR="$ROOT/node_modules/dugite/git/share/git-core/templates"

cd "$ROOT"

if ! "$GIT" rev-parse HEAD >/dev/null 2>&1; then
  echo "No commits yet. Run from project root after staging files."
  exit 1
fi

"$GIT" branch -M main 2>/dev/null || true
"$GIT" remote remove origin 2>/dev/null || true
"$GIT" remote add origin https://github.com/SubinKhadka1/Portfolio.git

echo "Pushing to https://github.com/SubinKhadka1/Portfolio ..."
echo "GitHub will ask you to sign in if this is your first push."
"$GIT" push -u origin main

echo "Done: https://github.com/SubinKhadka1/Portfolio"
