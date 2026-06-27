"""HA button entities for IR Remote Manager."""
from __future__ import annotations

import logging

from homeassistant.components.button import ButtonEntity
from homeassistant.config_entries import ConfigEntry
from homeassistant.core import HomeAssistant
from homeassistant.helpers.entity import DeviceInfo
from homeassistant.helpers.entity_platform import AddEntitiesCallback

from . import DOMAIN

_LOGGER = logging.getLogger(__name__)


async def async_setup_entry(
    hass: HomeAssistant,
    entry: ConfigEntry,
    async_add_entities: AddEntitiesCallback,
) -> None:
    """Load already-published entities on startup and store callback for later."""
    hass.data[DOMAIN]["async_add_entities"] = async_add_entities

    store = hass.data[DOMAIN]["store"]
    published = store.get_published_buttons()  # {btn_id: {device_name, button_name}}

    entities: list[IRButtonEntity] = []
    for dev in store.get_devices():
        for btn in dev.get("buttons", []):
            if btn["id"] in published:
                entities.append(IRButtonEntity(hass, entry, dev, btn))

    if entities:
        async_add_entities(entities)
        _LOGGER.debug("Restored %d IR button entities", len(entities))


class IRButtonEntity(ButtonEntity):
    """A pressable HA entity that fires one IR command."""

    _attr_should_poll = False
    _attr_has_entity_name = True

    def __init__(
        self,
        hass: HomeAssistant,
        entry: ConfigEntry,
        dev: dict,
        btn: dict,
    ) -> None:
        self._hass = hass
        self._entry = entry
        self._dev_id: str = dev["id"]
        self._dev_name: str = dev["name"]
        self._btn_id: str = btn["id"]
        self._btn_name: str = btn["name"]
        self._attr_unique_id = f"ir_remote_manager_{btn['id']}"
        self._attr_name = btn["name"]

    @property
    def device_info(self) -> DeviceInfo:
        return DeviceInfo(
            identifiers={(DOMAIN, self._dev_id)},
            name=self._dev_name,
            manufacturer="IR Remote Manager",
            model="IR Remote Device",
        )

    async def async_press(self) -> None:
        cfg = self._hass.data[DOMAIN]
        await self._hass.services.async_call(
            "remote",
            "send_command",
            {
                "entity_id": cfg["remote_entity"],
                "device": self._dev_name,
                "command": self._btn_name,
            },
            blocking=False,
        )
