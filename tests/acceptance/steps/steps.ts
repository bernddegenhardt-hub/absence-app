import { expect } from '@playwright/test';
import { createBdd } from 'playwright-bdd';

const { Given, Then } = createBdd();

Given('ich öffne {string}', async ({ page }, url: string) => {
  await page.goto(url);
});

Then('sehe ich den Titel {string}', async ({ page }, titel: string) => {
  await expect(page).toHaveTitle(titel);
});