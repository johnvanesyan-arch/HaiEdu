import { defineConfig } from "@playwright/test";

const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? "https://www.haiedu.am";

const mobileProject = ({ name, role, width, height, storageState, testMatch }) => ({
  name,
  dependencies: ["authentication"],
  testMatch,
  metadata: { role, viewportWidth: width },
  use: {
    storageState,
    viewport: { width, height },
    isMobile: true,
    hasTouch: true,
  },
});

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "authentication",
      testMatch: /auth\.setup\.js/,
    },
    mobileProject({
      name: "learner-390",
      role: "learner",
      width: 390,
      height: 844,
      storageState: "playwright/.auth/learner.json",
      testMatch: /learner-mobile\.spec\.js/,
    }),
    mobileProject({
      name: "learner-430",
      role: "learner",
      width: 430,
      height: 932,
      storageState: "playwright/.auth/learner.json",
      testMatch: /learner-mobile\.spec\.js/,
    }),
    mobileProject({
      name: "teacher-390",
      role: "teacher",
      width: 390,
      height: 844,
      storageState: "playwright/.auth/teacher.json",
      testMatch: /teacher-mobile\.spec\.js/,
    }),
    mobileProject({
      name: "teacher-430",
      role: "teacher",
      width: 430,
      height: 932,
      storageState: "playwright/.auth/teacher.json",
      testMatch: /teacher-mobile\.spec\.js/,
    }),
  ],
});
