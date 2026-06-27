"""REST API views for IR Remote Manager."""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Any

from aiohttp import web

from homeassistant.components.http import HomeAssistantView
from homeassistant.core import HomeAssistant

from . import DOMAIN

_LOGGER = logging.getLogger(__name__)

LEARN_TIMEOUT = 60  # seconds


def async_register_views(hass: HomeAssistant) -> None:
    for view in (
        DevicesView,
        DeviceView,
        DeviceButtonsView,
        ButtonView,
        ButtonLearnView,
        ButtonSendView,
        ImportView,
        PublishPreviewView,
        PublishView,
    ):
        hass.http.register_view(view)


# ── Helpers ───────────────────────────────────────────────────────────────────


def _store(hass: HomeAssistant):
    return hass.data[DOMAIN]["store"]


def _cfg(hass: HomeAssistant) -> dict:
    return hass.data[DOMAIN]


def _admin_check(request: web.Request) -> web.Response | None:
    """Return a 403 JSON response if the requester is not an HA admin."""
    user = request.get("hass_user")
    if not user or not user.is_admin:
        return web.Response(
            status=403,
            body='{"message":"Admin access required"}',
            content_type="application/json",
        )
    return None


def _dev_dto(d: dict, published_ids: set | None = None) -> dict:
    pub = published_ids or set()
    return {
        "id": d["id"],
        "name": d["name"],
        "buttons": [
            {
                "id": b["id"],
                "name": b["name"],
                "learned": b["ir_code"] is not None,
                "published": b["id"] in pub,
            }
            for b in d.get("buttons", [])
        ],
    }


# ── Views ─────────────────────────────────────────────────────────────────────


class DevicesView(HomeAssistantView):
    url = "/api/ir_remote_manager/devices"
    name = "api:ir_remote_manager:devices"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)
        published_ids = store.get_published_button_ids()
        return self.json([_dev_dto(d, published_ids) for d in store.get_devices()])

    async def post(self, request: web.Request) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        body: dict = await request.json()
        name = (body.get("name") or "").strip()
        if not name:
            return self.json({"error": "name required"}, status_code=400)
        buttons = [b.strip() for b in body.get("buttons", []) if b.strip()]
        try:
            dev = await _store(hass).create_device(name, buttons)
        except Exception as exc:
            return self.json({"error": str(exc)}, status_code=409)
        return self.json(_dev_dto(dev), status_code=201)


class DeviceView(HomeAssistantView):
    url = "/api/ir_remote_manager/devices/{device_id}"
    name = "api:ir_remote_manager:device"
    requires_auth = True

    async def delete(self, request: web.Request, device_id: str) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        await _store(hass).delete_device(device_id)
        return self.json({"ok": True})


class DeviceButtonsView(HomeAssistantView):
    url = "/api/ir_remote_manager/devices/{device_id}/buttons"
    name = "api:ir_remote_manager:device_buttons"
    requires_auth = True

    async def post(self, request: web.Request, device_id: str) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        body: dict = await request.json()
        name = (body.get("name") or "").strip()
        if not name:
            return self.json({"error": "name required"}, status_code=400)
        btn = await _store(hass).add_button(device_id, name)
        if not btn:
            return self.json({"error": "device not found"}, status_code=404)
        return self.json({"id": btn["id"], "name": btn["name"], "learned": False}, status_code=201)


class ButtonView(HomeAssistantView):
    url = "/api/ir_remote_manager/buttons/{button_id}"
    name = "api:ir_remote_manager:button"
    requires_auth = True

    async def delete(self, request: web.Request, button_id: str) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        await _store(hass).delete_button(button_id)
        return self.json({"ok": True})


