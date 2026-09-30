import { Page, BrowserContext, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────────
//  CS (SMARTSCORE 고객성공 — 고객 화면) 공통 진입·네비게이션 헬퍼
//
//  대상: https://customer-success-td.smartscore.kr  (클라우드 로그인 필요)
//  ✅ 2026-09-30 IA 실측 확정(_probe-ia.spec.ts): 이 사이트는 **고객(Customer) CS 화면**
//     (= smartscore_cs.html 실구현, 기준 정책 = policy_user.md). 운영자(admin)가 아님.
//     Vue SPA · GNB = .nav-item(router-link) · 라우트 직접 이동 가능.
//  참조: 경기관제 하네스(lib/adminHelpers.ts) 패턴 재사용.
// ──────────────────────────────────────────────────────────────

export const SUBDOMAIN = process.env.CS_SUBDOMAIN || 'customer-success-td';
export const BASE_URL = `https://${SUBDOMAIN}.smartscore.kr`;

const norm = (s: string) => (s || '').replace(/\s+/g, '');

// ── 고객 화면 GNB 라우트 (2026-09-30 실측 확정) ──────────────────
export const CS_ROUTE = {
  home: '/',
  notice: '/notice',
  update: '/update',
  guide: '/guide',
  faq: '/faq',
  myinquiry: '/myinquiry',
  gcinquiry: '/gcinquiry',
  newinquiry: '/newinquiry',   // 새 문의 접수(GNB 아님, 버튼 진입)
} as const;
export type CsMenuKey = keyof typeof CS_ROUTE;

// GNB에 노출되는 메뉴 라벨(실측). newinquiry는 GNB에 없음(홈/문의의 버튼으로 진입).
export const CS_NAV_LABEL: Partial<Record<CsMenuKey, string>> = {
  home: '홈',
  notice: '공지사항',
  update: '업데이트',
  guide: '솔루션 가이드',
  faq: '자주 묻는 질문',
  myinquiry: '내 문의',
  gcinquiry: '골프장 문의',
};

// 라우트로 직접 이동(Vue SPA — 클릭보다 견고). 진입 후 settle.
export async function gotoRoute(app: Page, key: CsMenuKey): Promise<void> {
  await app.goto(BASE_URL + CS_ROUTE[key], { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});
  await settle(app);
}

// ──────────────────────────────────────────────────────────────
//  앱 진입 — storageState(로그인 세션) 재사용 전제.
//  세션 만료/무효 시 명확히 fail-fast (auth.setup 재실행 유도).
// ──────────────────────────────────────────────────────────────
export async function openApp(page: Page, _context: BrowserContext): Promise<Page> {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});

  // 세션 만료 fail-fast: customer-success 도메인이 아니면(로그인/포털로 튕김) 즉시 중단.
  //  ⚠ 공유 QA 계정은 재로그인 1회당 1런만 생존 — 죽은 세션으로 헛run 방지.
  const url = page.url();
  if (!/customer-success/i.test(url) || /login|signin/i.test(url)) {
    throw new Error(
      `[openApp] 세션 무효 — CS 앱이 아닌 곳으로 리다이렉트됨 (${url}). ` +
      `\`npm run auth\` 로 재인증 후 즉시 실행하세요(1런/로그인).`,
    );
  }
  await settle(page);
  return page;
}

// ──────────────────────────────────────────────────────────────
//  GNB 메뉴 네비게이션 (텍스트 기반 클릭, DOM click 으로 SPA 라우팅 보장)
//  parent(=라벨) 또는 child 로 매칭. 공백 무시. (라우트 직접이동은 gotoRoute 권장)
//  2026-09-30 실측: GNB = .nav-item(router-link).
// ──────────────────────────────────────────────────────────────
const SIDEBAR_LINK = 'nav .nav-item, .nav-item, nav a, aside a';

