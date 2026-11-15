"""Validierung der Registrierungsdaten."""
import re
from datetime import date

from pydantic import BaseModel, EmailStr, Field, field_validator

_NAME_RE = re.compile(r"^[A-Za-zÀ-ÖØ-öø-ÿĀ-žẞß' .-]+$")


def normalize_mobile(raw: str) -> str:
    """Normalisiert eine Mobilnummer ins E.164-Format (+49...).

    Akzeptiert z. B. '0171 1234567', '+49 (171) 123-4567', '0049171...'.
    """
    s = re.sub(r"[\s\-/().]", "", raw.strip())
    if s.startswith("00"):
        s = "+" + s[2:]
    elif s.startswith("0"):
        s = "+49" + s[1:]  # nationale deutsche Nummer
    if not re.fullmatch(r"\+[1-9]\d{6,14}", s):
        raise ValueError("Ungültige Mobilnummer")
    if s.startswith("+49") and not re.match(r"\+491[5-7]\d", s):
        raise ValueError("Keine deutsche Mobilnummer (muss mit 015, 016 oder 017 beginnen)")
    return s


class Address(BaseModel):
    street: str = Field(min_length=2, max_length=100)
    house_number: str = Field(min_length=1, max_length=10)
    postal_code: str
    city: str = Field(min_length=2, max_length=100)
    country: str = Field(default="DE", pattern=r"^[A-Z]{2}$")

    @field_validator("street", "city", "house_number", "postal_code", mode="before")
    @classmethod
    def strip(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("house_number")
    @classmethod
    def check_house_number(cls, v: str) -> str:
        if not re.fullmatch(r"\d+\s?[a-zA-Z]?(\s?-\s?\d+\s?[a-zA-Z]?)?", v):
            raise ValueError("Ungültige Hausnummer")
        return v

    @field_validator("postal_code")
    @classmethod
    def check_postal_code(cls, v: str) -> str:
        if not re.fullmatch(r"\d{5}", v):
            raise ValueError("Postleitzahl muss aus 5 Ziffern bestehen")
        return v


class RegistrationRequest(BaseModel):
    first_name: str = Field(min_length=1, max_length=60)
    last_name: str = Field(min_length=1, max_length=60)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    address: Address
    mobile_phone: str
    birthday: date | None = None

    @field_validator("first_name", "last_name", mode="before")
    @classmethod
    def strip_name(cls, v):
        return v.strip() if isinstance(v, str) else v

    @field_validator("first_name", "last_name")
    @classmethod
    def check_name(cls, v: str) -> str:
        if not _NAME_RE.fullmatch(v):
            raise ValueError("Name enthält ungültige Zeichen")
        return v

    @field_validator("email")
    @classmethod
    def lower_email(cls, v: str) -> str:
        return v.lower()

    @field_validator("password")
    @classmethod
    def check_password(cls, v: str) -> str:
        if not (re.search(r"[A-Za-z]", v) and re.search(r"\d", v)):
            raise ValueError("Passwort muss Buchstaben und Ziffern enthalten")
        return v

    @field_validator("mobile_phone")
    @classmethod
    def check_mobile(cls, v: str) -> str:
        return normalize_mobile(v)

    @field_validator("birthday", mode="before")
    @classmethod
    def empty_birthday(cls, v):
        return None if v in ("", None) else v

    @field_validator("birthday")
    @classmethod
    def check_birthday(cls, v: date | None) -> date | None:
        if v is None:
            return v
        today = date.today()
        if v >= today:
            raise ValueError("Geburtstag muss in der Vergangenheit liegen")
        if today.year - v.year > 120:
            raise ValueError("Geburtstag ist unplausibel")
        return v


class LoginRequest(BaseModel):
    email: str = Field(max_length=254)
    password: str = Field(max_length=128)
    remember: bool = False

    @field_validator("email")
    @classmethod
    def norm_email(cls, v: str) -> str:
        return v.strip().lower()


class UserOut(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: str
    address: Address
    mobile_phone: str
    birthday: date | None
    created_at: str
