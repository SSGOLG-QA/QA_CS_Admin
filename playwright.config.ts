import { defineConfig } from '@playwright/test';
import { config } from 'dotenv';

// .env 로드(없어도 무해). CI는 env 직접 주입.
config();

// ──────────────────────────────────────────────────────────────
//  CS Admin (SMARTSCORE 고객성공) — Playwright 설정
//  - setup 프로젝트가 클라우드 로그인 세션(storageState) 1회 생성
//  - cs-admin 프로젝트가 저장 세션 재사용(매 테스트 재로그인 X)
//  대상: https://customer-success-td.smartscore.kr
//  경기관제 하네스(playwright.config.ts) 패턴 재사용.
// ──────────────────────────────────────────────────────────────

export const STORAGE_STATE = 'auth/.auth/admin.json';
const SUBDOMAIN = process.env.CS_SUBDOMAIN || 'customer-success-td';

export default defineConfig({
  testDir: '.',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,   // 공유 QA 계정 — 동시 로그인 시 강제 로그아웃. 직렬 유지.
  workers: 1,
  retries: process.env.CI ? 2 : 1,   // SPA 진입 레이스 플레이크 흡수
  reporter: [['list'], ['html', { open: 'never' }]],

  use: {
    baseURL: `https://${SUBDOMAIN}.smartscore.kr`,
    actionTimeout: 15_000,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: { args: ['--start-maximized'] },
  },

  projects: [
    // 1) 로그인 세션 생성 (headed 수동 로그인)
    {
      name: 'setup',
      testMatch: /auth\.setup\.ts/,
    },

    // 2) CS Admin 검증 — setup 완료 후 storageState 재사용
    {
      name: 'cs-admin',
      testMatch: /Admin[\\/].*\.spec\.ts/,
      dependencies: ['setup'],
      use: {
        viewport: null,   // 최대화 창 전체 사용
        storageState: STORAGE_STATE,
      },
    },
  ],
});
