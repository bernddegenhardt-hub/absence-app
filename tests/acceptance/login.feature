# language: de
Funktionalität: Anmelden
  Als Bewohner möchte ich mich anmelden,
  um meine Abwesenheiten zu verwalten.

  Szenario: Anmeldeseite wird angezeigt
    Wenn ich die Anmeldeseite öffne
    Dann sehe ich den Titel "Anmelden – Nachbarschaft"

  Szenario: Erfolgreiche Anmeldung
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite
    Und ich sehe die Begrüßung "Hallo, Max!"

  Szenariogrundriss: Anmeldung mit falschen Zugangsdaten
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich mich mit "<email>" und Passwort "<passwort>" anmelde
    Dann sehe ich die Meldung "E-Mail-Adresse oder Passwort ist falsch"
    Und das Passwortfeld ist leer
    Und ich bin auf der Anmeldeseite

    Beispiele:
      | email          | passwort  |
      | max@example.de | Falsch123 |
      | wer@example.de | Geheim123 |

  Szenario: Startseite ist ohne Anmeldung nicht erreichbar
    Wenn ich die Startseite öffne
    Dann bin ich auf der Anmeldeseite

  Szenario: Angemeldete Nutzer werden von der Anmeldeseite weitergeleitet
    Angenommen ich bin als "Max Mustermann" angemeldet
    Wenn ich die Anmeldeseite öffne
    Dann bin ich auf der Startseite

  Szenario: Abmelden
    Angenommen ich bin als "Max Mustermann" angemeldet
    Und ich öffne die Startseite
    Wenn ich auf "Abmelden" klicke
    Dann bin ich auf der Anmeldeseite
    Wenn ich die Startseite öffne
    Dann bin ich auf der Anmeldeseite

  Szenario: Von der Anmeldung zur Registrierung wechseln
    Angenommen ich öffne die Anmeldeseite
    Wenn ich auf "Jetzt registrieren" klicke
    Dann bin ich auf der Registrierungsseite
