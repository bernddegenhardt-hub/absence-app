import { expect, type APIRequestContext, type Page } from '@playwright/test';
import type { DataTable } from 'playwright-bdd';
import { Given, When, Then } from './fixtures';

const SEITEN: Record<string, string> = {
  Anmeldeseite: '/',
  Registrierungsseite: '/registrieren',
  Startseite: '/start',
};

// Beschriftung auf der Seite → name-Attribut des Eingabefelds
const FELDER: Record<string, string> = {
  Vorname: 'first_name',
  Nachname: 'last_name',
  'E-Mail-Adresse': 'email',
  'Mobile Telefonnummer': 'mobile_phone',
  Straße: 'address.street',
  'Hausnr.': 'address.house_number',
  PLZ: 'address.postal_code',
  Ort: 'address.city',
  Passwort: 'password',
  'Passwort wiederholen': 'password_confirm',
};

function feldName(beschriftung: string) {
  const name = FELDER[beschriftung];
  if (!name) throw new Error(`Unbekanntes Feld "${beschriftung}". Bekannt: ${Object.keys(FELDER).join(', ')}`);
  return name;
}

const STANDARD_PASSWORT = 'Geheim123';

function nutzerdaten(name: string, email: string, passwort = STANDARD_PASSWORT) {
  const [first_name, ...rest] = name.split(' ');
  return {
    first_name,
    last_name: rest.join(' '),
    email,
    password: passwort,
    mobile_phone: '0171 1234567',
    address: { street: 'Musterstraße', house_number: '1', postal_code: '12345', city: 'Berlin' },
  };
}

function emailAusName(name: string) {
  return `${name.toLowerCase().replace(/\s+/g, '.')}@example.de`;
}

async function kontoAnlegen(request: APIRequestContext, daten: ReturnType<typeof nutzerdaten>) {
  const res = await request.post('/api/register', { data: daten });
  expect(res.status(), await res.text()).toBe(201);
}

// ---------- Vorbedingungen ----------

// Legt das Konto direkt über die API an. Der `request`-Kontext ist vom Browser
// getrennt, der Browser ist danach also nicht angemeldet.
Given(
  'es gibt ein Konto für {string} mit {string} und Passwort {string}',
  async ({ request, szenario }, name: string, email: string, passwort: string) => {
    await kontoAnlegen(request, nutzerdaten(name, szenario.email(email), passwort));
  },
);

// Legt ein Konto an und meldet den Browser über die API an (Cookie landet im Browser).
Given('ich bin als {string} angemeldet', async ({ page, request, szenario }, name: string) => {
  const daten = nutzerdaten(name, szenario.email(emailAusName(name)));
  await kontoAnlegen(request, daten);
  const res = await page.request.post('/api/login', {
    data: { email: daten.email, password: daten.password },
  });
  expect(res.ok(), await res.text()).toBeTruthy();
});

// ---------- Aktionen ----------

async function oeffnen({ page }: { page: Page }, seite: string) {
  await page.goto(SEITEN[seite]);
}
// Beide Satzstellungen: "Angenommen ich öffne die …" und "Wenn ich die … öffne"
Given('ich öffne die {word}', oeffnen);
When('ich die {word} öffne', oeffnen);

When(
  'ich mich mit {string} und Passwort {string} anmelde',
  async ({ page, szenario }, email: string, passwort: string) => {
    const form = page.locator('#login-form');
    await form.locator('[name="email"]').fill(szenario.email(email));
    await form.locator('[name="password"]').fill(passwort);
    await form.getByRole('button', { name: 'Anmelden' }).click();
  },
);

async function registrierungAusfuellen(page: Page, d: ReturnType<typeof nutzerdaten>) {
  const form = page.locator('#register-form');
  await form.locator('[name="first_name"]').fill(d.first_name);
  await form.locator('[name="last_name"]').fill(d.last_name);
  await form.locator('[name="email"]').fill(d.email);
  await form.locator('[name="mobile_phone"]').fill(d.mobile_phone);
  await form.locator('[name="address.street"]').fill(d.address.street);
  await form.locator('[name="address.house_number"]').fill(d.address.house_number);
  await form.locator('[name="address.postal_code"]').fill(d.address.postal_code);
  await form.locator('[name="address.city"]').fill(d.address.city);
  await form.locator('[name="password"]').fill(d.password);
  await form.locator('[name="password_confirm"]').fill(d.password);
}

