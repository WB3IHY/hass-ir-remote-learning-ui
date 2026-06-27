"""IR Remote Manager — custom HA integration."""
from __future__ import annotations

import glob
import logging
import pathlib

from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant

DOMAIN = "ir_remote_manager"
PLATFORMS = ["button"]

DEFAULT_REMOTE_ENTITY = "remote.ir_blaster"


def _detect_broadlink_storage() -> str:
    """Auto-detect the Broadlink learned-codes storage file."""
    matches = sorted(glob.glob("/config/.storage/broadlink_remote_*_codes"))
    return matches[0] if matches else ""

_LOGGER = logging.getLogger(__name__)


async def async_setup(hass: HomeAssistant, config: dict) -> bool:
    return True


async def async_setup_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    from .store import IRStore
    from .http import async_register_views

    store = IRStore(hass)
    await store.async_load()

    hass.data.setdefault(DOMAIN, {})
    hass.data[DOMAIN] = {
        "store": store,
        "entry": entry,
        "remote_entity": entry.data.get("remote_entity", DEFAULT_REMOTE_ENTITY),
        "broadlink_storage": entry.data.get("broadlink_storage", ""),
    }

    async_register_views(hass)
    await _setup_panel(hass)
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)

    return True


async def _setup_panel(hass: HomeAssistant) -> None:
    from homeassistant.components.panel_custom import async_register_panel

    www_dir = pathlib.Path(__file__).parent / "www"
    static_url = "/ir_remote_manager_static"

    try:
        from homeassistant.components.http import StaticPathConfig

        await hass.http.async_register_static_paths([
            StaticPathConfig(static_url, str(www_dir), True)
        ])
    except (ImportError, AttributeError):
        hass.http.register_static_path(static_url, str(www_dir), True)

    await async_register_panel(
        hass,
        webcomponent_name="ir-remote-manager-panel",
        frontend_url_path="ir-remotes",
        sidebar_title="IR Remotes",
        sidebar_icon="mdi:remote-tv",
        js_url=f"{static_url}/panel.js",
        require_admin=False,
    )
    _LOGGER.info("IR Remote Manager panel registered at /ir-remotes")


async def async_unload_entry(hass: HomeAssistant, entry: ConfigEntry) -> bool:
    unload_ok = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unload_ok:
        hass.data.pop(DOMAIN, None)
    return unload_ok
