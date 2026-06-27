"""Config flow for IR Remote Manager."""
from __future__ import annotations

import voluptuous as vol
from homeassistant import config_entries

from . import DOMAIN, DEFAULT_REMOTE_ENTITY, _detect_broadlink_storage


class IRRemoteManagerConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    VERSION = 1

    async def async_step_user(self, user_input=None):
        if self._async_current_entries():
            return self.async_abort(reason="already_configured")

        if user_input is not None:
            return self.async_create_entry(title="IR Remote Manager", data=user_input)

        # Try to auto-detect a Broadlink storage file as a convenience default.
        # Non-Broadlink users can leave this blank.
        detected_storage = await self.hass.async_add_executor_job(_detect_broadlink_storage)

        return self.async_show_form(
            step_id="user",
            data_schema=vol.Schema({
                vol.Required("remote_entity", default=DEFAULT_REMOTE_ENTITY): str,
                vol.Optional("broadlink_storage", default=detected_storage): str,
            }),
        )
