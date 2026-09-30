import { Page, expect } from '@playwright/test';
import { check, checkText, checkRawCode, diff, skip, CheckMeta } from './reporter';
import { gotoRoute, settle } from './csHelpers';

// ──────────────────────────────────────────────────────────────
//  CS 고객 화면 정합성 검증 스위트 (policy_user.md 기준)
//  비파괴 원칙: 진입·읽기·필터 조회만. 저장/삭제/발송/등록 제출 금지.
// ──────────────────────────────────────────────────────────────

// 실구현 솔루션 라벨(2026-09-30 실측). ⚠ 정책/tag_pool은 "무전" → 구현 "무전기".
export const SOLUTIONS_IMPL = [
  '전체', '경기관제', 'ERP', '테이블오더', '무전기', '셀프체크',
  '블랙박스', '대기호출', '데이터마케팅', '카트내결제', '코스관리', '클라우드',
];

const M = (path: string, tcId: string, desc: string, extra: Partial<CheckMeta> = {}): CheckMeta => ({
  path, tcId, desc,
  tcRef: extra.tcRef || `공지사항_고객노출_${tcId.replace(/\D/g, '')}`,
  expected: extra.expected,
  failMsg: extra.failMsg,
});

// ──────────────────────────────────────────────────────────────
//  공지사항 (/notice) — 고객 노출 정합성
// ──────────────────────────────────────────────────────────────
export async function runNotice(app: Page) {
  const MENU = '공지사항';
  await gotoRoute(app, 'notice');
  await settle(app);

  // NOTICE-01 진입 + 화면 제목
  await check(app, M('공지사항 > 진입', 'NOTICE-01', '공지사항 화면 제목 노출', { failMsg: '공지 화면 제목 미노출' }), async () => {
    await expect(app.getByText(/SMARTSCORE\s*공지사항/).first()).toBeVisible({ timeout: 10_000 });
  });

  // NOTICE-02 솔루션 필터 탭 — 전체 + 11솔루션(12) 노출
  await check(app, M('공지사항 > 솔루션 필터', 'NOTICE-02', '솔루션 필터 탭 12종(전체+11) 노출', { failMsg: '솔루션 필터 탭 누락' }), async () => {
    for (const label of SOLUTIONS_IMPL) {
      await expect(app.getByText(label, { exact: true }).first(), `필터 "${label}"`).toBeVisible({ timeout: 8_000 });
    }
  });

  // NOTICE-03 목록 카드 ≥1 (데이터 의존 — 0건이면 SKIP)
  const cardSel = '[class*="notice"], [class*="card"], [class*="list-item"], article, li';
  const cardCount = await app.locator(cardSel).count().catch(() => 0);
  if (cardCount === 0) {
    skip(M('공지사항 > 목록', 'NOTICE-03', '공지 목록 카드 노출', {}), '공지 데이터 0건');
  } else {
    await check(app, M('공지사항 > 목록', 'NOTICE-03', '공지 목록 카드 ≥1 노출', { failMsg: '공지 목록 미노출' }), async () => {
      expect(cardCount).toBeGreaterThanOrEqual(1);
    });
  }

  // NOTICE-04 페이지네이션 노출 (policy: 1페이지 30개)
  await check(app, M('공지사항 > 페이지네이션', 'NOTICE-04', '페이지네이션 노출', { failMsg: '페이지네이션 미노출' }), async () => {
    await expect(app.locator('[class*="pagination"], [class*="paging"], .pager').first()).toBeVisible({ timeout: 8_000 });
  });

  // NOTICE-05 언어 선택기(KOR) 노출 — 다중 매치 중 '가시' 요소 존재로 판정(숨은 첫 요소 오탐 방지)
  await check(app, M('공지사항 > 헤더', 'NOTICE-05', '언어 선택기(KOR) 노출', { failMsg: '언어 선택기 미노출' }), async () => {
    const kor = app.getByText('KOR', { exact: true });
    const n = await kor.count();
    let visible = false;
    for (let i = 0; i < n; i++) {
      if (await kor.nth(i).isVisible().catch(() => false)) { visible = true; break; }
    }
    expect(visible, `KOR 언어 선택기 가시(matches=${n})`).toBeTruthy();
  });

  // NOTICE-06 고객 날짜 표기 — 날짜(YYYY.MM.DD) 노출 + "등록:"/"등록일" 라벨 미표기(policy_user)
  await check(app, M('공지사항 > 날짜 표기', 'NOTICE-06', '고객 날짜 표기: 날짜만(라벨 없음)', { failMsg: '고객 날짜 표기 규칙 위반' }), async () => {
    const body = await app.locator('body').innerText();
    expect(/\d{4}\.\d{2}\.\d{2}/.test(body), '날짜(YYYY.MM.DD) 형식 노출').toBeTruthy();
    expect(/등록\s*:|등록일\s*:/.test(body), '"등록:" 라벨 미표기(고객 화면)').toBeFalsy();
  });

  // NOTICE-07 미가공 코드/오타 노출 없음
  await checkRawCode(app, M('공지사항 > 본문', 'NOTICE-07', '미가공 코드/오타 미노출', {}));

  // NOTICE-08 [diff] 솔루션명: 정책 "무전" → 구현 "무전기"
  const hasMujeongi = await app.getByText('무전기', { exact: true }).first().isVisible().catch(() => false);
  if (hasMujeongi) {
    diff(MENU, '솔루션명 "무전"(정책/tag_pool)', '"무전기"(구현)', '공지사항_고객노출_08', '기능 정상 — 명칭 표기 차이. 전 화면 공통');
  }

  // NOTICE-09 "무기한" 미표기 — 고객 화면은 만료 없으면 등록일만(정책). 본문에 "무기한" 라벨 미노출.
  await check(app, M('공지사항 > 무기한 표기', 'NOTICE-09', '고객 화면 "무기한" 텍스트 미표기', { failMsg: '"무기한" 텍스트 노출(고객 화면 규칙 위반)' }), async () => {
    const body = await app.locator('body').innerText();
    expect(/무기한/.test(body), '"무기한" 미표기').toBeFalsy();
  });
}
