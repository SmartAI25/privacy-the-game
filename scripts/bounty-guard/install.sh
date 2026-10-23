#!/bin/sh
# Install the hourly bounty guard as a launchd agent for the current user.
# The agent runs /Users/annhoward/src/privacy-the-game/scripts/bounty-guard/guard.mjs,
# so that checkout must contain this script (pull main after merging).
set -eu
here=$(cd "$(dirname "$0")" && pwd)
label=com.multiverse.bounty-guard
dest="$HOME/Library/LaunchAgents/$label.plist"
node_bin=$(command -v node) || { echo "node not found on PATH" >&2; exit 1; }
command -v gh >/dev/null || { echo "gh not found on PATH" >&2; exit 1; }
gh auth status >/dev/null 2>&1 || { echo "gh is not logged in" >&2; exit 1; }

mkdir -p "$HOME/Library/LaunchAgents" "$HOME/Library/Logs"
sed -e "s|__NODE__|$node_bin|g" -e "s|__HOME__|$HOME|g" "$here/$label.plist" > "$dest"
plutil -lint "$dest" >/dev/null

launchctl bootout "gui/$(id -u)/$label" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$dest"
echo "Installed $dest (node: $node_bin). Log: $HOME/Library/Logs/bounty-guard.log"
