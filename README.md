# Nachbarschaft – Abwesenheiten teilen

App, mit der Bewohner ihre Abwesenheiten erfassen und ihren Nachbarn bekannt geben.

## Architektur

| Teil | Technik | Aufgabe |
|------|---------|---------|
| `backend/`  | Python, FastAPI, SQLite | REST-API, Validierung, Datenhaltung |
| `frontend/` | Node.js, Express        | Liefert die Web-Oberfläche aus, leitet `/api/*` an das Backend weiter |

```
Browser ──> Node.js :3000 ──/api/*──> Python :8000 ──> SQLite (data.db)
```

## Starten

```bash
# Terminal 1 – Python-API
cd backend
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --port 8000

# Terminal 2 – Node.js-Frontend
cd frontend
npm install
npm start          # http://localhost:3000
```

Umgebungsvariablen:
- Backend: `DB_PATH`, `COOKIE_SECURE=true` (in Produktion mit HTTPS setzen)
- Frontend: `PORT`, `API_URL`

## Seiten

| Pfad | Inhalt | Zugriff |
|------|--------|---------|
| `/` | Anmelden | nur abgemeldet (sonst Weiterleitung zu `/start`) |
| `/registrieren` | Registrieren | nur abgemeldet |
| `/start` | Startseite mit eigenen Daten, Abmelden | nur angemeldet (sonst Weiterleitung zu `/`) |

## Tests

```bash
cd backend && python -m pytest
```

## API

### `POST /api/register`

```json
{
  "first_name": "Erika",
  "last_name": "Mustermann",
  "email": "erika@example.de",
  "password": "geheim123",
  "address": { "street": "Hauptstraße", "house_number": "12a", "postal_code": "10115", "city": "Berlin" },
  "mobile_phone": "0171 1234567",
  "birthday": "1985-04-20"
}
```

| Status | Bedeutung |
|--------|-----------|
| 201 | Konto angelegt (Antwort ohne Passwort) |
| 409 | E-Mail-Adresse bereits registriert |
| 422 | Ungültige Eingaben – `errors` enthält `{feld: meldung}` |

Nach erfolgreicher Registrierung ist man direkt angemeldet.

Regeln:
- **E-Mail**: gültiges Format, eindeutig (Groß-/Kleinschreibung egal), wird kleingeschrieben gespeichert
- **Mobilnummer**: wird ins Format `+49…` umgewandelt; deutsche Nummern müssen mit 015/016/017 beginnen, internationale (`+43…`) sind erlaubt
- **Adresse**: Straße, Hausnummer, 5-stellige PLZ, Ort – getrennt gespeichert, damit Nachbarn später gefunden werden können
- **Geburtstag**: optional, muss in der Vergangenheit liegen
- **Passwort**: mind. 8 Zeichen, Buchstaben und Ziffern; gespeichert als scrypt-Hash

### `POST /api/login`

```json
{ "email": "erika@example.de", "password": "geheim123", "remember": false }
```

| Status | Bedeutung |
|--------|-----------|
| 200 | Angemeldet – setzt das Cookie `session` (HttpOnly, SameSite=Lax) |
| 401 | E-Mail-Adresse oder Passwort falsch (bewusst ohne Hinweis, was davon) |
| 429 | Nach 5 Fehlversuchen für diese E-Mail-Adresse 15 Minuten gesperrt |

- Ohne `remember` gilt die Sitzung bis zum Schließen des Browsers (höchstens 12 Stunden), mit `remember` 30 Tage.
- In der Datenbank wird nur ein SHA-256-Hash des Sitzungs-Tokens gespeichert.

### `POST /api/logout`
Beendet die Sitzung serverseitig und löscht das Cookie (204).

### `GET /api/me`
Liefert die Daten des angemeldeten Nutzers, sonst 401.