When(
  'ich mich als {string} mit {string} registriere',
  async ({ page, szenario }, name: string, email: string) => {
    await registrierungAusfuellen(page, nutzerdaten(name, szenario.email(email)));
    await page.locator('#register-form').getByRole('button', { name: 'Konto erstellen' }).click();
  },
);

Given(
  'ich fülle das Registrierungsformular für {string} gültig aus',
  async ({ page, szenario }, name: string) => {
    await registrierungAusfuellen(page, nutzerdaten(name, szenario.email(emailAusName(name))));
  },
);

When('ich bei {string} {string} eintrage', async ({ page }, feld: string, wert: string) => {
  const name = feldName(feld);
  await page.locator(`[name="${name}"]`).fill(wert);
  // Beim Passwort auch die Wiederholung anpassen, damit nur die Passwortregel greift
  // und nicht zusätzlich "Passwörter stimmen nicht überein".
  if (name === 'password') await page.locator('[name="password_confirm"]').fill(wert);
});

When('ich auf {string} klicke', async ({ page }, text: string) => {
  await page
    .getByRole('button', { name: text, exact: true })
    .or(page.getByRole('link', { name: text, exact: true }))
    .click();
});

// ---------- Erwartungen ----------

Then('bin ich auf der {word}', async ({ page }, seite: string) => {
  await expect(page).toHaveURL((url) => url.pathname === SEITEN[seite]);
});

Then('ich bin auf der {word}', async ({ page }, seite: string) => {
  await expect(page).toHaveURL((url) => url.pathname === SEITEN[seite]);
});

Then('sehe ich den Titel {string}', async ({ page }, titel: string) => {
  await expect(page).toHaveTitle(titel);
});

Then('sehe ich die Meldung {string}', async ({ page }, text: string) => {
  await expect(page.locator('#form-message')).toHaveText(text);
});

Then('ich sehe die Begrüßung {string}', async ({ page }, text: string) => {
  await expect(page.locator('#greeting')).toHaveText(text);
});

async function feldfehlerPruefen(page: Page, feld: string, fehler: string) {
  const name = feldName(feld);
  await expect(page.locator(`.error[data-for="${name}"]`)).toHaveText(fehler);
  await expect(page.locator(`[name="${name}"]`)).toHaveAttribute('aria-invalid', /.*/);
}

// Beide Satzstellungen: "Dann steht beim Feld …" und "Und beim Feld … steht …"
Then('steht beim Feld {string} der Fehler {string}', async ({ page }, feld: string, fehler: string) => {
  await feldfehlerPruefen(page, feld, fehler);
});
Then('beim Feld {string} steht der Fehler {string}', async ({ page }, feld: string, fehler: string) => {
  await feldfehlerPruefen(page, feld, fehler);
});

Then(
  'steht bei diesen Feldern der Fehler {string}:',
  async ({ page }, fehler: string, felder: DataTable) => {
    for (const [feld] of felder.raw()) await feldfehlerPruefen(page, feld, fehler);
  },
);

Then('beim Feld {string} steht kein Fehler', async ({ page }, feld: string) => {
  await expect(page.locator(`.error[data-for="${feldName(feld)}"]`)).toBeEmpty();
});

Then('ich sehe keine Meldung', async ({ page }) => {
  await expect(page.locator('#form-message')).toBeEmpty();
});

Then('das Passwortfeld ist leer', async ({ page }) => {
  await expect(page.locator('[name="password"]')).toHaveValue('');
});

Then('im Profil steht bei {string} {string}', async ({ page }, feld: string, wert: string) => {
  await expect(page.locator('#profile dt', { hasText: feld }).locator('+ dd')).toHaveText(wert);
});
