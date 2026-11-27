import { defineConfig } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';

// Eigene Ports und eigene Datenbank, damit die Tests weder laufende
// Entwicklungsserver (3000/8000) noch backend/data.db berühren.
const API_PORT = 8001;
const WEB_PORT = 3001;
const TEST_DB = '../tests/.test-data/test.db';

const testDir = defineBddConfig({
  features: 'acceptance/**/*.feature',
  steps: 'acceptance/steps/**/*.ts',
});

export default defineConfig({
  testDir,
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
  },
  webServer: [
    {
      // Backend mit leerer Test-Datenbank starten
      command: `mkdir -p ../tests/.test-data && rm -f ${TEST_DB} && DB_PATH=${TEST_DB} .venv/bin/uvicorn app.main:app --port ${API_PORT}`,
      cwd: '../backend',
      url: `http://127.0.0.1:${API_PORT}/api/health`,
      reuseExistingServer: false,
    },
    {
      command: `PORT=${WEB_PORT} API_URL=http://127.0.0.1:${API_PORT} node server.js`,
      cwd: '../frontend',
      url: `http://localhost:${WEB_PORT}/`,
      reuseExistingServer: false,
    },
  ],
});