class ButtonLearnView(HomeAssistantView):
    url = "/api/ir_remote_manager/buttons/{button_id}/learn"
    name = "api:ir_remote_manager:button_learn"
    requires_auth = True

    async def post(self, request: web.Request, button_id: str) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)
        cfg = _cfg(hass)

        dev, btn = store.get_button(button_id)
        if not btn:
            return self.json({"error": "button not found"}, status_code=404)

        device_name: str = dev["name"]
        button_name: str = btn["name"]

        try:
            await asyncio.wait_for(
                hass.services.async_call(
                    "remote",
                    "learn_command",
                    {
                        "entity_id": cfg["remote_entity"],
                        "device": device_name,
                        "command": button_name,
                    },
                    blocking=True,
                ),
                timeout=LEARN_TIMEOUT,
            )
        except asyncio.TimeoutError:
            return self.json({
                "success": False,
                "message": "Timed out — no IR signal received. Try again.",
            })
        except Exception as exc:
            return self.json({"success": False, "message": str(exc)})

        # If a Broadlink storage path is configured, extract the raw code after learning.
        # Skipped silently for non-Broadlink setups — codes are still managed by HA.
        ir_code = None
        broadlink_path: str = cfg.get("broadlink_storage", "")
        if broadlink_path:
            try:
                def _read_code() -> Any:
                    with open(broadlink_path) as fh:
                        data = json.load(fh)
                    return data.get("data", {}).get(device_name, {}).get(button_name)

                ir_code = await hass.async_add_executor_job(_read_code)
            except Exception as exc:
                _LOGGER.warning("Could not read code from Broadlink storage: %s", exc)

        if ir_code:
            await store.save_button_code(button_id, ir_code)

        return self.json({"success": True, "code_stored": ir_code is not None})


class ButtonSendView(HomeAssistantView):
    url = "/api/ir_remote_manager/buttons/{button_id}/send"
    name = "api:ir_remote_manager:button_send"
    requires_auth = True

    async def post(self, request: web.Request, button_id: str) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)
        cfg = _cfg(hass)

        dev, btn = store.get_button(button_id)
        if not btn:
            return self.json({"error": "button not found"}, status_code=404)

        try:
            await hass.services.async_call(
                "remote",
                "send_command",
                {
                    "entity_id": cfg["remote_entity"],
                    "device": dev["name"],
                    "command": btn["name"],
                },
                blocking=False,
            )
        except Exception as exc:
            return self.json({"success": False, "message": str(exc)})

        return self.json({"success": True})


class ImportView(HomeAssistantView):
    url = "/api/ir_remote_manager/import"
    name = "api:ir_remote_manager:import"
    requires_auth = True

    async def post(self, request: web.Request) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)
        cfg = _cfg(hass)

        broadlink_path: str = cfg.get("broadlink_storage", "")
        if not broadlink_path:
            return self.json({
                "success": False,
                "message": (
                    "No Broadlink storage file configured. "
                    "Set the path in the integration options to use this feature."
                ),
            }, status_code=400)

        def _read() -> dict:
            with open(broadlink_path) as fh:
                return json.load(fh)

        try:
            raw = await hass.async_add_executor_job(_read)
        except Exception as exc:
            return self.json({"success": False, "message": str(exc)}, status_code=502)

        devices_count = 0
        buttons_count = 0

        for device_name, commands in raw.get("data", {}).items():
            clean = {
                name: code
                for name, code in commands.items()
                if " " not in name and not name.startswith("-")
            }
            if clean:
                await store.upsert_device_buttons(device_name, clean)
                devices_count += 1
                buttons_count += len(clean)

        return self.json({
            "success": True,
            "devices": devices_count,
            "buttons": buttons_count,
        })


# ── Helpers shared by the two publish views ───────────────────────────────────

def _build_current_buttons(store) -> dict[str, dict]:
    """Return {btn_id: {device_name, button_name, dev, btn}} for all stored buttons."""
    result: dict[str, dict] = {}
    for dev in store.get_devices():
        for btn in dev.get("buttons", []):
            result[btn["id"]] = {
                "device_name": dev["name"],
                "button_name": btn["name"],
                "dev": dev,
                "btn": btn,
            }
    return result