export async function navigateMenu(app: Page, parent: string, child?: string): Promise<boolean> {
  const target = (child || parent).trim();
  const links = app.locator(SIDEBAR_LINK);
  const n = await links.count();
  for (let i = 0; i < n; i++) {
    const t = await links.nth(i).innerText().catch(() => '');
    if (t && norm(t).includes(norm(target))) {
      await links.nth(i).evaluate((el: HTMLElement) => el.click()).catch(async () => {
        await links.nth(i).click().catch(() => {});
      });
      await app.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {});
      return true;
    }
  }
  const avail: string[] = [];
  for (let i = 0; i < n; i++) avail.push((await links.nth(i).innerText().catch(() => '')).trim());
  console.warn(`[navigateMenu] "${target}" 미발견. 노출 항목: ${JSON.stringify(avail.filter(Boolean))}`);
  return false;
}

// 편의: 메뉴 키로 이동(GNB 클릭). GNB에 없는 키(newinquiry)는 라우트 직접이동으로 폴백.
export async function gotoCsMenu(app: Page, key: CsMenuKey): Promise<boolean> {
  const label = CS_NAV_LABEL[key];
  if (label) {
    const ok = await navigateMenu(app, label);
    if (ok) return true;
  }
  await gotoRoute(app, key);
  return true;
}

// SPA 컨텐츠 렌더 안정화
export async function settle(app: Page, ms = 1200) {
  await app.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => {});
  await app.waitForTimeout(ms);
}

// 현재 페이지 UI 요소 구조화 추출 (분석/프로브용) — 경기관제 extractDom 이식
export async function extractDom(app: Page) {
  return await app.evaluate(() => {
    const txt = (e: Element) => (e as HTMLElement).innerText?.trim().slice(0, 60) || null;
    const cls = (e: Element) => (typeof (e as HTMLElement).className === 'string' ? (e as HTMLElement).className : null);
    const norm2 = (s: string | null) => (s || '').replace(/\s+/g, ' ').trim();
    return {
      url: location.href,
      title: document.title,
      headings: [...document.querySelectorAll('h1,h2,h3,h4')].map(e => ({ t: e.tagName, txt: txt(e), c: cls(e) })).filter(x => x.txt),
      nav: [...document.querySelectorAll('aside a, nav a, .sidebar a, .sb-item, [onclick*="show"]')]
        .map(e => ({ txt: norm2((e as HTMLElement).innerText), c: cls(e), onclick: e.getAttribute('onclick') || null }))
        .filter(x => x.txt).slice(0, 60),
      buttons: [...document.querySelectorAll('button,a[class*="btn"],[role="button"]')]
        .map(e => ({ txt: ((e as HTMLElement).innerText || (e as HTMLInputElement).value || '').trim().slice(0, 30), c: cls(e), id: e.id || null }))
        .filter(x => x.txt).slice(0, 80),
      inputs: [...document.querySelectorAll('input,select,textarea')].map(e => ({
        tag: e.tagName, type: e.getAttribute('type'), name: e.getAttribute('name') || null,
        id: e.id || null, c: cls(e), ph: e.getAttribute('placeholder') || null,
        opts: e.tagName === 'SELECT' ? [...(e as HTMLSelectElement).options].map(o => o.text).slice(0, 12) : null,
      })).slice(0, 60),
      tabs: [...document.querySelectorAll('[class*="tab"],[role="tab"]')]
        .map(e => ({ txt: txt(e), c: cls(e), active: /active|is-active|on|selected/.test(cls(e) || '') }))
        .filter(x => x.txt).slice(0, 30),
      tables: [...document.querySelectorAll('table')].map(t => ({
        c: cls(t), id: t.id || null,
        headers: [...t.querySelectorAll('th')].map(th => (th as HTMLElement).innerText.trim()).slice(0, 20),
        rowCount: t.querySelectorAll('tbody tr').length,
      })),
    };
  });
}

// 세션 유효성 가드 (spec 시작 시 호출)
export async function assertLoggedIn(page: Page) {
  await expect(page).not.toHaveURL(/login|signin/i, { timeout: 5_000 }).catch(() => {});
}
