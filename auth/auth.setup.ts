import { test as setup, expect, Page } from '@playwright/test';
import { STORAGE_STATE } from '../playwright.config';
import fs from 'fs';
import path from 'path';

// ──────────────────────────────────────────────────────────────
//  CS Admin 인증 세션(storageState) 생성 — 클라우드 로그인 우선
//
//  ⚠️ 실행 (최초 1회 / 세션 만료 시, 반드시 headed):
//      npm run auth
//
//  흐름(수동):
//    1) 클라우드 대시보드(sv1td4) 진입 → 브라우저에서 직접 로그인 (최대 3분 대기)
//    2) 로그인 성공(인사말 "님 안녕하세요") 확인
//    3) CS Admin(customer-success-td) 진입 시도 — SSO 쿠키 공유 시 직접 진입.
//       진입이 안 되면 브라우저에서 직접 CS Admin으로 이동(추가 2분 대기).
//    4) 세션 저장 (클라우드 + customer-success 쿠키 모두 포함)
//
//  참조: 경기관제 auth.setup.ts (동일 클라우드 포털 sv1td4).
// ──────────────────────────────────────────────────────────────

const DASHBOARD_URL = 'https://sv1td4.smartscore.kr/ko/dashboard';
const CS_SUBDOMAIN = process.env.CS_SUBDOMAIN || 'customer-success-td';
const CS_URL = `https://${CS_SUBDOMAIN}.smartscore.kr/`;

async function closeNoticeIfPresent(p: Page) {
  const close = p.locator('.btn-top-close');
  if (await close.isVisible().catch(() => false)) await close.click().catch(() => {});
}

// customer-success 앱에 도달했는지(로그인 페이지 아님) 판정
const onCsApp = (href: string) => /customer-success/i.test(href) && !/login|signin|auth/i.test(href);

setup('authenticate', async ({ page, context }) => {
  setup.setTimeout(360_000);   // 클라우드 로그인 3분 + CS 진입 여유

  const dir = path.dirname(STORAGE_STATE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  // 중복 로그인 처리 핸들러(대시보드 단계) — 경기관제와 동일
  await page.addLocatorHandler(
    page.getByText('로그인을 진행하시겠습니까?'),
    async () => { await page.getByRole('button', { name: '예' }).first().click().catch(() => {}); },
    { noWaitAfter: true, times: 10 },
  );
  await page.addLocatorHandler(
    page.getByText(/중복\s*로그인|강제 로그아웃/),
    async () => {
      const ok = page.getByRole('button', { name: '확인', exact: true });
      if (await ok.first().isVisible().catch(() => false)) await ok.first().click().catch(() => {});
      console.log('\n[auth.setup] ⚠ 중복 로그인 알림을 닫았습니다. 브라우저에서 다시 로그인해 주세요.\n');
    },
    { noWaitAfter: true, times: 10 },
  );

  // ── STEP 1. 클라우드 대시보드 진입 + 수동 로그인 ──────────────
  console.log(`\n[auth.setup] 클라우드 대시보드 진입 — 브라우저에서 로그인을 완료해 주세요. (최대 3분 대기)\n`);
  await page.goto(DASHBOARD_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await expect(page.getByRole('heading', { name: /님 안녕하세요/ }))
    .toBeVisible({ timeout: 180_000 });
  await closeNoticeIfPresent(page);
  console.log(`\n[auth.setup] 클라우드 로그인 성공.\n`);

  // ── STEP 2. CS Admin(customer-success) 진입 ──────────────────
  //  ① SSO 쿠키 공유 가정하고 직접 goto
  await page.goto(CS_URL, { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await page.waitForTimeout(2000);

  //  ② 아직 CS 앱이 아니면(로그인/포털로 튕김) — 수동 진입 대기(최대 2분)
  if (!onCsApp(page.url())) {
    console.log(
      `\n[auth.setup] ⚠ CS Admin 자동 진입 실패 (현재: ${page.url()}).\n` +
      `   브라우저에서 직접 CS Admin(${CS_URL})으로 이동해 주세요. (최대 2분 대기)\n`,
    );
    await page.waitForURL((u) => onCsApp(u.href), { timeout: 120_000 }).catch(() => {});
  }

  await page.waitForLoadState('domcontentloaded', { timeout: 20_000 }).catch(() => {});
  await page.waitForTimeout(1500);

  // ── STEP 3. 세션 저장 ─────────────────────────────────────────
  const url = page.url();
  const title = await page.locator('h1,.sb-brand-title,.depth-1-title').first().innerText().catch(() => '(제목 없음)');
  console.log(`\n[auth.setup] 최종 진입: ${url}  | 제목="${title}"\n`);

  await context.storageState({ path: STORAGE_STATE });
  console.log(`\n[auth.setup] 세션 저장 완료 → ${STORAGE_STATE}\n`);

  // 클라우드 로그인은 필수(인사말 확인 완료). CS 앱 URL 도달은 경고만(진입 방식 실측 전이라 soft).
  if (!onCsApp(url)) {
    console.warn(
      `\n[auth.setup] ⚠ customer-success 앱 URL에 도달하지 못했습니다(현재: ${url}).\n` +
      `   클라우드 세션은 저장되었으나 CS Admin 진입 경로 보정이 필요할 수 있습니다.\n`,
    );
  }
});
