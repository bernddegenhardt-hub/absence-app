import { randomUUID } from 'node:crypto';
import { test as base, createBdd } from 'playwright-bdd';

type Szenario = {
  /** Eindeutige Kennung pro Szenario, damit sich E-Mail-Adressen nie wiederholen. */
  id: string;
  /** Macht eine E-Mail aus der Feature-Datei eindeutig: max@example.de → max+<id>@example.de */
  email: (adresse: string) => string;
};

export const test = base.extend<{ szenario: Szenario }>({
  szenario: async ({}, use) => {
    const id = randomUUID().slice(0, 8);
    // Groß-/Kleinschreibung und Leerzeichen bleiben erhalten, nur vor dem @ kommt die Kennung dazu.
    await use({ id, email: (adresse) => adresse.replace('@', `+${id}@`) });
  },
});

export const { Given, When, Then } = createBdd(test);
