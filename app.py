import configparser
import os

from flask import Flask, jsonify, request, render_template

import db as database
import ha_client

app = Flask(__name__)

cfg = configparser.ConfigParser()
cfg.read(os.path.join(os.path.dirname(__file__), "config.ini"))

HA = ha_client.HAClient(
    ws_url=cfg["homeassistant"]["ws_url"],
    token=cfg["homeassistant"]["token"],
    remote_entity=cfg["homeassistant"]["remote_entity"],
)

SSH = {
    "host": cfg["ssh"]["host"],
    "port": int(cfg["ssh"]["port"]),
    "user": cfg["ssh"]["user"],
    "key_file": cfg["ssh"].get("key_file") or None,
    "storage_path": cfg["ssh"]["storage_path"],
}

database.configure(cfg["app"].get("db_file", "ir_codes.db"))
database.init_db()


# ── Routes ────────────────────────────────────────────────────────────────────


@app.get("/")
def index():
    return render_template("index.html")


@app.get("/api/devices")
def api_list_devices():
    return jsonify(database.get_all_devices())


@app.post("/api/devices")
def api_create_device():
    body = request.get_json(force=True)
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    buttons = [b.strip() for b in body.get("buttons", []) if b.strip()]
    try:
        dev_id = database.create_device(name)
    except Exception as e:
        return jsonify({"error": str(e)}), 409
    btn_list = []
    for btn_name in buttons:
        btn_id = database.add_button(dev_id, btn_name)
        btn_list.append({"id": btn_id, "name": btn_name, "learned": False})
    return jsonify({"id": dev_id, "name": name, "buttons": btn_list}), 201


@app.delete("/api/devices/<int:device_id>")
def api_delete_device(device_id):
    database.delete_device(device_id)
    return jsonify({"ok": True})


@app.post("/api/devices/<int:device_id>/buttons")
def api_add_button(device_id):
    body = request.get_json(force=True)
    name = (body.get("name") or "").strip()
    if not name:
        return jsonify({"error": "name is required"}), 400
    btn_id = database.add_button(device_id, name)
    return jsonify({"id": btn_id, "name": name, "learned": False}), 201


@app.delete("/api/buttons/<int:button_id>")
def api_delete_button(button_id):
    database.delete_button(button_id)
    return jsonify({"ok": True})


@app.post("/api/buttons/<int:button_id>/learn")
def api_learn_button(button_id):
    btn = database.get_button(button_id)
    if not btn:
        return jsonify({"error": "button not found"}), 404
    device_name = btn["device_name"]
    button_name = btn["name"]
    try:
        HA.learn_command(device_name, button_name)
    except ha_client.HAError as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": f"Connection error: {e}"}), 502

    # Try to capture the raw code via SSH; non-fatal if it fails.
    code = None
    try:
        code = ha_client.get_learned_code(
            SSH["host"], SSH["port"], SSH["user"],
            SSH["storage_path"], SSH["key_file"],
            device_name, button_name,
        )
    except Exception:
        pass  # SSH unavailable — HA still has the code, just not in our DB

    if code:
        database.save_button_code(button_id, code)

    return jsonify({"success": True, "code_stored": code is not None})


@app.post("/api/buttons/<int:button_id>/send")
def api_send_button(button_id):
    btn = database.get_button(button_id)
    if not btn:
        return jsonify({"error": "button not found"}), 404
    try:
        HA.send_command(btn["device_name"], btn["name"])
    except ha_client.HAError as e:
        return jsonify({"success": False, "message": str(e)}), 502
    except Exception as e:
        return jsonify({"success": False, "message": f"Connection error: {e}"}), 502
    return jsonify({"success": True})


@app.post("/api/import")
def api_import():
    try:
        devices, buttons = ha_client.import_from_storage(
            SSH["host"], SSH["port"], SSH["user"],
            SSH["storage_path"], SSH["key_file"],
            database,
        )
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 502
    return jsonify({"success": True, "devices": devices, "buttons": buttons})


if __name__ == "__main__":
    host = cfg["app"].get("host", "0.0.0.0")
    port = int(cfg["app"].get("port", "5000"))
    app.run(host=host, port=port, threaded=True, debug=False)
