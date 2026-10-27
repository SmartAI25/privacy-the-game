#!/usr/bin/env bash
# Install or update the nightly job on the games box. Idempotent.
# Usage: collective/job/install.sh [--host games]
set -euo pipefail
HOST="games"
[ "${1:-}" = "--host" ] && HOST="${2:?--host needs a value}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEST=/opt/reclaim-city-collective

ssh "$HOST" "mkdir -p $DEST/job $DEST/public $DEST/geo"
rsync -az --delete --exclude tests/ --exclude __pycache__/ --exclude systemd/ "$SRC/" "$HOST:$DEST/job/"
rsync -az "$SRC/../README.md" "$HOST:$DEST/README.md"
ssh "$HOST" "test -f $DEST/job.env || echo 'GLITCHTIP_DSN=https://ba6fd2bcdb8f47f3bc15613b5ef4e419@errors.multiversegames.ai/15' > $DEST/job.env; chmod 600 $DEST/job.env"
scp "$SRC"/systemd/rc-collective-job.{service,timer} "$HOST:/etc/systemd/system/"
ssh "$HOST" "systemctl daemon-reload"
echo "Installed. First run: ssh $HOST systemctl start rc-collective-job.service && journalctl -u rc-collective-job -n 20"
echo "Enable nightly: ssh $HOST systemctl enable --now rc-collective-job.timer"
