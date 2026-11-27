// Funktionale Browser-Tests für das Geburtsdatum im Registrierungsformular.
//
// Voraussetzungen: Backend und Frontend laufen (am besten mit eigener Test-DB, da
// Testkonten angelegt werden) und Google Chrome ist installiert.
//   BASE=http://localhost:3000 npm run test:e2e
const { chromium } = require("playwright-core");

const BASE = process.env.BASE ?? "http://localhost:3000";
const results = [];
let browser;

async function test(name, fn, contextOpts = {}) {
  const context = await browser.newContext(contextOpts);
  const page = await context.newPage();
  const consoleErrors = [];
  page.on("pageerror", (e) => consoleErrors.push(e.message));
  try {
    await page.goto(`${BASE}/registrieren`);
    await fn(page, context);
    if (consoleErrors.length) throw new Error("JS-Fehler: " + consoleErrors.join("; "));
    results.push({ name, ok: true });
  } catch (e) {
    results.push({ name, ok: false, err: e.message.split("\n")[0] });
  } finally {
    await context.close();
  }
}

function eq(actual, expected, label = "") {
  const a = JSON.stringify(actual), b = JSON.stringify(expected);
  if (a !== b) throw new Error(`${label} erwartet ${b}, erhalten ${a}`);
}

const sel = (page) => Promise.all(["day", "month", "year"].map((k) => page.inputValue(`[name=birthday_${k}]`)));
const toSelect = (page) => page.click("text=Auswahlfelder");
const toText = (page) => page.click("text=Eingabefeld");
let n = 0;

async function fillRequired(page) {
  n++;
  await page.fill("[name=first_name]", "Erika");
  await page.fill("[name=last_name]", "Mustermann");
  await page.fill("[name=email]", `e2e${Date.now()}${n}@example.de`);
  await page.fill("[name=mobile_phone]", "0171 1234567");
  await page.fill('[name="address.street"]', "Hauptstraße");
  await page.fill('[name="address.house_number"]', "12a");
  await page.fill('[name="address.postal_code"]', "10115");
  await page.fill('[name="address.city"]', "Berlin");
  await page.fill("[name=password]", "geheim123");
  await page.fill("[name=password_confirm]", "geheim123");
}

async function submitAndGetUser(page) {
  const [res] = await Promise.all([
    page.waitForResponse((r) => r.url().endsWith("/api/register")),
    page.click("button[type=submit]"),
  ]);
  eq(res.status(), 201, "HTTP-Status");
  const me = await page.request.get(`${BASE}/api/me`);
  return me.json();
}

