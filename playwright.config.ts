import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  retries: 0,
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL:       'http://localhost:3000',
    screenshot:    'on',           // screenshot every step
    video:         'off',
    trace:         'off',
    viewport:      { width: 1440, height: 900 },
    launchOptions: { slowMo: 300 }, // slight delay so UI renders fully
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  // Start Next.js dev server automatically before tests
  webServer: {
    command:            'npm run dev',
    url:                'http://localhost:3000',
    reuseExistingServer: true,
    timeout:            60_000,
  },
})
