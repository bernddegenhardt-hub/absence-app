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

Umgebungsvariablen: `DB_PATH` (Backend), `PORT` und `API_URL` (Frontend).

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

Regeln:
- **E-Mail**: gültiges Format, eindeutig (Groß-/Kleinschreibung egal), wird kleingeschrieben gespeichert
- **Mobilnummer**: wird ins Format `+49…` umgewandelt; deutsche Nummern müssen mit 015/016/017 beginnen, internationale (`+43…`) sind erlaubt
- **Adresse**: Straße, Hausnummer, 5-stellige PLZ, Ort – getrennt gespeichert, damit Nachbarn später gefunden werden können
- **Geburtstag**: optional, muss in der Vergangenheit liegen
- **Passwort**: mind. 8 Zeichen, Buchstaben und Ziffern; gespeichert als scrypt-Hash
