from datetime import date, timedelta

import pytest

from .conftest import payload


def d(days: int) -> str:
    return (date.today() + timedelta(days=days)).isoformat()


@pytest.fixture
def user(client):
    assert client.post("/api/register", json=payload()).status_code == 201  # meldet an
    return client


def absence(**overrides):
    data = {
        "start_date": d(7),
        "end_date": d(21),
        "location": "Mallorca",
        "emergency_contact": {"name": "Max Mustermann", "phone": "030 / 123 456"},
        "note": "Pflanzen werden gegossen",
    }
    data.update(overrides)
    return data


def test_requires_login(client):
    assert client.get("/api/absences").status_code == 401
    assert client.post("/api/absences", json=absence()).status_code == 401


def test_create_and_list(user):
    r = user.post("/api/absences", json=absence())
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["location"] == "Mallorca"
    assert a["emergency_contact"] == {"name": "Max Mustermann", "phone": "+4930123456"}
    assert a["status"] == "geplant"
    assert [x["id"] for x in user.get("/api/absences").json()] == [a["id"]]


def test_optional_fields(user):
    r = user.post("/api/absences", json=absence(
        location="  ", note="", emergency_contact={"name": "", "phone": ""}))
    assert r.status_code == 201, r.text
    a = r.json()
    assert a["location"] is None and a["note"] is None and a["emergency_contact"] is None


def test_single_day_starting_today(user):
    r = user.post("/api/absences", json=absence(start_date=d(0), end_date=d(0)))
    assert r.status_code == 201
    assert r.json()["status"] == "aktuell"


@pytest.mark.parametrize("over,field", [
    ({"start_date": d(10), "end_date": d(5)}, "end_date"),
    ({"start_date": d(-1)}, "start_date"),
    ({"start_date": d(1), "end_date": d(400)}, "end_date"),
    ({"start_date": "kein-datum"}, "start_date"),
    ({"emergency_contact": {"name": "Max", "phone": ""}}, "emergency_contact.phone"),
    ({"emergency_contact": {"name": "", "phone": "0171 1234567"}}, "emergency_contact.name"),
    ({"emergency_contact": {"name": "Max", "phone": "abc"}}, "emergency_contact.phone"),
    ({"location": "x" * 101}, "location"),
    ({"note": "x" * 501}, "note"),
])
def test_validation(user, over, field):
    r = user.post("/api/absences", json=absence(**over))
    assert r.status_code == 422, r.text
    assert field in r.json()["errors"], r.json()


def test_overlap_rejected(user):
    user.post("/api/absences", json=absence(start_date=d(7), end_date=d(14)))
    r = user.post("/api/absences", json=absence(start_date=d(14), end_date=d(20)))
    assert r.status_code == 409
    assert "Überschneidet" in r.json()["errors"]["start_date"]
    # direkt anschließend ist erlaubt
    assert user.post("/api/absences", json=absence(start_date=d(15), end_date=d(20))).status_code == 201


def test_list_sorted(user):
    user.post("/api/absences", json=absence(start_date=d(30), end_date=d(31)))
    user.post("/api/absences", json=absence(start_date=d(2), end_date=d(3)))
    starts = [a["start_date"] for a in user.get("/api/absences").json()]
    assert starts == sorted(starts)


def test_update(user):
    a = user.post("/api/absences", json=absence()).json()
    r = user.put(f"/api/absences/{a['id']}", json=absence(location="Ostsee", end_date=d(10)))
    assert r.status_code == 200
    assert r.json()["location"] == "Ostsee" and r.json()["end_date"] == d(10)


def test_update_does_not_overlap_itself(user):
    a = user.post("/api/absences", json=absence()).json()
    assert user.put(f"/api/absences/{a['id']}", json=absence(end_date=d(25))).status_code == 200


def test_delete(user):
    a = user.post("/api/absences", json=absence()).json()
    assert user.delete(f"/api/absences/{a['id']}").status_code == 204
    assert user.get("/api/absences").json() == []
    assert user.delete(f"/api/absences/{a['id']}").status_code == 404


def test_cannot_touch_other_users_absence(user, client):
    a = user.post("/api/absences", json=absence()).json()
    client.cookies.clear()
    other = payload(email="max@example.de")
    assert client.post("/api/register", json=other).status_code == 201
    assert client.get("/api/absences").json() == []
    assert client.put(f"/api/absences/{a['id']}", json=absence()).status_code == 404
    assert client.delete(f"/api/absences/{a['id']}").status_code == 404


def _insert_raw(start, end):
    from app import db
    with db.connect() as conn:
        conn.execute("INSERT INTO absences (user_id, start_date, end_date) VALUES (1, ?, ?)", (start, end))
        return conn.execute("SELECT max(id) FROM absences").fetchone()[0]


def test_running_absence_can_be_extended(user):
    aid = _insert_raw(d(-3), d(2))  # läuft seit 3 Tagen
    r = user.put(f"/api/absences/{aid}", json=absence(start_date=d(-3), end_date=d(5)))
    assert r.status_code == 200, r.text
    assert r.json()["status"] == "aktuell"
    # Beginn in die Vergangenheit verschieben ist nicht erlaubt
    r = user.put(f"/api/absences/{aid}", json=absence(start_date=d(-4), end_date=d(5)))
    assert r.status_code == 422


def test_past_absences_hidden_and_readonly(user):
    aid = _insert_raw(d(-10), d(-5))
    assert user.get("/api/absences").json() == []
    past = user.get("/api/absences?include_past=true").json()
    assert past[0]["status"] == "vorbei"
    assert user.put(f"/api/absences/{aid}", json=absence()).status_code == 422
