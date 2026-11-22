// Geburtsdatum: wahlweise Textfeld (TT.MM.JJJJ) oder drei Auswahlfelder (Tag/Monat/Jahr).
// Beide Ansichten liefern denselben Wert: null oder "JJJJ-MM-TT".
const Birthday = (() => {
  const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli",
                  "August", "September", "Oktober", "November", "Dezember"];
  const MAX_AGE = 120; // wie im Backend (schemas.py)
  const STORAGE_KEY = "birthday_mode";

  const form = document.getElementById("register-form");
  const textView = document.getElementById("birthday-text-view");
  const selectView = document.getElementById("birthday-select-view");
  const text = form.birthday_text;
  const day = form.birthday_day;
  const month = form.birthday_month;
  const year = form.birthday_year;
  const thisYear = new Date().getFullYear();

  const pad = (n) => String(n).padStart(2, "0");
  const isLeap = (y) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  const daysInMonth = (m, y) => [31, isLeap(y) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];

  function addOptions(select, items) {
    for (const [value, label] of items) select.add(new Option(label, value));
  }

  // --- Auswahlfelder befüllen -------------------------------------------
  addOptions(month, MONTHS.map((name, i) => [String(i + 1), name]));
  addOptions(year, Array.from({ length: MAX_AGE + 1 }, (_, i) => String(thisYear - i)).map((y) => [y, y]));

  function updateDays() {
    // Ohne Jahr ein Schaltjahr annehmen, damit der 29. Februar wählbar bleibt.
    const max = month.value ? daysInMonth(+month.value, year.value ? +year.value : 2000) : 31;
    const selected = day.value;
    day.length = 1; // nur "–" behalten
    addOptions(day, Array.from({ length: max }, (_, i) => [String(i + 1), String(i + 1)]));
    day.value = selected && +selected <= max ? selected : "";
  }
  month.addEventListener("change", updateDays);
  year.addEventListener("change", updateDays);
  updateDays();

  // --- Textfeld: Punkte beim Tippen automatisch einfügen -------------------
  text.addEventListener("input", (e) => {
    if (e.inputType && !e.inputType.startsWith("insert")) return; // Löschen nicht stören
    if (/^\d{2}$/.test(text.value) || /^\d{1,2}\.\d{2}$/.test(text.value)) text.value += ".";
  });

  // --- Lesen / Schreiben der Teile {d, m, y} ------------------------------
  function partsFromText() {
    const raw = text.value.trim();
    // "20041985" (z. B. eingefügt) wie "20.04.1985" behandeln
    const m = raw.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/) || raw.match(/^(\d{2})(\d{2})(\d{4})$/);
    return m ? { d: +m[1], m: +m[2], y: +m[3] } : null;
  }
  function partsFromSelects() {
    return { d: day.value ? +day.value : null, m: month.value ? +month.value : null, y: year.value ? +year.value : null };
  }

  // Auch halb ausgefüllten Text zerlegen, z. B. "20.", "20.04", "20.04.1985" oder "20041985".
  // Teile, die (noch) keinen gültigen Wert ergeben, werden null.
  function partialPartsFromText() {
    const raw = text.value.trim();
    const segs = /^\d+$/.test(raw) ? [raw.slice(0, 2), raw.slice(2, 4), raw.slice(4, 8)] : raw.split(".");
    const num = (s, re, min, max) => (s && re.test(s) && +s >= min && +s <= max ? +s : null);
    return {
      d: num(segs[0], /^\d{1,2}$/, 1, 31),
      m: num(segs[1], /^\d{1,2}$/, 1, 12),
      y: num(segs[2], /^\d{4}$/, thisYear - MAX_AGE, thisYear),
    };
  }

  // Teile als Text: fehlende Teile am Ende weglassen, Lücken in der Mitte leer lassen.
  function textFromParts({ d, m, y }) {
    if (y) return `${d ? pad(d) : ""}.${m ? pad(m) : ""}.${y}`;
    if (m) return `${d ? pad(d) : ""}.${pad(m)}.`;
    return d ? `${pad(d)}.` : "";
  }

  const sameParts = (a, b) => a.d === b.d && a.m === b.m && a.y === b.y;

  let current = "text";
  const mode = () => current;
  // Originaltext beim Wechsel zu den Auswahlfeldern, damit z. B. ein angefangenes
  // Jahr "19" beim Zurückwechseln nicht verloren geht, solange nichts geändert wurde.
  let textBeforeSwitch = null;

  function setMode(next, { sync = true } = {}) {
    if (sync && next !== current) {
      if (next === "select") {
        const p = partialPartsFromText();
        textBeforeSwitch = { raw: text.value, parts: p };
        month.value = p.m ? String(p.m) : "";
        year.value = p.y ? String(p.y) : "";
        updateDays();
        day.value = p.d ? String(p.d) : "";
      } else {
        const p = partsFromSelects();
        text.value = textBeforeSwitch && sameParts(p, textBeforeSwitch.parts) ? textBeforeSwitch.raw : textFromParts(p);
        textBeforeSwitch = null;
      }
    }
    current = next;
    form.querySelector(`[name="birthday_mode"][value="${next}"]`).checked = true;
    textView.hidden = next !== "text";
    selectView.hidden = next !== "select";
    try { localStorage.setItem(STORAGE_KEY, next); } catch {}
  }

  form.querySelectorAll('[name="birthday_mode"]').forEach((radio) =>
    radio.addEventListener("change", () => setMode(radio.value)),
  );

  let saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch {}
  setMode(saved === "select" ? "select" : "text", { sync: false });

  // --- Ergebnis + Validierung ---------------------------------------------
  function validateParts({ d, m, y }) {
    if (m < 1 || m > 12 || d < 1 || d > daysInMonth(m, y)) return { error: "Dieses Datum gibt es nicht. Bitte überprüfen Sie die Eingabe." };
    const today = new Date();
    const date = new Date(y, m - 1, d);
    today.setHours(0, 0, 0, 0);
    if (date >= today) return { error: "Geburtsdatum muss in der Vergangenheit liegen. Bitte überprüfen Sie die Eingabe." };
    if (thisYear - y > MAX_AGE) return { error: "Geburtsdatum ist unplausibel. Bitte überprüfen Sie die Eingabe." };
    return { value: `${y}-${pad(m)}-${pad(d)}` };
  }

  /** Liefert { value: "JJJJ-MM-TT" | null } oder { error: "…" }. */
  function read() {
    if (mode() === "text") {
      if (!text.value.trim()) return { value: null };
      const p = partsFromText();
      return p ? validateParts(p) : { error: "Bitte im Format TT.MM.JJJJ eingeben" };
    }
    const p = partsFromSelects();
    const filled = [p.d, p.m, p.y].filter(Boolean).length;
    if (filled === 0) return { value: null };
    if (filled < 3) return { error: "Bitte Tag, Monat und Jahr vollständig angeben" };
    return validateParts(p);
  }

  /** Die gerade sichtbaren Felder (zum Markieren bei Fehlern). */
  function inputs() {
    return mode() === "text" ? [text] : [day, month, year];
  }

  return { read, inputs };
})();
