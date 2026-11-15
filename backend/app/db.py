"""SQLite-Datenhaltung."""
import os
import sqlite3
from contextlib import contextmanager
from typing import Optional

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "..", "data.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users (
    id            INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name    TEXT NOT NULL,
    last_name     TEXT NOT NULL,
    email         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    password_hash TEXT NOT NULL,
    street        TEXT NOT NULL,
    house_number  TEXT NOT NULL,
    postal_code   TEXT NOT NULL,
    city          TEXT NOT NULL,
    country       TEXT NOT NULL DEFAULT 'DE',
    mobile_phone  TEXT NOT NULL,
    birthday      TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_address ON users (postal_code, street);
"""


def init_db(path: Optional[str] = None) -> None:
    with connect(path) as conn:
        conn.executescript(SCHEMA)


@contextmanager
def connect(path: Optional[str] = None):
    conn = sqlite3.connect(path or DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()
