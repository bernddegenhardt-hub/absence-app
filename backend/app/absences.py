"""Abwesenheiten erfassen, ansehen, ändern und löschen (nur die eigenen)."""
from datetime import date, timedelta
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Response, status
from pydantic import BaseModel, Field, field_validator, model_validator

from . import auth, db
from .schemas import _NAME_RE, normalize_phone

router = APIRouter(prefix="/api/absences", tags=["Abwesenheiten"])

MAX_DURATION = timedelta(days=365)


def _clean(v):
    """Leere Zeichenketten als 'nicht angegeben' behandeln."""
    if isinstance(v, str):
        v = v.strip()
        return v or None
    return v


class EmergencyContact(BaseModel):
    name: str = Field(min_length=2, max_length=100)
    phone: str

    @field_validator("name", "phone", mode="before")
    @classmethod
    def strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not _NAME_RE.fullmatch(v):
            raise ValueError("Name enthält ungültige Zeichen")
        return v

    @field_validator("phone")
    @classmethod
    def check_phone(cls, v: str) -> str:
        return normalize_phone(v)


class AbsenceIn(BaseModel):
    start_date: date
    end_date: date
    location: Optional[str] = Field(default=None, max_length=100)
    emergency_contact: Optional[EmergencyContact] = None
    note: Optional[str] = Field(default=None, max_length=500)

    @field_validator("location", "note", mode="before")
    @classmethod
    def empty_to_none(cls, v):
        return _clean(v)

    @field_validator("emergency_contact", mode="before")
    @classmethod
    def empty_contact(cls, v):
        # Komplett leerer Kontakt = kein Kontakt; halb ausgefüllt wird unten abgelehnt.
        if isinstance(v, dict) and not any(_clean(x) for x in v.values()):
            return None
        return v

    @model_validator(mode="after")
    def check_dates(self):
        if self.end_date < self.start_date:
            raise ValueError("end_date: Das Ende darf nicht vor dem Beginn liegen")
        if self.end_date - self.start_date > MAX_DURATION:
            raise ValueError("end_date: Eine Abwesenheit darf höchstens ein Jahr dauern")
        return self


class AbsenceOut(BaseModel):
    id: int
    start_date: date
    end_date: date
    location: Optional[str]
    emergency_contact: Optional[EmergencyContact]
    note: Optional[str]
    status: str  # "geplant" | "aktuell" | "vorbei"


def _to_out(row) -> AbsenceOut:
    today = date.today()
    start, end = date.fromisoformat(row["start_date"]), date.fromisoformat(row["end_date"])
    contact = None
    if row["contact_name"]:
        contact = EmergencyContact.model_construct(name=row["contact_name"], phone=row["contact_phone"])
    return AbsenceOut(
        id=row["id"], start_date=start, end_date=end, location=row["location"],
        emergency_contact=contact, note=row["note"],
        status="vorbei" if end < today else "aktuell" if start <= today else "geplant",
    )


def _error(field: str, msg: str, code=422):
    return HTTPException(status_code=code, detail={"detail": msg, "errors": {field: msg}})


def _check_rules(conn, user_id: int, data: AbsenceIn, existing=None) -> None:
    today = date.today()
    # Beginn in der Vergangenheit nur erlaubt, wenn er bei einer laufenden Abwesenheit unverändert bleibt.
    unchanged_start = existing is not None and existing["start_date"] == data.start_date.isoformat()
    if data.start_date < today and not unchanged_start:
        raise _error("start_date", "Der Beginn darf nicht in der Vergangenheit liegen")
    if data.end_date < today:
        raise _error("end_date", "Das Ende darf nicht in der Vergangenheit liegen")
    overlap = conn.execute(
        """SELECT start_date, end_date FROM absences
           WHERE user_id = ? AND id != ? AND start_date <= ? AND end_date >= ?""",
        (user_id, existing["id"] if existing else -1, data.end_date.isoformat(), data.start_date.isoformat()),
    ).fetchone()
    if overlap:
        s, e = (date.fromisoformat(x).strftime("%d.%m.%Y") for x in overlap)
        raise _error("start_date", f"Überschneidet sich mit deiner Abwesenheit vom {s} bis {e}",
                     status.HTTP_409_CONFLICT)


def _values(data: AbsenceIn):
    c = data.emergency_contact
    return (data.start_date.isoformat(), data.end_date.isoformat(), data.location,
            c.name if c else None, c.phone if c else None, data.note)


def _get_own(conn, user_id: int, absence_id: int):
    row = conn.execute("SELECT * FROM absences WHERE id = ? AND user_id = ?",
                       (absence_id, user_id)).fetchone()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Abwesenheit nicht gefunden")
    return row


@router.get("", response_model=list[AbsenceOut])
def list_absences(include_past: bool = False, user=Depends(auth.current_user)):
    sql = "SELECT * FROM absences WHERE user_id = ?"
    params: list = [user["id"]]
    if not include_past:
        sql += " AND end_date >= ?"
        params.append(date.today().isoformat())
    with db.connect() as conn:
        rows = conn.execute(sql + " ORDER BY start_date", params).fetchall()
    return [_to_out(r) for r in rows]


@router.post("", response_model=AbsenceOut, status_code=status.HTTP_201_CREATED)
def create_absence(data: AbsenceIn, user=Depends(auth.current_user)):
    with db.connect() as conn:
        _check_rules(conn, user["id"], data)
        cur = conn.execute(
            """INSERT INTO absences (user_id, start_date, end_date, location,
                   contact_name, contact_phone, note) VALUES (?,?,?,?,?,?,?)""",
            (user["id"], *_values(data)),
        )
        row = conn.execute("SELECT * FROM absences WHERE id = ?", (cur.lastrowid,)).fetchone()
    return _to_out(row)


@router.put("/{absence_id}", response_model=AbsenceOut)
def update_absence(absence_id: int, data: AbsenceIn, user=Depends(auth.current_user)):
    with db.connect() as conn:
        existing = _get_own(conn, user["id"], absence_id)
        if existing["end_date"] < date.today().isoformat():
            raise _error("_", "Vergangene Abwesenheiten können nicht mehr geändert werden")
        _check_rules(conn, user["id"], data, existing)
        conn.execute(
            """UPDATE absences SET start_date=?, end_date=?, location=?, contact_name=?,
                   contact_phone=?, note=?, updated_at=datetime('now') WHERE id=?""",
            (*_values(data), absence_id),
        )
        row = conn.execute("SELECT * FROM absences WHERE id = ?", (absence_id,)).fetchone()
    return _to_out(row)


@router.delete("/{absence_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_absence(absence_id: int, user=Depends(auth.current_user)):
    with db.connect() as conn:
        _get_own(conn, user["id"], absence_id)
        conn.execute("DELETE FROM absences WHERE id = ?", (absence_id,))
    return Response(status_code=status.HTTP_204_NO_CONTENT)
