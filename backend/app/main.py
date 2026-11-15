"""Python-API der Nachbarschafts-App."""
import sqlite3
from contextlib import asynccontextmanager

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from . import auth, db
from .schemas import Address, LoginRequest, RegistrationRequest, UserOut
from .security import DUMMY_HASH, hash_password, verify_password


@asynccontextmanager
async def lifespan(_app: FastAPI):
    db.init_db()
    yield


app = FastAPI(title="Nachbarschaft API", lifespan=lifespan)


@app.exception_handler(RequestValidationError)
async def validation_handler(_req: Request, exc: RequestValidationError):
    """Liefert Validierungsfehler als {feld: meldung} für das Formular."""
    errors: dict[str, str] = {}
    for err in exc.errors():
        loc = [str(p) for p in err["loc"] if p != "body"]
        field = ".".join(loc) or "_"
        msg = err["msg"].removeprefix("Value error, ")
        errors.setdefault(field, msg)
    return JSONResponse(status_code=422, content={"detail": "Ungültige Eingaben", "errors": errors})


def _row_to_user(row: sqlite3.Row) -> UserOut:
    return UserOut(
        id=row["id"],
        first_name=row["first_name"],
        last_name=row["last_name"],
        email=row["email"],
        address=Address(
            street=row["street"], house_number=row["house_number"],
            postal_code=row["postal_code"], city=row["city"], country=row["country"],
        ),
        mobile_phone=row["mobile_phone"],
        birthday=row["birthday"],
        created_at=row["created_at"],
    )


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.post("/api/register", response_model=UserOut, status_code=status.HTTP_201_CREATED)
def register(data: RegistrationRequest, response: Response):
    a = data.address
    try:
        with db.connect() as conn:
            cur = conn.execute(
                """INSERT INTO users (first_name, last_name, email, password_hash, street,
                       house_number, postal_code, city, country, mobile_phone, birthday)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (data.first_name, data.last_name, data.email, hash_password(data.password),
                 a.street, a.house_number, a.postal_code, a.city, a.country,
                 data.mobile_phone, data.birthday.isoformat() if data.birthday else None),
            )
            row = conn.execute("SELECT * FROM users WHERE id = ?", (cur.lastrowid,)).fetchone()
            auth.create_session(conn, row["id"], response, remember=False)  # direkt angemeldet
    except sqlite3.IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Diese E-Mail-Adresse ist bereits registriert",
        )
    return _row_to_user(row)


INVALID_LOGIN = "E-Mail-Adresse oder Passwort ist falsch"


@app.post("/api/login", response_model=UserOut)
def login(data: LoginRequest, response: Response):
    with db.connect() as conn:
        if auth.is_locked(conn, data.email):
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen.",
            )
        row = conn.execute("SELECT * FROM users WHERE email = ?", (data.email,)).fetchone()
        ok = verify_password(data.password, row["password_hash"] if row else DUMMY_HASH)
        if not (row and ok):
            auth.record_failure(conn, data.email)
            conn.commit()
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_LOGIN)
        auth.clear_failures(conn, data.email)
        auth.create_session(conn, row["id"], response, remember=data.remember)
    return _row_to_user(row)


@app.post("/api/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(request: Request, response: Response):
    auth.delete_session(request, response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@app.get("/api/me", response_model=UserOut)
def me(user=Depends(auth.current_user)):
    return _row_to_user(user)
