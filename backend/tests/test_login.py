import pytest

from .conftest import payload


@pytest.fixture
def registered(client):
    assert client.post("/api/register", json=payload()).status_code == 201
    client.cookies.clear()  # Registrierung meldet an – für Login-Tests wieder abmelden
    return client


def login(c, email="erika@example.de", password="geheim123", **kw):
    return c.post("/api/login", json={"email": email, "password": password, **kw})


def test_me_requires_login(client):
    assert client.get("/api/me").status_code == 401


def test_login_success(registered):
    r = login(registered, email="  ERIKA@example.de ")
    assert r.status_code == 200
    assert r.json()["first_name"] == "Erika"
    cookie = r.headers["set-cookie"].lower()
    assert "httponly" in cookie and "samesite=lax" in cookie
    assert "max-age" not in cookie  # ohne "Angemeldet bleiben": Sitzungscookie
    assert registered.get("/api/me").status_code == 200


def test_login_remember(registered):
    r = login(registered, remember=True)
    assert "max-age=2592000" in r.headers["set-cookie"].lower()


@pytest.mark.parametrize("email,password", [
    ("erika@example.de", "falsch123"),
    ("unbekannt@example.de", "geheim123"),
])
def test_login_wrong_credentials(registered, email, password):
    r = login(registered, email=email, password=password)
    assert r.status_code == 401
    assert r.json()["detail"] == "E-Mail-Adresse oder Passwort ist falsch"
    assert registered.get("/api/me").status_code == 401


def test_logout(registered):
    login(registered)
    assert registered.post("/api/logout").status_code == 204
    assert registered.get("/api/me").status_code == 401


def test_logout_invalidates_token_server_side(registered):
    login(registered)
    token = registered.cookies.get("session")
    registered.post("/api/logout")
    registered.cookies.set("session", token)  # gestohlenes Cookie wiederverwenden
    assert registered.get("/api/me").status_code == 401


def test_invalid_token(client):
    client.cookies.set("session", "erfunden")
    assert client.get("/api/me").status_code == 401


def test_lockout_after_failed_attempts(registered):
    for _ in range(5):
        assert login(registered, password="falsch123").status_code == 401
    r = login(registered)  # selbst das richtige Passwort wird jetzt abgelehnt
    assert r.status_code == 429


def test_success_resets_failed_attempts(registered):
    for _ in range(4):
        login(registered, password="falsch123")
    assert login(registered).status_code == 200
    for _ in range(4):
        login(registered, password="falsch123")
    assert login(registered).status_code == 200


def test_expired_session(registered, monkeypatch):
    from datetime import timedelta
    from app import auth
    monkeypatch.setattr(auth, "SESSION_SHORT", timedelta(seconds=-1))
    login(registered)
    assert registered.get("/api/me").status_code == 401
