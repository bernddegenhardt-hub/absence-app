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

  # ---------- Pflichtfelder ----------

  Szenario: Leeres Anmeldeformular
    Angenommen ich öffne die Anmeldeseite
    Wenn ich mich mit "" und Passwort "" anmelde
    Dann steht beim Feld "E-Mail-Adresse" der Fehler "Bitte E-Mail-Adresse eingeben"
    Und beim Feld "Passwort" steht der Fehler "Bitte Passwort eingeben"
    Und ich bin auf der Anmeldeseite

  Szenariogrundriss: Ein Pflichtfeld fehlt bei der Anmeldung
    Angenommen ich öffne die Anmeldeseite
    Wenn ich mich mit "<email>" und Passwort "<passwort>" anmelde
    Dann steht beim Feld "<feld>" der Fehler "<fehler>"
    Und beim Feld "<anderes Feld>" steht kein Fehler
    Und ich sehe keine Meldung
    Und ich bin auf der Anmeldeseite

    Beispiele:
      | email          | passwort  | feld           | fehler                        | anderes Feld   |
      |                | Geheim123 | E-Mail-Adresse | Bitte E-Mail-Adresse eingeben | Passwort       |
      | max@example.de |           | Passwort       | Bitte Passwort eingeben       | E-Mail-Adresse |

  # ---------- Sperre nach Fehlversuchen ----------

  Szenario: Nach 5 Fehlversuchen wird die Anmeldung gesperrt
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich mich 5-mal mit "max@example.de" und einem falschen Passwort anmelde
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann sehe ich die Meldung "Zu viele Fehlversuche. Bitte in 15 Minuten erneut versuchen."
    Und ich bin auf der Anmeldeseite

  Szenario: Nach 4 Fehlversuchen ist die Anmeldung noch möglich
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich mich 4-mal mit "max@example.de" und einem falschen Passwort anmelde
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite

  Szenario: Eine erfolgreiche Anmeldung setzt die Fehlversuche zurück
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Und ich mich 4-mal mit "max@example.de" und einem falschen Passwort anmelde
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Und ich bin auf der Startseite
    Und ich auf "Abmelden" klicke
    Wenn ich mich 4-mal mit "max@example.de" und einem falschen Passwort anmelde
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite

  Szenario: Die Sperre betrifft nur das eine Konto
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und es gibt ein Konto für "Erika Muster" mit "erika@example.de" und Passwort "Geheim456"
    Und ich öffne die Anmeldeseite
    Wenn ich mich 5-mal mit "max@example.de" und einem falschen Passwort anmelde
    Und ich mich mit "erika@example.de" und Passwort "Geheim456" anmelde
    Dann bin ich auf der Startseite
    Und ich sehe die Begrüßung "Hallo, Erika!"

  # ---------- Angemeldet bleiben ----------

  Szenario: Mit "Angemeldet bleiben" übersteht die Anmeldung einen Browser-Neustart
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich "Angemeldet bleiben (30 Tage)" ankreuze
    Und ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite
    Und die Anmeldung ist 30 Tage gültig
    Wenn ich den Browser schließe und wieder öffne
    Und ich die Startseite öffne
    Dann bin ich auf der Startseite

  Szenario: Ohne "Angemeldet bleiben" endet die Anmeldung mit dem Browser
    Angenommen es gibt ein Konto für "Max Mustermann" mit "max@example.de" und Passwort "Geheim123"
    Und ich öffne die Anmeldeseite
    Wenn ich mich mit "max@example.de" und Passwort "Geheim123" anmelde
    Dann bin ich auf der Startseite
    Wenn ich den Browser schließe und wieder öffne
    Und ich die Startseite öffne
    Dann bin ich auf der Anmeldeseite
