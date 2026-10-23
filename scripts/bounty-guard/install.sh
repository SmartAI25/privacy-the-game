#!/bin/sh
# Install (or upgrade) the hourly bounty guard as a launchd agent.
#
# The guard that runs is the one on origin/main, copied out of git into
# ~/Library/Application Support/bounty-guard/ and made read-only, so a stale
# or dirty checkout can never change what runs. Upgrade = re-run this after
# a merge. Before loading, it runs a dry run and prints it.
#
#   scripts/bounty-guard/install.sh [path-to-privacy-the-game-checkout]
#   BOUNTY_GUARD_REF=origin/some-branch  install from another ref (testing)
#   BOUNTY_GUARD_NO_LOAD=1               stop after the dry run
#   BOUNTY_GUARD_DIR=/some/dir           install somewhere else (testing)
set -eu
label=com.multiverse.bounty-guard
repo=${1:-$(cd "$(dirname "$0")/../.." && pwd)}
ref=${BOUNTY_GUARD_REF:-origin/main}
dir=${BOUNTY_GUARD_DIR:-"$HOME/Library/Application Support/bounty-guard"}
log="$HOME/Library/Logs/bounty-guard.log"
plist="$HOME/Library/LaunchAgents/$label.plist"

node_bin=$(command -v node) || { echo "node not found on PATH" >&2; exit 1; }
command -v gh >/dev/null || { echo "gh not found on PATH" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh is not logged in" >&2; exit 1; }

git -C "$repo" fetch origin
mkdir -p "$dir" "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
chmod 0755 "$dir"
[ -f "$dir/guard.mjs" ] && chmod 0644 "$dir/guard.mjs"
git -C "$repo" show "$ref:scripts/bounty-guard/guard.mjs" > "$dir/guard.mjs"
template=$(git -C "$repo" show "$ref:scripts/bounty-guard/com.multiverse.bounty-guard.plist")
# State and status are rewritten in place, so they can live in a read-only dir.
[ -s "$dir/state.json" ] || echo '{}' > "$dir/state.json"
touch "$dir/status.txt"
chmod 0644 "$dir/state.json" "$dir/status.txt"
chmod 0444 "$dir/guard.mjs"
chmod 0555 "$dir"
echo "Installed guard from $ref ($(git -C "$repo" rev-parse --short "$ref")) into $dir"

echo "--- dry run ---"
"$node_bin" "$dir/guard.mjs"
echo "--- end dry run ---"

if [ "${BOUNTY_GUARD_NO_LOAD:-}" = 1 ]; then echo "BOUNTY_GUARD_NO_LOAD=1: not loading"; exit 0; fi

printf '%s\n' "$template" | sed -e "s|__NODE__|$node_bin|g" -e "s|__DIR__|$dir|g" -e "s|__LOG__|$log|g" > "$plist"
plutil -lint "$plist" >/dev/null
launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$plist"
echo "Loaded $plist (node: $node_bin). Log: $log  Status: $dir/status.txt"
