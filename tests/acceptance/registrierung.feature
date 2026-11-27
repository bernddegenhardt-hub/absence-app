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
    Und beim Feld "email" steht der Fehler "Diese E-Mail-Adresse ist bereits registriert"
    Und ich bin auf der Registrierungsseite

  Szenario: Angemeldete Nutzer werden von der Registrierung weitergeleitet
    Angenommen ich bin als "Max Mustermann" angemeldet
    Wenn ich die Registrierungsseite öffne
    Dann bin ich auf der Startseite

  Szenario: Von der Registrierung zur Anmeldung wechseln
    Angenommen ich öffne die Registrierungsseite
    Wenn ich auf "Anmelden" klicke
    Dann bin ich auf der Anmeldeseite