(async () => {
  browser = await chromium.launch({ channel: "chrome", headless: true });

  // --- Darstellung ---------------------------------------------------------
  await test("Startzustand: Eingabefeld sichtbar, Auswahlfelder versteckt", async (page) => {
    eq(await page.isVisible("[name=birthday_text]"), true, "Textfeld");
    eq(await page.isVisible("[name=birthday_day]"), false, "Tag-Auswahl");
    eq(await page.isChecked('[name=birthday_mode][value="text"]'), true, "Schalter");
    eq(await page.getAttribute("[name=birthday_text]", "placeholder"), "TT.MM.JJJJ");
  });

  await test("Auswahllisten: 12 Monate, 121 Jahre (absteigend), 31 Tage", async (page) => {
    await toSelect(page);
    const months = await page.$$eval("[name=birthday_month] option", (o) => o.map((x) => x.textContent));
    eq(months.length, 13, "Monate inkl. –"); eq(months[1], "Januar"); eq(months[12], "Dezember");
    const years = await page.$$eval("[name=birthday_year] option", (o) => o.map((x) => x.value));
    const y = new Date().getFullYear();
    eq(years.length, 122, "Jahre inkl. –"); eq(years[1], String(y)); eq(years[121], String(y - 120));
    eq(await page.$$eval("[name=birthday_day] option", (o) => o.length), 32, "Tage inkl. –");
  });

  // --- Textfeld ------------------------------------------------------------
  await test("Textfeld: Punkte werden beim Tippen automatisch eingefügt", async (page) => {
    await page.type("[name=birthday_text]", "20041985");
    eq(await page.inputValue("[name=birthday_text]"), "20.04.1985");
  });

  await test("Textfeld: Löschen mit Backspace funktioniert über Punkte hinweg", async (page) => {
    await page.type("[name=birthday_text]", "20041985");
    for (let i = 0; i < 6; i++) await page.press("[name=birthday_text]", "Backspace");
    eq(await page.inputValue("[name=birthday_text]"), "20.0");
  });

  // --- Tage passen sich an -------------------------------------------------
  await test("Tage: Februar 2001 = 28, Februar 2000 = 29, Februar ohne Jahr = 29", async (page) => {
    await toSelect(page);
    const count = () => page.$$eval("[name=birthday_day] option", (o) => o.length - 1);
    await page.selectOption("[name=birthday_month]", "2");
    eq(await count(), 29, "ohne Jahr");
    await page.selectOption("[name=birthday_year]", "2001");
    eq(await count(), 28, "2001");
    await page.selectOption("[name=birthday_year]", "2000");
    eq(await count(), 29, "2000");
    await page.selectOption("[name=birthday_month]", "4");
    eq(await count(), 30, "April");
  });

  await test("Tage: 31. wird zurückgesetzt, wenn Monat auf April wechselt; 15. bleibt", async (page) => {
    await toSelect(page);
    await page.selectOption("[name=birthday_day]", "31");
    await page.selectOption("[name=birthday_month]", "4");
    eq(await page.inputValue("[name=birthday_day]"), "", "31. April");
    await page.selectOption("[name=birthday_day]", "15");
    await page.selectOption("[name=birthday_month]", "2");
    eq(await page.inputValue("[name=birthday_day]"), "15", "15. Februar");
  });

  // --- Übernahme beim Umschalten ------------------------------------------
  const textCases = [
    ["20.", ["20", "", ""]],
    ["20.04", ["20", "4", ""]],
    ["20.04.1985", ["20", "4", "1985"]],
    ["31.04.1985", ["", "4", "1985"]],
    ["", ["", "", ""]],
  ];
  for (const [input, expected] of textCases) {
    await test(`Umschalten Text → Auswahl: "${input}"`, async (page) => {
      await page.fill("[name=birthday_text]", input);
      await toSelect(page);
      eq(await sel(page), expected);
    });
  }

  await test("Umschalten hin und zurück ohne Änderung: angefangenes \"20.04.19\" bleibt erhalten", async (page) => {
    await page.fill("[name=birthday_text]", "20.04.19");
    await toSelect(page); await toText(page);
    eq(await page.inputValue("[name=birthday_text]"), "20.04.19");
  });

  await test("Umschalten Auswahl → Text überschreibt mit geänderter Auswahl", async (page) => {
    await page.fill("[name=birthday_text]", "20.04.19");
    await toSelect(page);
    await page.selectOption("[name=birthday_year]", "1990");
    await toText(page);
    eq(await page.inputValue("[name=birthday_text]"), "20.04.1990");
  });

  const selectCases = [
    [["5", "", ""], "05."],
    [["5", "3", ""], "05.03."],
    [["", "3", "1990"], ".03.1990"],
    [["31", "12", "1999"], "31.12.1999"],
  ];
  for (const [[d, m, y], expected] of selectCases) {
    await test(`Umschalten Auswahl → Text: ${d || "–"}/${m || "–"}/${y || "–"}`, async (page) => {
      await toSelect(page);
      if (y) await page.selectOption("[name=birthday_year]", y);
      if (m) await page.selectOption("[name=birthday_month]", m);
      if (d) await page.selectOption("[name=birthday_day]", d);
      await toText(page);
      eq(await page.inputValue("[name=birthday_text]"), expected);
    });
  }

  await test("Gewählte Ansicht bleibt nach Neuladen erhalten", async (page) => {
    await toSelect(page);
    await page.reload();
    eq(await page.isVisible("[name=birthday_day]"), true, "Auswahl nach Reload");
    await toText(page);
    await page.reload();
    eq(await page.isVisible("[name=birthday_text]"), true, "Text nach Reload");
  });

  // --- Welche Ansicht zählt beim Absenden ----------------------------------
  // Fachliche Fälle (gültige/ungültige Daten, Anzeige im Profil) prüft
  // tests/acceptance/geburtsdatum.feature.
  await test("Registrierung ohne Geburtsdatum (Auswahlansicht) → null", async (page) => {
    await fillRequired(page);
    await toSelect(page);
    eq((await submitAndGetUser(page)).birthday, null);
  });

  await test("Nur die sichtbare Ansicht zählt: Text ausgefüllt, dann Auswahl geleert → null", async (page) => {
    await fillRequired(page);
    await page.fill("[name=birthday_text]", "20.04.1985");
    await toSelect(page);
    for (const k of ["day", "month", "year"]) await page.selectOption(`[name=birthday_${k}]`, "");
    eq((await submitAndGetUser(page)).birthday, null);
  });

  // --- Bedienbarkeit -------------------------------------------------------
  await test("Tastatur: Schalter per Tab erreichbar und mit Pfeiltaste umschaltbar", async (page) => {
    await page.focus('[name=birthday_mode][value="text"]');
    await page.keyboard.press("ArrowRight");
    eq(await page.isChecked('[name=birthday_mode][value="select"]'), true, "Auswahl aktiv");
    eq(await page.isVisible("[name=birthday_day]"), true, "Auswahl sichtbar");
  });

  await test("Handy (375 px): Tag/Monat/Jahr in einer Zeile, kein horizontales Scrollen", async (page) => {
    await toSelect(page);
    const tops = await Promise.all(["day", "month", "year"].map((k) =>
      page.$eval(`[name=birthday_${k}]`, (el) => Math.round(el.getBoundingClientRect().top))));
    eq(new Set(tops).size, 1, "gleiche Höhe");
    eq(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, "kein Scrollen");
  }, { viewport: { width: 375, height: 800 } });

  await browser.close();

  const failed = results.filter((r) => !r.ok);
  for (const r of results) console.log(`${r.ok ? "✔" : "✘"} ${r.name}${r.ok ? "" : "\n    → " + r.err}`);
  console.log(`\n${results.length - failed.length}/${results.length} bestanden`);
  process.exit(failed.length ? 1 : 0);
})();
