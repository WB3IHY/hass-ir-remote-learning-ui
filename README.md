# IR Remote Manager

A Home Assistant custom integration that adds a sidebar panel for learning and managing IR remotes via any HA-compatible IR blaster.

## Features

- **Guided learning wizard** — add a device, name its buttons (from presets or custom), then learn each IR code by pointing the remote at the blaster
- **Device cards** — all learned devices appear as clickable cards; press any button chip to fire the command
- **Hardware-agnostic** — works with any HA remote entity that supports `remote.learn_command` and `remote.send_command`
- **Broadlink import** *(optional)* — one-click import from the Broadlink `.storage` file for users already using the Broadlink integration
- **Persistent storage** — device and button data stored in HA's own `.storage` system

## Compatible Hardware

Any Home Assistant remote integration that implements these services:
- `remote.learn_command`
- `remote.send_command`

Examples: **Broadlink**, ZHA (with compatible IR hardware), MQTT remote, Global Caché iTach, etc.

## Requirements

- Home Assistant 2023.6 or newer
- An IR blaster integrated into HA as a `remote.*` entity

## Installation via HACS

1. In HACS → Integrations → ⋮ → **Custom repositories**, add this repo URL with category **Integration**
2. Install **IR Remote Manager** from HACS
3. Restart Home Assistant
4. Go to **Settings → Devices & Services → + Add Integration** and search for **IR Remote Manager**
5. Enter your remote entity ID (e.g. `remote.ir_blaster`)
6. *(Broadlink users only)* Enter the path to your Broadlink learned-codes file — it is auto-detected if present
7. Open **IR Remotes** in the sidebar

## Manual Installation

Copy `custom_components/ir_remote_manager/` into `/config/custom_components/`, restart HA, and follow steps 4–7 above.

A `deploy.sh` helper is included for SSH-based deployment during development:

```bash
HA_HOST=homeassistant.local HA_SSH_PORT=22 bash deploy.sh
```

## Usage

### Send a command
Click any button chip on a device card. A brief highlight confirms the command was sent.

### Learn a new button
Click the ⟲ icon on any chip. Point your remote at the blaster when prompted; learning times out after 60 seconds.

### Add a device
Click **+ Add Device**. The 3-step wizard covers naming the device, selecting buttons, and learning each one.

### Import existing Broadlink codes *(Broadlink users)*
Click **Import Broadlink Codes**. The integration reads the Broadlink `.storage` file on the HA host and populates all previously learned devices and codes.

## Notes

- Raw IR codes are saved to HA storage when a Broadlink storage path is configured. Without one, commands still work — HA's remote entity tracks them.
- The `device` parameter is passed in `remote.learn_command` calls to namespace commands; some non-Broadlink platforms may ignore it.
