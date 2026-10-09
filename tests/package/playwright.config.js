import { defineConfig, devices } from '@playwright/test';

const PORT = 4173;

// A terminal inside a snap (e.g. VS Code installed as a snap) points GIO at the
// snap's modules, which crash WebKit's network process; leave them out.
const { GIO_MODULE_DIR, ...webkitEnv } = process.env;

export default defineConfig({
  testMatch: 'browser.spec.js',
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: `http://localhost:${PORT}`,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'], launchOptions: { env: webkitEnv } } },
  ],
  webServer: {
    command: 'node serve.js',
    url: `http://localhost:${PORT}/pages/bundle.html`,
    env: { PORT: String(PORT) },
    reuseExistingServer: !process.env.CI,
  },
});
