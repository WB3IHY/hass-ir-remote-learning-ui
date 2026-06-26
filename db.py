import sqlite3
from contextlib import contextmanager

_db_file = "ir_codes.db"


def configure(db_file):
    global _db_file
    _db_file = db_file


@contextmanager
def get_db():
    conn = sqlite3.connect(_db_file)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def init_db():
    with get_db() as conn:
        conn.executescript("""
            CREATE TABLE IF NOT EXISTS devices (
                id   INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT UNIQUE NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS buttons (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                device_id INTEGER NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
                name      TEXT NOT NULL,
                ir_code   TEXT,
                learned_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(device_id, name)
            );
        """)


def get_all_devices():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM devices ORDER BY name").fetchall()
        result = []
        for d in rows:
            btns = conn.execute(
                "SELECT id, name, ir_code IS NOT NULL AS learned FROM buttons "
                "WHERE device_id = ? ORDER BY name",
                (d["id"],),
            ).fetchall()
            result.append({
                "id": d["id"],
                "name": d["name"],
                "buttons": [dict(b) for b in btns],
            })
        return result


def create_device(name):
    with get_db() as conn:
        cur = conn.execute("INSERT INTO devices (name) VALUES (?)", (name,))
        return cur.lastrowid


def get_or_create_device(name):
    with get_db() as conn:
        row = conn.execute("SELECT id FROM devices WHERE name = ?", (name,)).fetchone()
        if row:
            return row["id"]
        cur = conn.execute("INSERT INTO devices (name) VALUES (?)", (name,))
        return cur.lastrowid


def delete_device(device_id):
    with get_db() as conn:
        conn.execute("DELETE FROM devices WHERE id = ?", (device_id,))


def add_button(device_id, name):
    with get_db() as conn:
        cur = conn.execute(
            "INSERT OR IGNORE INTO buttons (device_id, name) VALUES (?, ?)",
            (device_id, name),
        )
        if cur.rowcount == 0:
            row = conn.execute(
                "SELECT id FROM buttons WHERE device_id = ? AND name = ?",
                (device_id, name),
            ).fetchone()
            return row["id"]
        return cur.lastrowid


def delete_button(button_id):
    with get_db() as conn:
        conn.execute("DELETE FROM buttons WHERE id = ?", (button_id,))


def get_button(button_id):
    with get_db() as conn:
        row = conn.execute(
            "SELECT b.*, d.name AS device_name "
            "FROM buttons b JOIN devices d ON b.device_id = d.id "
            "WHERE b.id = ?",
            (button_id,),
        ).fetchone()
        return dict(row) if row else None


def save_button_code(button_id, ir_code):
    with get_db() as conn:
        conn.execute(
            "UPDATE buttons SET ir_code = ?, learned_at = CURRENT_TIMESTAMP WHERE id = ?",
            (ir_code, button_id),
        )


def upsert_button_with_code(device_id, name, ir_code):
    with get_db() as conn:
        conn.execute(
            """
            INSERT INTO buttons (device_id, name, ir_code, learned_at)
            VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            ON CONFLICT(device_id, name) DO UPDATE SET
                ir_code    = excluded.ir_code,
                learned_at = CURRENT_TIMESTAMP
            """,
            (device_id, name, ir_code),
        )
