#!/bin/bash
# Manual deploy for development (HACS users don't need this).
# Set env vars or edit the defaults below.
set -e

REMOTE_HOST="${HA_HOST:-homeassistant.local}"
REMOTE_PORT="${HA_SSH_PORT:-22}"
REMOTE_USER="${HA_SSH_USER:-root}"
DEST="/config/custom_components/ir_remote_manager"
SRC="./custom_components/ir_remote_manager"

echo "==> Copying integration to ${REMOTE_USER}@${REMOTE_HOST}:${DEST}"
ssh -p "${REMOTE_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" \
    "mkdir -p ${DEST}/www ${DEST}/translations"
scp -P "${REMOTE_PORT}" \
    "${SRC}/__init__.py" \
    "${SRC}/manifest.json" \
    "${SRC}/config_flow.py" \
    "${SRC}/strings.json" \
    "${SRC}/store.py" \
    "${SRC}/http.py" \
    "${REMOTE_USER}@${REMOTE_HOST}:${DEST}/"
scp -P "${REMOTE_PORT}" "${SRC}/translations/en.json" \
    "${REMOTE_USER}@${REMOTE_HOST}:${DEST}/translations/"
scp -P "${REMOTE_PORT}" "${SRC}/www/panel.js" \
    "${REMOTE_USER}@${REMOTE_HOST}:${DEST}/www/"

echo ""
echo "==> Done. Next steps:"
echo "    1. Restart Home Assistant:  Settings → System → Restart"
echo "    2. Add the integration:     Settings → Devices & Services → + Add Integration → 'IR Remote Manager'"
echo "    3. Open the panel:          Sidebar → 'IR Remotes'"
echo "    4. Click 'Import Broadlink Codes' to load your existing devices."
