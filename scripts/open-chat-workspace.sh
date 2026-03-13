#!/usr/bin/env bash
set -euo pipefail

chat_title="${CHAT_TITLE:-${*:-copilot-session}}"
repo_root="$(git rev-parse --show-toplevel)"
repo_name="$(basename "$repo_root")"

base_branch="main"
if git -C "$repo_root" show-ref --verify --quiet "refs/heads/main"; then
  base_branch="main"
elif git -C "$repo_root" show-ref --verify --quiet "refs/heads/master"; then
  base_branch="master"
fi

start_ref="$base_branch"
if ! git -C "$repo_root" show-ref --verify --quiet "refs/heads/$base_branch"; then
  if git -C "$repo_root" show-ref --verify --quiet "refs/remotes/origin/$base_branch"; then
    start_ref="origin/$base_branch"
  else
    start_ref="HEAD"
  fi
fi

slug="$(printf '%s' "$chat_title" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -E 's/[^a-z0-9]+/-/g; s/^-+|-+$//g; s/-{2,}/-/g')"

if [[ -z "$slug" ]]; then
  slug="chat-session"
fi

timestamp="$(date +%Y%m%d-%H%M%S)"
name="${slug}-${timestamp}"
branch="chat/${name}"

workspaces_root="${WORKSPACES_ROOT:-$(dirname "$repo_root")}" 
workspace_path="${workspaces_root}/${repo_name}-${name}"

# Ensure refs are fresh when possible.
git -C "$repo_root" fetch --all --prune >/dev/null 2>&1 || true

git -C "$repo_root" worktree add -b "$branch" "$workspace_path" "$start_ref"

echo "Created worktree: $workspace_path"
echo "Created branch:   $branch"

if command -v code >/dev/null 2>&1; then
  code "$workspace_path"
  echo "Opened in VS Code."
fi
