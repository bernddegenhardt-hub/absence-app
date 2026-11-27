# language: de
Funktionalität: Registrieren
  Als neuer Bewohner möchte ich ein Konto anlegen,
  um meine Abwesenheiten mit meinen Nachbarn zu teilen.

  Szenario: Registrierungsseite wird angezeigt
    Wenn ich die Registrierungsseite öffne
    Dann sehe ich den Titel "Registrieren – Nachbarschaft"

  Szenario: Erfolgreiche Registrierung
    Angenommen ich öffne die Registrierungsseite
    Wenn ich mich als "Max Mustermann" mit "max@example.de" registriere
    Dann sehe ich die Meldung "Willkommen, Max! Dein Konto wurde erstellt."
    Und ich bin auf der Startseite
    Und im Profil steht bei "Name" "Max Mustermann"
    Und im Profil steht bei "Mobil" "+491711234567"

  Szenario: Nach der Registrierung kann man sich wieder anmelden
    Angenommen ich öffne die Registrierungsseite
    Wenn ich mich als "Max Mustermann" mit "max@example.de" registriere
    Dann bin ich auf der Startseite
    Wenn ich auf "Abmelden" klicke
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite
    Und ich sehe die Begrüßung "Hallo, Max!"

  Szenario: E-Mail-Adresse ist bereits registriert
    Angenommen es gibt ein Konto für "Erika Muster" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Registrierungsseite
    Wenn ich mich als "Max Mustermann" mit "max@example.de" registriere
    Dann sehe ich die Meldung "Diese E-Mail-Adresse ist bereits registriert"
    Und beim Feld "E-Mail-Adresse" steht der Fehler "Diese E-Mail-Adresse ist bereits registriert"
    Und ich bin auf der Registrierungsseite

  Szenario: Angemeldete Nutzer werden von der Registrierung weitergeleitet
    Angenommen ich bin als "Max Mustermann" angemeldet
    Wenn ich die Registrierungsseite öffne
    Dann bin ich auf der Startseite

  Szenario: Von der Registrierung zur Anmeldung wechseln
    Angenommen ich öffne die Registrierungsseite
    Wenn ich auf "Anmelden" klicke
    Dann bin ich auf der Anmeldeseite

  # ---------- Pflichtfelder und Fehlermeldungen ----------

  Szenario: Leeres Registrierungsformular
    Angenommen ich öffne die Registrierungsseite
    Wenn ich auf "Konto erstellen" klicke
    Dann steht bei diesen Feldern der Fehler "Pflichtfeld":
      | Vorname              |
      | Nachname             |
      | E-Mail-Adresse       |
      | Mobile Telefonnummer |
      | Straße               |
      | Hausnr.              |
      | PLZ                  |
      | Ort                  |
    Und beim Feld "Passwort" steht der Fehler "Mindestens 8 Zeichen"
    Und ich bin auf der Registrierungsseite

  Szenariogrundriss: Fehler, die schon im Browser erkannt werden
    Angenommen ich öffne die Registrierungsseite
    Und ich fülle das Registrierungsformular für "Max Mustermann" gültig aus
    Wenn ich bei "<feld>" "<wert>" eintrage
    Und ich auf "Konto erstellen" klicke
    Dann steht beim Feld "<feld>" der Fehler "<fehler>"
    Und ich sehe keine Meldung
    Und ich bin auf der Registrierungsseite

    Beispiele:
      | feld                 | wert      | fehler                           |
      | E-Mail-Adresse       | max@      | Ungültige E-Mail-Adresse         |
      | PLZ                  | 1234      | 5 Ziffern                        |
      | Passwort             | kurz1     | Mindestens 8 Zeichen             |
      | Passwort wiederholen | Anders123 | Passwörter stimmen nicht überein |

  Szenariogrundriss: Fehler, die der Server meldet
    Angenommen ich öffne die Registrierungsseite
    Und ich fülle das Registrierungsformular für "Max Mustermann" gültig aus
    Wenn ich bei "<feld>" "<wert>" eintrage
    Und ich auf "Konto erstellen" klicke
    Dann sehe ich die Meldung "Bitte prüfe die markierten Felder."
    Und beim Feld "<feld>" steht der Fehler "<fehler>"
    Und ich bin auf der Registrierungsseite

    Beispiele:
      | feld                 | wert          | fehler                                                           |
      | Passwort             | nurbuchstaben | Passwort muss Buchstaben und Ziffern enthalten                   |
      | Mobile Telefonnummer | 030 123456    | Keine deutsche Mobilnummer (muss mit 015, 016 oder 017 beginnen) |
      | Vorname              | Max3          | Name enthält ungültige Zeichen                                   |
      | Hausnr.              | abc           | Ungültige Hausnummer                                             |
