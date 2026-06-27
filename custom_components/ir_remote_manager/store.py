"""JSON data store for IR Remote Manager (backed by HA's .storage system)."""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from homeassistant.core import HomeAssistant
from homeassistant.helpers.storage import Store

STORAGE_KEY = "ir_remote_manager"
STORAGE_VERSION = 1


def _uid() -> str:
    return uuid.uuid4().hex[:8]


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


class IRStore:
    def __init__(self, hass: HomeAssistant) -> None:
        self._store: Store = Store(hass, STORAGE_VERSION, STORAGE_KEY)
        self._data: dict[str, Any] = {"devices": [], "published_buttons": {}}

    async def async_load(self) -> None:
        stored = await self._store.async_load()
        if stored:
            self._data = stored

    async def _save(self) -> None:
        await self._store.async_save(self._data)

    # ── Read ──────────────────────────────────────────────────────────────────

    def get_devices(self) -> list[dict]:
        return self._data["devices"]

    def get_device(self, device_id: str) -> dict | None:
        return next((d for d in self._data["devices"] if d["id"] == device_id), None)

    def get_button(self, button_id: str) -> tuple[dict | None, dict | None]:
        for dev in self._data["devices"]:
            for btn in dev.get("buttons", []):
                if btn["id"] == button_id:
                    return dev, btn
        return None, None

    # ── Published buttons ─────────────────────────────────────────────────────
    # Stored as {button_id: {"device_name": ..., "button_name": ...}}
    # so we can describe removed entities even after the button is deleted.

    def get_published_buttons(self) -> dict[str, dict]:
        return self._data.get("published_buttons", {})

    def get_published_button_ids(self) -> set[str]:
        return set(self.get_published_buttons().keys())

    async def set_published_buttons(self, published: dict[str, dict]) -> None:
        self._data["published_buttons"] = published
        await self._save()

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create_device(self, name: str, button_names: list[str]) -> dict:
        device: dict = {
            "id": _uid(),
            "name": name,
            "buttons": [
                {"id": _uid(), "name": n, "ir_code": None, "learned_at": None}
                for n in button_names
            ],
        }
        self._data["devices"].append(device)
        await self._save()
        return device

    async def delete_device(self, device_id: str) -> None:
        self._data["devices"] = [
            d for d in self._data["devices"] if d["id"] != device_id
        ]
        await self._save()

    async def add_button(self, device_id: str, name: str) -> dict | None:
        dev = self.get_device(device_id)
        if not dev:
            return None
        btn: dict = {"id": _uid(), "name": name, "ir_code": None, "learned_at": None}
        dev["buttons"].append(btn)
        await self._save()
        return btn

    async def delete_button(self, button_id: str) -> None:
        for dev in self._data["devices"]:
            dev["buttons"] = [b for b in dev["buttons"] if b["id"] != button_id]
        await self._save()

    async def save_button_code(self, button_id: str, ir_code: str) -> None:
        _, btn = self.get_button(button_id)
        if btn:
            btn["ir_code"] = ir_code
            btn["learned_at"] = _now()
            await self._save()

    async def upsert_device_buttons(
        self, device_name: str, buttons: dict[str, str]
    ) -> dict:
        dev = next(
            (d for d in self._data["devices"] if d["name"] == device_name), None
        )
        if not dev:
            dev = {"id": _uid(), "name": device_name, "buttons": []}
            self._data["devices"].append(dev)

        for btn_name, ir_code in buttons.items():
            existing = next(
                (b for b in dev["buttons"] if b["name"] == btn_name), None
            )
            if existing:
                existing["ir_code"] = ir_code
                existing["learned_at"] = _now()
            else:
                dev["buttons"].append({
                    "id": _uid(),
                    "name": btn_name,
                    "ir_code": ir_code,
                    "learned_at": _now(),
                })

        await self._save()
        return dev
