import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

const testDir = defineBddConfig({
  features: 'acceptance/*.feature',
  steps: './acceptance/steps/*.ts',
});

export default defineConfig({ testDir });
