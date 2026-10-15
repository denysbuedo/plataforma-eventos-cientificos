import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/web',
  timeout: 30000,
  workers: 1,
  use: { baseURL: process.env.SEP_TEST_ADMIN_WEB_URL, browserName: 'chromium' },
});
