import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def client(tmp_path, monkeypatch):
    from app import db
    monkeypatch.setattr(db, "DB_PATH", str(tmp_path / "test.db"))
    from app.main import app
    with TestClient(app) as c:
        yield c


def payload(**overrides):
    data = {
        "first_name": "Erika",
        "last_name": "Mustermann",
        "email": "Erika@Example.de",
        "password": "geheim123",
        "address": {"street": "Hauptstraße", "house_number": "12a",
                    "postal_code": "10115", "city": "Berlin"},
        "mobile_phone": "0171 / 123 45 67",
        "birthday": "1985-04-20",
    }
    data.update(overrides)
    return data
