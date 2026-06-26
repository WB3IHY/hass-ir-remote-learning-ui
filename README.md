# IR Remote Manager

A Home Assistant custom integration that adds a sidebar panel for learning and managing IR remotes via a Broadlink IR blaster.

## Features

- **Guided learning wizard** — add a new device, name its buttons (from presets or custom), then learn each IR code by pointing the remote at the blaster
- **Device cards** — all learned devices appear as clickable cards; press any button chip to fire the command
- **Import existing codes** — one-click import from the Broadlink `.storage` file so you don't lose previously learned codes
- **Persistent storage** — codes stored in HA's own `.storage` system
- **Sidebar panel** — lives inside Home Assistant, no separate server required

## Requirements

- Home Assistant 2023.6 or newer
- A Broadlink IR blaster integrated as `remote.ir_blaster` (or any entity ID you configure)

## Installation via HACS

1. In HACS → Integrations → ⋮ → **Custom repositories**, add this repo URL with category **Integration**
2. Install **IR Remote Manager** from HACS
3. Restart Home Assistant
4. Go to **Settings → Devices & Services → Add Integration** and search for **IR Remote Manager**
5. During setup, confirm the remote entity ID and Broadlink storage path (auto-detected if found)
6. Open **IR Remotes** in the sidebar and click **Import Broadlink Codes** to load existing devices

## Manual Installation

Copy `custom_components/ir_remote_manager/` into your `/config/custom_components/` directory, then restart HA and follow steps 4–6 above.

A `deploy.sh` helper script is provided for SSH-based deployment during development:

```bash
HA_HOST=homeassistant.local HA_SSH_PORT=22 bash deploy.sh
```

## Usage

### Send a command
Click any button chip on a device card. A brief highlight confirms the command was sent.

### Learn a new button
Click the ⟲ icon on any chip, or use the **+ Add Device** wizard. Point your remote at the blaster when prompted; learning times out after 60 seconds.

### Add a device
Click **+ Add Device** in the top bar. The 3-step wizard walks through naming the device, choosing buttons, and learning each one.

### Import existing Broadlink codes
Click **Import Broadlink Codes**. This reads the Broadlink `.storage` file directly (no SSH) and populates all previously learned devices and codes.
