#!/bin/bash
# Deploy IR Remote Manager integration to Home Assistant on the Pi.
set -e

REMOTE_HOST="192.168.0.123"
REMOTE_PORT="22222"
REMOTE_USER="root"
DEST="/config/custom_components/ir_remote_manager"
SRC="./custom_components/ir_remote_manager"

echo "==> Copying integration to ${REMOTE_USER}@${REMOTE_HOST}:${DEST}"
ssh -p "${REMOTE_PORT}" "${REMOTE_USER}@${REMOTE_HOST}" "mkdir -p ${DEST}/www ${DEST}/translations"
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
echo "    3. Go to the panel:         Sidebar → 'IR Remotes'"
echo "    4. Click 'Import Broadlink Codes' to load your existing devices."
