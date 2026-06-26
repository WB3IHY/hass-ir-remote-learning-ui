import json
import io
import websocket


class HAError(Exception):
    pass


class HAClient:
    def __init__(self, ws_url, token, remote_entity):
        self.ws_url = ws_url
        self.token = token
        self.remote_entity = remote_entity

    def _open(self, timeout=10):
        ws = websocket.WebSocket()
        ws.settimeout(timeout)
        ws.connect(self.ws_url)
        msg = json.loads(ws.recv())
        if msg.get("type") != "auth_required":
            raise HAError(f"Unexpected greeting: {msg}")
        ws.send(json.dumps({"type": "auth", "access_token": self.token}))
        msg = json.loads(ws.recv())
        if msg.get("type") != "auth_ok":
            raise HAError(f"Auth failed: {msg.get('message', msg)}")
        return ws

    def _call(self, ws, domain, service, service_data):
        ws.send(json.dumps({
            "id": 1,
            "type": "call_service",
            "domain": domain,
            "service": service,
            "target": {"entity_id": self.remote_entity},
            "service_data": service_data,
        }))
        while True:
            raw = ws.recv()
            msg = json.loads(raw)
            if msg.get("id") == 1 and msg.get("type") == "result":
                return msg

    def learn_command(self, device, command):
        ws = self._open(timeout=65)
        try:
            result = self._call(ws, "remote", "learn_command", {
                "device": device,
                "command": command,
            })
        finally:
            ws.close()
        if not result.get("success"):
            err = result.get("error", {})
            raise HAError(err.get("message", "learn_command failed"))
        return result

    def send_command(self, device, command):
        ws = self._open(timeout=15)
        try:
            result = self._call(ws, "remote", "send_command", {
                "device": device,
                "command": command,
            })
        finally:
            ws.close()
        if not result.get("success"):
            err = result.get("error", {})
            raise HAError(err.get("message", "send_command failed"))
        return result


def read_broadlink_storage(ssh_host, ssh_port, ssh_user, storage_path, key_file=None):
    """Read the Broadlink .storage JSON via SSH and return parsed data dict."""
    import paramiko
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    connect_kwargs = dict(hostname=ssh_host, port=ssh_port, username=ssh_user)
    if key_file:
        connect_kwargs["key_filename"] = key_file
    client.connect(**connect_kwargs)
    try:
        sftp = client.open_sftp()
        buf = io.BytesIO()
        sftp.getfo(storage_path, buf)
        buf.seek(0)
        raw = json.load(buf)
        return raw.get("data", {})
    finally:
        client.close()


def import_from_storage(ssh_host, ssh_port, ssh_user, storage_path, key_file, db):
    """
    SSH to Pi, parse Broadlink .storage, and populate the database.
    Returns (devices_count, buttons_count).
    """
    storage = read_broadlink_storage(ssh_host, ssh_port, ssh_user, storage_path, key_file)
    devices = 0
    buttons = 0
    for device_name, commands in storage.items():
        dev_id = db.get_or_create_device(device_name)
        devices += 1
        for cmd_name, ir_code in commands.items():
            # Skip multi-command keys (spaces) and alternate-format keys (leading -)
            if " " in cmd_name or cmd_name.startswith("-"):
                continue
            db.upsert_button_with_code(dev_id, cmd_name, ir_code)
            buttons += 1
    return devices, buttons


def get_learned_code(ssh_host, ssh_port, ssh_user, storage_path, key_file, device_name, button_name):
    """After learn_command succeeds, extract the newly stored code from .storage."""
    storage = read_broadlink_storage(ssh_host, ssh_port, ssh_user, storage_path, key_file)
    code = storage.get(device_name, {}).get(button_name)
    return code
