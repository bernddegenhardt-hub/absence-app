import pytest

from .conftest import payload


def test_register_success(client):
    r = client.post("/api/register", json=payload())
    assert r.status_code == 201, r.text
    body = r.json()
    assert body["email"] == "erika@example.de"
    assert body["mobile_phone"] == "+491711234567"
    assert body["birthday"] == "1985-04-20"
    assert "password" not in body and "password_hash" not in body


def test_birthday_optional(client):
    r = client.post("/api/register", json=payload(birthday=""))
    assert r.status_code == 201
    assert r.json()["birthday"] is None


def test_duplicate_email(client):
    assert client.post("/api/register", json=payload()).status_code == 201
    r = client.post("/api/register", json=payload(email="erika@example.DE"))
    assert r.status_code == 409


@pytest.mark.parametrize("field,value,err_key", [
    ("email", "keine-mail", "email"),
    ("mobile_phone", "030 1234567", "mobile_phone"),
    ("mobile_phone", "abc", "mobile_phone"),
    ("birthday", "2999-01-01", "birthday"),
    ("first_name", "", "first_name"),
    ("password", "kurz1", "password"),
    ("password", "nurbuchstaben", "password"),
])
def test_invalid_fields(client, field, value, err_key):
    r = client.post("/api/register", json=payload(**{field: value}))
    assert r.status_code == 422
    assert err_key in r.json()["errors"]


def test_invalid_postal_code(client):
    p = payload()
    p["address"]["postal_code"] = "1234"
    r = client.post("/api/register", json=p)
    assert r.status_code == 422
    assert "address.postal_code" in r.json()["errors"]


def test_international_mobile(client):
    r = client.post("/api/register", json=payload(mobile_phone="+43 664 1234567"))
    assert r.status_code == 201
    assert r.json()["mobile_phone"] == "+436641234567"


def test_register_logs_in(client):
    client.post("/api/register", json=payload())
    r = client.get("/api/me")
    assert r.status_code == 200
    assert r.json()["email"] == "erika@example.de"
