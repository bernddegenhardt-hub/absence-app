# language: de
Funktionalität: Geburtsdatum bei der Registrierung
  Das Geburtsdatum ist freiwillig. Es kann als Text (TT.MM.JJJJ)
  oder über drei Auswahlfelder (Tag, Monat, Jahr) eingegeben werden.

  # Die Bedienmechanik (Punkte beim Tippen, Umschalten zwischen den Ansichten,
  # Tage pro Monat, Handy-Layout) prüft frontend/tests/geburtsdatum.e2e.cjs.

  Grundlage:
    Angenommen ich öffne die Registrierungsseite
    Und ich fülle das Registrierungsformular für "Max Mustermann" gültig aus

  # ---------- Gültige Eingaben ----------

  Szenario: Registrierung ohne Geburtsdatum
    Wenn ich auf "Konto erstellen" klicke
    Dann bin ich auf der Startseite
    Und im Profil steht kein "Geburtstag"

  Szenariogrundriss: Geburtsdatum im Textfeld
    Wenn ich als Geburtsdatum "<eingabe>" eingebe
    Und ich auf "Konto erstellen" klicke
    Dann bin ich auf der Startseite
    Und im Profil steht bei "Geburtstag" "<im Profil>"

    Beispiele:
      | eingabe    | im Profil  | Hinweis                  |
      | 20.04.1985 | 20.04.1985 | übliche Schreibweise     |
      | 20041985   | 20.04.1985 | eingefügt, ohne Punkte   |
      | 29.02.2000 | 29.02.2000 | 29. Februar im Schaltjahr |

  Szenario: Geburtsdatum über die Auswahlfelder
    Wenn ich als Geburtsdatum Tag "5", Monat "März" und Jahr "1990" auswähle
    Und ich auf "Konto erstellen" klicke
    Dann bin ich auf der Startseite
    Und im Profil steht bei "Geburtstag" "05.03.1990"

  Szenario: Nach einer Korrektur wird das Datum angenommen
    Wenn ich als Geburtsdatum "31.02.1990" eingebe
    Und ich auf "Konto erstellen" klicke
    Dann steht beim Feld "Geburtsdatum" der Fehler "Dieses Datum gibt es nicht. Bitte überprüfen Sie die Eingabe."
    Wenn ich als Geburtsdatum "28.02.1990" eingebe
    Und ich auf "Konto erstellen" klicke
    Dann bin ich auf der Startseite
    Und im Profil steht bei "Geburtstag" "28.02.1990"

  # ---------- Ungültige Eingaben (werden nicht abgeschickt) ----------

  Szenariogrundriss: Ungültiges Geburtsdatum im Textfeld
    Wenn ich als Geburtsdatum "<eingabe>" eingebe
    Und ich auf "Konto erstellen" klicke
    Dann steht beim Feld "Geburtsdatum" der Fehler "<fehler>"
    Und ich sehe keine Meldung
    Und ich bin auf der Registrierungsseite

    Beispiele:
      | eingabe    | fehler                                                                             |
      | 12.3       | Bitte im Format TT.MM.JJJJ eingeben                                                |
      | 1.2.85     | Bitte im Format TT.MM.JJJJ eingeben                                                |
      | abc        | Bitte im Format TT.MM.JJJJ eingeben                                                |
      | 31.02.1990 | Dieses Datum gibt es nicht. Bitte überprüfen Sie die Eingabe.                      |
      | 29.02.2001 | Dieses Datum gibt es nicht. Bitte überprüfen Sie die Eingabe.                      |
      | 15.13.1990 | Dieses Datum gibt es nicht. Bitte überprüfen Sie die Eingabe.                      |
      | 01.01.2099 | Geburtsdatum muss in der Vergangenheit liegen. Bitte überprüfen Sie die Eingabe.   |
      | 01.01.1800 | Geburtsdatum ist unplausibel. Bitte überprüfen Sie die Eingabe.                    |

  Szenariogrundriss: Unvollständige Auswahl
    Wenn ich als Geburtsdatum Tag "<tag>", Monat "<monat>" und Jahr "<jahr>" auswähle
    Und ich auf "Konto erstellen" klicke
    Dann steht beim Feld "Geburtsdatum" der Fehler "Bitte Tag, Monat und Jahr vollständig angeben"
    Und ich sehe keine Meldung
    Und ich bin auf der Registrierungsseite

    Beispiele:
      | tag | monat | jahr |
      | 5   |       |      |
      | 5   | März  |      |
      |     | März  | 1990 |