class PublishPreviewView(HomeAssistantView):
    """Return a diff of what a Publish would do without applying it."""

    url = "/api/ir_remote_manager/publish_preview"
    name = "api:ir_remote_manager:publish_preview"
    requires_auth = True

    async def get(self, request: web.Request) -> web.Response:
        if err := _admin_check(request): return err
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)

        current = _build_current_buttons(store)  # {btn_id: ...}
        already = store.get_published_buttons()   # {btn_id: {device_name, button_name}}

        current_ids = set(current.keys())
        already_ids = set(already.keys())

        to_create = [
            {"button_id": bid, "device_name": current[bid]["device_name"],
             "button_name": current[bid]["button_name"]}
            for bid in sorted(current_ids - already_ids)
        ]
        to_remove = [
            {"button_id": bid, "device_name": already[bid]["device_name"],
             "button_name": already[bid]["button_name"]}
            for bid in sorted(already_ids - current_ids)
        ]
        unchanged = [
            {"button_id": bid, "device_name": already[bid]["device_name"],
             "button_name": already[bid]["button_name"]}
            for bid in sorted(already_ids & current_ids)
        ]

        return self.json({
            "to_create": to_create,
            "to_remove": to_remove,
            "unchanged": unchanged,
        })


class PublishView(HomeAssistantView):
    """Apply the publish diff: create new entities, remove stale ones."""

    url = "/api/ir_remote_manager/publish"
    name = "api:ir_remote_manager:publish"
    requires_auth = True

    async def post(self, request: web.Request) -> web.Response:
        if err := _admin_check(request): return err
        try:
            return await self._do_publish(request)
        except Exception as exc:
            _LOGGER.exception("Publish failed: %s", exc)
            return self.json({"message": f"{type(exc).__name__}: {exc}"}, status_code=500)

    async def _do_publish(self, request: web.Request) -> web.Response:
        hass: HomeAssistant = request.app["hass"]
        store = _store(hass)

        from .button import IRButtonEntity
        from homeassistant.helpers import entity_registry as er

        current = _build_current_buttons(store)
        already = store.get_published_buttons()

        current_ids = set(current.keys())
        already_ids = set(already.keys())
        to_create_ids = current_ids - already_ids
        to_remove_ids = already_ids - current_ids

        # ── Create new entities ───────────────────────────────────────────────
        entry = hass.data[DOMAIN]["entry"]
        add_fn = hass.data[DOMAIN].get("async_add_entities")
        new_entities: list[IRButtonEntity] = []
        for bid in to_create_ids:
            info = current[bid]
            new_entities.append(IRButtonEntity(hass, entry, info["dev"], info["btn"]))

        if new_entities and add_fn:
            add_fn(new_entities)
        elif new_entities and not add_fn:
            _LOGGER.warning("async_add_entities not available; button platform may not be loaded")

        # ── Remove stale entities ─────────────────────────────────────────────
        ent_reg = er.async_get(hass)
        removed = 0
        for bid in to_remove_ids:
            unique_id = f"ir_remote_manager_{bid}"
            entity_id = ent_reg.async_get_entity_id("button", DOMAIN, unique_id)
            if entity_id:
                ent_reg.async_remove(entity_id)
                removed += 1

        # ── Persist new published set ─────────────────────────────────────────
        new_published = {
            **{bid: {"device_name": already[bid]["device_name"],
                     "button_name": already[bid]["button_name"]}
               for bid in already_ids & current_ids},
            **{bid: {"device_name": current[bid]["device_name"],
                     "button_name": current[bid]["button_name"]}
               for bid in to_create_ids},
        }
        await store.set_published_buttons(new_published)

        _LOGGER.info(
            "Publish: created %d, removed %d entities", len(new_entities), removed
        )
        return self.json({
            "success": True,
            "created": len(new_entities),
            "removed": removed,
            "unchanged": len(already_ids & current_ids),
        })
