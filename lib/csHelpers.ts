import { Page, BrowserContext, expect } from '@playwright/test';

// ──────────────────────────────────────────────────────────────
//  CS Admin (SMARTSCORE 고객성공) 공통 진입·네비게이션 헬퍼
//
//  대상: https://customer-success-td.smartscore.kr  (클라우드 로그인 필요)
//  ⚠️ 실제 구현 사이트의 DOM 구조는 최초 로그인 후 프로브(_probe-ia.spec.ts)로
//     실측한 뒤 아래 셀렉터/메뉴 매핑을 보정해야 한다(현재 값은 프로토타입 IA 기준 초안).
//  참조: 경기관제 하네스(lib/adminHelpers.ts) 패턴 재사용.
// ──────────────────────────────────────────────────────────────

export const SUBDOMAIN = process.env.CS_SUBDOMAIN || 'customer-success-td';
export const BASE_URL = `https://${SUBDOMAIN}.smartscore.kr`;

const norm = (s: string) => (s || '').replace(/\s+/g, '');

// ── IA 메뉴 매핑 (프로토타입 smartscore_admin_v0.3.html 기준 초안) ──────
//   실측 후 보정 대상. showAdmin(this,'<key>') 의 라벨 → 사이드바 텍스트.
export const CS_MENU = {
  dashboard: '대시보드',
  notice: '공지사항',
  update: '업데이트',
  guide: '솔루션 가이드',
  faq: '자주 묻는 질문',
  quicktags: '빠른 검색 태그',
  inquiry: '문의',           // "문의 / 답변"
  members: '관리자 계정',
  countries: '국가',          // "국가 / 골프장"
} as const;
export type CsMenuKey = keyof typeof CS_MENU;

// 대메뉴 그룹(사이드바 섹션) — 리포트 탭 분류용
export const CS_MENU_GROUP: Record<CsMenuKey, string> = {
  dashboard: '대시보드',
  notice: '콘텐츠 관리',
  update: '콘텐츠 관리',
  guide: '콘텐츠 관리',
  faq: '콘텐츠 관리',
  quicktags: '콘텐츠 관리',
  inquiry: '문의 관리',
  members: '설정',
  countries: '설정',
};

// ──────────────────────────────────────────────────────────────
//  앱 진입 — storageState(로그인 세션) 재사용 전제.
//  세션 만료/무효 시 명확히 fail-fast (auth.setup 재실행 유도).
// ──────────────────────────────────────────────────────────────
export async function openApp(page: Page, _context: BrowserContext): Promise<Page> {
  await page.goto(BASE_URL + '/', { waitUntil: 'domcontentloaded', timeout: 30_000 }).catch(() => {});

  // 로그인 페이지로 튕기면(세션 만료) fail-fast
  const url = page.url();
  if (/login|signin|auth|cloud\.smartscore/i.test(url) && !/customer-success/i.test(url)) {
    throw new Error(
      `[openApp] 세션 무효 — 로그인 페이지로 리다이렉트됨 (${url}). ` +
      `\`npm run auth\` 로 재인증하세요.`,
    );
  }
  await settle(page);
  return page;
}

// ──────────────────────────────────────────────────────────────
//  사이드바 메뉴 네비게이션 (텍스트 기반, DOM click 으로 SPA 라우팅 보장)
//  parent = 사이드바 섹션명(선택), child = 메뉴명. 공백 무시 매칭.
//  ⚠ 실측 후 사이드바 셀렉터(SIDEBAR_LINK) 보정 필요.
// ──────────────────────────────────────────────────────────────
const SIDEBAR_LINK = 'aside a, aside [onclick], nav a, nav [onclick], .sidebar a, .sb-item';

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

// 편의: 메뉴 키로 이동
export async function gotoCsMenu(app: Page, key: CsMenuKey): Promise<boolean> {
  return navigateMenu(app, CS_MENU_GROUP[key], CS_MENU[key]);
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
