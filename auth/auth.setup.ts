import { test as setup, expect, Page } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
import fs from 'fs';
import path from 'path';

// ──────────────────────────────────────────────────────────────
//  CS Admin 인증 세션(storageState) 생성 — 클라우드 로그인 필요
//
//  ⚠️ 실행 (최초 1회 / 세션 만료 시, 반드시 headed):
//      npm run auth
//
//  흐름(수동):
//    1) customer-success-td 사이트 진입 → 클라우드 로그인 페이지로 리다이렉트
//    2) 브라우저에서 직접 로그인 완료 (최대 3분 대기)
//    3) CS Admin 홈 도달 후 세션 저장(쿠키 포함)
//
//  ⚠️ 정확한 로그인 URL·성공 판정 셀렉터는 실제 사이트 최초 진입 후 보정 필요.
//     (아래는 URL 도달 기반의 보수적 판정 — customer-success 도메인 복귀 시 성공)
// ──────────────────────────────────────────────────────────────

const SUBDOMAIN = process.env.CS_SUBDOMAIN || 'customer-success-td';
const APP_URL = `https://${SUBDOMAIN}.smartscore.kr/`;

// 로그인 성공 판정: customer-success 도메인으로 복귀 + 앱 셸 렌더
async function waitLoggedIn(page: Page) {
  // 3분 내 수동 로그인 → 앱 도메인 복귀 대기
  await page.waitForURL(
    (u) => /customer-success/i.test(u.href) && !/login|signin|auth/i.test(u.href),
    { timeout: 180_000 },
  );
  // 앱 셸(사이드바/네비) 렌더 대기 — 셀렉터는 실측 후 보정
  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 });
  await page.waitForTimeout(1500);
}

setup('authenticate', async ({ page, context }) => {
  setup.setTimeout(300_000);   // 최대 3분 수동 로그인 여유

  const dir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  console.log(`\n[auth.setup] ${APP_URL} 진입 — 브라우저에서 클라우드 로그인을 완료해 주세요. (최대 3분 대기)\n`);
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});

  await waitLoggedIn(page);

  const url = page.url();
  const h1 = await page.locator('h1,.sb-brand-title,.depth-1-title').first().innerText().catch(() => '(제목 없음)');
  console.log(`\n[auth.setup] CS Admin 진입: ${url}  | 제목="${h1}"\n`);

  await context.storageState({ path: STORAGE_STATE });
  console.log(`\n[auth.setup] 세션 저장 완료 → ${STORAGE_STATE}\n`);

  expect(url).toMatch(/customer-success/i);
});
