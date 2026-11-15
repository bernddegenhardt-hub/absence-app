"""Sitzungen (Login per HttpOnly-Cookie) und Schutz gegen Passwort-Raten."""
import hashlib
import os
import secrets
from datetime import datetime, timedelta, timezone

from fastapi import HTTPException, Request, Response, status

from . import db

COOKIE_NAME = "session"
COOKIE_SECURE = os.environ.get("COOKIE_SECURE", "false").lower() == "true"
SESSION_SHORT = timedelta(hours=12)      # ohne "Angemeldet bleiben"
SESSION_LONG = timedelta(days=30)        # mit "Angemeldet bleiben"

MAX_FAILED_ATTEMPTS = 5
LOCK_WINDOW = timedelta(minutes=15)

_FMT = "%Y-%m-%d %H:%M:%S"


def _now() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def create_session(conn, user_id: int, response: Response, remember: bool) -> None:
    token = secrets.token_urlsafe(32)
    lifetime = SESSION_LONG if remember else SESSION_SHORT
    conn.execute(
        "INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)",
        (_hash_token(token), user_id, (_now() + lifetime).strftime(_FMT)),
    )
    response.set_cookie(
        COOKIE_NAME, token,
        max_age=int(lifetime.total_seconds()) if remember else None,
        httponly=True, secure=COOKIE_SECURE, samesite="lax", path="/",
    )


def delete_session(request: Request, response: Response) -> None:
    token = request.cookies.get(COOKIE_NAME)
    if token:
        with db.connect() as conn:
            conn.execute("DELETE FROM sessions WHERE token_hash = ?", (_hash_token(token),))
    response.delete_cookie(COOKIE_NAME, path="/")


def current_user(request: Request):
    """FastAPI-Dependency: liefert den angemeldeten Nutzer oder 401."""
    token = request.cookies.get(COOKIE_NAME)
    if token:
        with db.connect() as conn:
            row = conn.execute(
                """SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
                   WHERE s.token_hash = ? AND s.expires_at > ?""",
                (_hash_token(token), _now().strftime(_FMT)),
            ).fetchone()
        if row:
            return row
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Nicht angemeldet")


def is_locked(conn, email: str) -> bool:
    since = (_now() - LOCK_WINDOW).strftime(_FMT)
    (count,) = conn.execute(
        "SELECT COUNT(*) FROM login_attempts WHERE email = ? AND attempted_at > ?", (email, since)
    ).fetchone()
    return count >= MAX_FAILED_ATTEMPTS


def record_failure(conn, email: str) -> None:
    conn.execute("INSERT INTO login_attempts (email, attempted_at) VALUES (?, ?)",
                 (email, _now().strftime(_FMT)))


def clear_failures(conn, email: str) -> None:
    conn.execute("DELETE FROM login_attempts WHERE email = ?", (email,))
    conn.execute("DELETE FROM sessions WHERE expires_at <= ?", (_now().strftime(_FMT),))
