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

  // NOTICE-10 안내 문구 전문 일치 (checkText)
  const NOTICE_GUIDE = '솔루션 업데이트, 점검, 정책 변경 등 중요 안내를 확인하세요';
  await checkText(
    app,
    M('공지사항 > 안내문구', 'NOTICE-10', '상단 안내 문구 전문 일치', { expected: NOTICE_GUIDE, failMsg: '안내 문구 불일치/미노출' }),
    app.getByText(NOTICE_GUIDE, { exact: true }),
  );

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

  // NOTICE-11 카드별 카테고리(솔루션) 배지 노출 — 각 공지 카드는 좌측에 카테고리 배지("전체" 또는 솔루션명)
  // ⚠ 한글은 JS 정규식 \w가 아니라 \b(단어경계)가 한글 뒤에서 실패 → 선두 토큰을 공백 분리 후 집합 비교.
  const catSet = new Set(SOLUTIONS_IMPL);
  // 실측: 공지 카드 = div[class*="list-item"] (텍스트 "카테고리 제목 날짜" 순)
  const dateCardSel = '[class*="list-item"], [class*="notice-item"]';
  const dateCards = app.locator(dateCardSel).filter({ hasText: /\d{4}\.\d{2}\.\d{2}/ });
  const dcN = await dateCards.count().catch(() => 0);
  if (dcN === 0) {
    skip(M('공지사항 > 카테고리 배지', 'NOTICE-11', '카드 카테고리(솔루션) 배지 노출', {}), '공지 카드 0건');
  } else {
    await check(app, M('공지사항 > 카테고리 배지', 'NOTICE-11', '카드별 카테고리(솔루션) 배지 노출', { failMsg: '카드 카테고리 배지 미노출/비정상' }), async () => {
      let ok = 0, checked = 0;
      for (let i = 0; i < Math.min(dcN, 5); i++) {
        const t = (await dateCards.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (!t) continue;
        checked++;
        if (catSet.has(t.split(' ')[0])) ok++;   // 선두 토큰이 카테고리(솔루션)인지
      }
      expect(ok, `카테고리 배지 선두 카드 ${ok}/${checked}`).toBeGreaterThanOrEqual(1);
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

  // ── 인터랙션 검증 (실측 셀렉터 기반, 비파괴) ──────────────────
  const CARD = '[class*="list-item"]';

  // NOTICE-12 솔루션 탭 필터 동작 — 탭 선택 시 필터 적용(URL ?sol=) + 활성 표시 + 목록 갱신
  await check(app, M('공지사항 > 필터 동작', 'NOTICE-12', '솔루션 탭 선택 시 필터 동작', { failMsg: '탭 필터 미동작' }), async () => {
    await gotoRoute(app, 'notice'); await settle(app, 1000);
    const before = await app.locator(CARD).count();
    await app.locator('.sol-tab', { hasText: '경기관제' }).first().click();
    await settle(app, 1000);
    await expect(app, 'URL 필터 파라미터(sol=)').toHaveURL(/[?&]sol=/);
    await expect(app.locator('.sol-tab.on', { hasText: '경기관제' }).first(), '활성 탭 표시').toBeVisible({ timeout: 8_000 });
    const after = await app.locator(CARD).count();
    expect(after, `필터 후 목록(${after}) ≤ 전체(${before})`).toBeLessThanOrEqual(before);
  });

  // NOTICE-13 상세 진입 — 카드 클릭 시 /notice/{id} 이동 + 상세 제목(.nd-title)
  const canDetail = (await app.locator(CARD).count().catch(() => 0)) > 0;
  if (!canDetail) {
    skip(M('공지사항 > 상세 진입', 'NOTICE-13', '공지 상세 진입', {}), '공지 카드 0건');
  } else {
    await check(app, M('공지사항 > 상세 진입', 'NOTICE-13', '카드 클릭 시 상세 진입', { failMsg: '상세 진입 실패' }), async () => {
      await gotoRoute(app, 'notice'); await settle(app, 1000);
      await app.locator(CARD).first().click();
      await settle(app, 1200);
      await expect(app, '상세 URL(/notice/{id})').toHaveURL(/\/notice\/\d+/);
      await expect(app.locator('.nd-title').first(), '상세 제목').toBeVisible({ timeout: 8_000 });
    });
  }

  // NOTICE-14 URL 자동 링크 — 본문 URL이 클릭 가능한 <a>로 렌더(시험 "URL 토큰" 공지)
  //   ⚠ 목록으로 먼저 이동한 뒤 카드 존재를 센다(직전 검증이 상세/필터 상태를 남길 수 있음)
  await gotoRoute(app, 'notice'); await settle(app, 1000);
  const urlCard = app.locator(CARD, { hasText: 'URL 토큰' });
  if ((await urlCard.count().catch(() => 0)) === 0) {
    skip(M('공지사항 > URL 자동링크', 'NOTICE-14', '본문 URL 자동 링크', {}), 'URL 포함 시험 공지 없음');
  } else {
    await check(app, M('공지사항 > URL 자동링크', 'NOTICE-14', '본문 URL 클릭 가능 링크 렌더', { failMsg: 'URL 자동 링크 미렌더' }), async () => {
      await urlCard.first().click();
      await settle(app, 1200);
      // 텍스트가 URL 형태인 앵커(헤더 'Smartscore Cloud 홈' 링크 제외)
      const link = app.locator('a[href^="http"]').filter({ hasText: /https?:\/\// });
      await expect(link.first(), '본문 URL 링크').toBeVisible({ timeout: 8_000 });
    });
  }

  // NOTICE-15 이미지 라이트박스 — 본문 이미지 클릭 시 확대(조회 시점). 데이터 의존.
  await gotoRoute(app, 'notice'); await settle(app, 800);
  if ((await app.locator(CARD).count().catch(() => 0)) === 0) {
    skip(M('공지사항 > 라이트박스', 'NOTICE-15', '본문 이미지 라이트박스', {}), '공지 카드 0건');
  } else {
    await app.locator(CARD).first().click().catch(() => {});
    await settle(app, 1000);
    const bodyImg = app.locator('.nd-body img, [class*="nd-"] img, [class*="content"] img, main img').first();
    if (!(await bodyImg.isVisible().catch(() => false))) {
      skip(M('공지사항 > 라이트박스', 'NOTICE-15', '본문 이미지 라이트박스', {}), '상세 본문 이미지 데이터 없음');
    } else {
      await check(app, M('공지사항 > 라이트박스', 'NOTICE-15', '본문 이미지 클릭 시 라이트박스', { failMsg: '라이트박스 미노출' }), async () => {
        await bodyImg.click();
        await app.waitForTimeout(700);
        const overlay = app.locator('[class*="lightbox"], [class*="overlay"], [class*="modal"], [role="dialog"]');
        await expect(overlay.first(), '라이트박스 오버레이').toBeVisible({ timeout: 5_000 });
        await app.keyboard.press('Escape').catch(() => {});
      });
    }
  }

  // NOTICE-16 뒤로가기 — 상세에서 [공지사항 목록] 버튼(.pg-back-btn) → 목록 복귀
  if (!canDetail) {
    skip(M('공지사항 > 뒤로가기', 'NOTICE-16', '상세→목록 복귀', {}), '공지 카드 0건');
  } else {
    await check(app, M('공지사항 > 뒤로가기', 'NOTICE-16', '상세에서 목록으로 복귀', { failMsg: '목록 복귀 실패' }), async () => {
      await gotoRoute(app, 'notice'); await settle(app, 1000);
      await app.locator(CARD).first().click();
      await settle(app, 1000);
      await app.locator('.pg-back-btn').first().click();
      await settle(app, 1000);
      await expect(app, '목록 URL 복귀').toHaveURL(/\/notice(\?|$)/);
      await expect(app.locator(CARD).first(), '목록 카드 재노출').toBeVisible({ timeout: 8_000 });
    });
  }

  // ════════════════════════════════════════════════════════════
  //  연계 관측 (admin → front 노출공식 정합성)
  //  어드민_프론트_연계분석.md §2/§4. front=라이브(읽기)·admin=목업(백엔드 없음)
  //  → admin 설정을 트리거하지 않고, front 관측값이 연계공식에 정합한지만 확인.
  //    검증 불가(국가 전환·실 admin 쓰기)는 투명 SKIP(사유 명시).
  // ════════════════════════════════════════════════════════════

  // NOTICE-L01 상태 라벨 비노출(정상 차등) — front엔 노출/미노출·반영완료/반영대기 상태 텍스트 없음(admin 전용)
  await check(app, M('공지사항 > 연계·상태라벨', 'NOTICE-L01', 'front 상태 텍스트 비노출(admin 전용)', { failMsg: 'front에 상태 텍스트 노출 — admin 전용 요소 누출' }), async () => {
    await gotoRoute(app, 'notice'); await settle(app, 800);
    const body = await app.locator('body').innerText();
    expect(/미노출/.test(body), '"미노출" 상태 텍스트 미노출').toBeFalsy();
    expect(/반영완료|반영대기/.test(body), '업데이트 상태 텍스트 미노출(공지 화면)').toBeFalsy();
  });

  // NOTICE-L02 솔루션 필터 정합 — 필터 적용 시 노출 카드 배지 ⊆ {선택 솔루션, 전체} (연계규칙 #4)
  await gotoRoute(app, 'notice'); await settle(app, 1000);
  await app.locator('.sol-tab', { hasText: '경기관제' }).first().click().catch(() => {});
  await settle(app, 1000);
  const fCards = app.locator(dateCardSel).filter({ hasText: /\d{4}\.\d{2}\.\d{2}/ });
  const fN = await fCards.count().catch(() => 0);
  if (fN === 0) {
    skip(M('공지사항 > 연계·솔루션필터', 'NOTICE-L02', '필터 결과 배지 정합(⊆ 선택∪전체)', {}), '경기관제 필터 결과 0건(데이터 의존)');
  } else {
    await check(app, M('공지사항 > 연계·솔루션필터', 'NOTICE-L02', '필터 노출 카드 배지 ⊆ {경기관제, 전체}', { failMsg: '필터 결과에 타 솔루션 배지 카드 노출 — 연계공식 위반' }), async () => {
      const allow = new Set(['경기관제', '전체']);
      let bad = 0, checked = 0;
      for (let i = 0; i < Math.min(fN, 10); i++) {
        const t = (await fCards.nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
        if (!t) continue;
        checked++;
        if (!allow.has(t.split(' ')[0])) bad++;
      }
      expect(bad, `배지 위반 카드 ${bad}/${checked}(배지는 경기관제·전체만 허용)`).toBe(0);
    });
  }

  // NOTICE-L03 적용국가 한국 단독 → KOR 노출 정합 (시드 "(시험) 적용 국가 한국 단독 공지")
  await gotoRoute(app, 'notice'); await settle(app, 800);
  const krSeed = app.getByText(/적용\s*국가\s*한국\s*단독/).first();
  if (!(await krSeed.isVisible().catch(() => false))) {
    skip(M('공지사항 > 연계·적용국가', 'NOTICE-L03', '적용국가 한국단독 → KOR 노출', {}), '한국단독 시험 공지 시드 없음');
  } else {
    await check(app, M('공지사항 > 연계·적용국가', 'NOTICE-L03', '적용국가 한국단독 공지가 KOR에서 노출', { failMsg: '한국단독 공지 KOR 미노출 — 연계공식 위반' }), async () => {
      await expect(krSeed, '한국단독 시드 공지 노출(적용국가=한국 ↔ KOR 정합)').toBeVisible({ timeout: 8_000 });
    });
  }

  // NOTICE-L04 적용국가 타겟 제외 → 미노출 : ⚠ 검증 보류 (국가 전환 불가)
  skip(
    M('공지사항 > 연계·적용국가', 'NOTICE-L04', '적용국가 미포함 국가 → 미노출', {}),
    '판정 보류: front 국가 전환이 언어 선택기(국가 1:1 매핑 불가, ISSUE-079) — 국가 선택기 도입 후 재검토',
  );

  // NOTICE-L05 번역 원문 토글 미제공 — 공지 상세엔 "원문 보기" 토글 없음(번역 원문 토글은 문의 답변 전용)
  await gotoRoute(app, 'notice'); await settle(app, 800);
  if ((await app.locator(CARD).count().catch(() => 0)) === 0) {
    skip(M('공지사항 > 연계·번역', 'NOTICE-L05', '공지 상세 원문 토글 미제공', {}), '공지 카드 0건');
  } else {
    await app.locator(CARD).first().click().catch(() => {});
    await settle(app, 1000);
    await check(app, M('공지사항 > 연계·번역', 'NOTICE-L05', '공지 상세 "원문 보기" 토글 미제공', { failMsg: '공지에 원문 토글 노출 — 문의 전용 요소 누출' }), async () => {
      const body = await app.locator('body').innerText();
      expect(/원문\s*보기/.test(body), '"원문 보기" 토글 미노출(공지는 번역본만)').toBeFalsy();
    });
  }

  // NOTICE-L06 수정저장 미반영 결함(D1) → front 관측만으로 트리거 불가 : 투명 SKIP
  skip(
    M('공지사항 > 연계·드리프트', 'NOTICE-L06', '수정저장 미반영 결함(노출여부/기간/국가/솔루션)', {}),
    '관측 제약: 실 admin 쓰기 필요(목업 백엔드 없음). D1(2026-09-02 1차한정 결함) — 수정 경로만, 수동 확인 대상',
  );
}

// ──────────────────────────────────────────────────────────────
//  업데이트 (/update) — 고객 노출 정합성 (policy_user "업데이트 공개 정책")
//  2026-10-01 실측: 카드 [class*="update-item"], 상세 .ud-title, 뒤로 "업데이트 목록",
//    탭 .sol-tab(.on), 필터 ?sol=N, 상태텍스트 미노출(반영완료만 노출), 더보기 10+10.
// ──────────────────────────────────────────────────────────────
const MU = (path: string, tcId: string, desc: string, extra: Partial<CheckMeta> = {}): CheckMeta => ({
  path, tcId, desc,
  tcRef: extra.tcRef || `업데이트_고객노출_${tcId.replace(/\D/g, '')}`,
  expected: extra.expected, failMsg: extra.failMsg,
});

export async function runUpdate(app: Page) {
  const MENU = '업데이트';
  const CARD = '[class*="update-item"]';
  await gotoRoute(app, 'update');
  await settle(app);

  // UPDATE-01 진입 + 화면 제목 "릴리즈 노트"
  await check(app, MU('업데이트 > 진입', 'UPDATE-01', '업데이트 화면 제목 노출', { failMsg: '업데이트 제목 미노출' }), async () => {
    await expect(app.getByText('릴리즈 노트', { exact: true }).first()).toBeVisible({ timeout: 10_000 });
  });

  // UPDATE-02 솔루션 필터 탭 12종
  await check(app, MU('업데이트 > 솔루션 필터', 'UPDATE-02', '솔루션 필터 탭 12종(전체+11) 노출', { failMsg: '솔루션 필터 탭 누락' }), async () => {
    for (const label of SOLUTIONS_IMPL) {
      await expect(app.getByText(label, { exact: true }).first(), `필터 "${label}"`).toBeVisible({ timeout: 8_000 });
    }
  });

  // UPDATE-03 목록 카드 ≥1 (데이터 의존)
  const n0 = await app.locator(CARD).count().catch(() => 0);
  if (n0 === 0) {
    skip(MU('업데이트 > 목록', 'UPDATE-03', '업데이트 목록 카드 노출', {}), '업데이트 데이터 0건');
  } else {
    await check(app, MU('업데이트 > 목록', 'UPDATE-03', '업데이트 목록 카드 ≥1 노출', { failMsg: '업데이트 목록 미노출' }), async () => {
      expect(n0).toBeGreaterThanOrEqual(1);
    });
  }

  // UPDATE-04 [핵심 차등] 상태 텍스트 숨김 — "반영완료"/"반영대기" 미노출(고객 화면)
  await check(app, MU('업데이트 > 상태 텍스트', 'UPDATE-04', '반영완료/반영대기 상태 텍스트 미노출', { failMsg: '상태 텍스트 노출(고객 화면 규칙 위반)' }), async () => {
    const body = await app.locator('body').innerText();
    expect(/반영완료|반영대기/.test(body), '상태 텍스트 미노출').toBeFalsy();
  });

  // UPDATE-05 더보기 버튼 노출 + 동작(클릭 시 목록 증가)
  const more = app.getByRole('button', { name: /더보기/ }).or(app.getByText('더보기', { exact: true }));
  if (!(await more.first().isVisible().catch(() => false))) {
    skip(MU('업데이트 > 더보기', 'UPDATE-05', '더보기 버튼 노출·동작', {}), '더보기 버튼 미노출(항목 ≤10)');
  } else {
    await check(app, MU('업데이트 > 더보기', 'UPDATE-05', '더보기 클릭 시 목록 추가 노출', { failMsg: '더보기 미동작' }), async () => {
      const before = await app.locator(CARD).count();
      await more.first().click();
      await settle(app, 1200);
      const after = await app.locator(CARD).count();
      expect(after, `더보기 후(${after}) > 이전(${before})`).toBeGreaterThan(before);
    });
  }

  // UPDATE-06 복수 솔루션 배지 — 카드에 솔루션 배지(≥1), 일부 카드는 복수
  if (n0 === 0) {
    skip(MU('업데이트 > 솔루션 배지', 'UPDATE-06', '카드 솔루션 배지 노출', {}), '업데이트 데이터 0건');
  } else {
    await check(app, MU('업데이트 > 솔루션 배지', 'UPDATE-06', '카드별 솔루션 배지 노출', { failMsg: '솔루션 배지 미노출' }), async () => {
      const sols = SOLUTIONS_IMPL.filter(s => s !== '전체');
      let ok = 0;
      const cnt = Math.min(await app.locator(CARD).count(), 5);
      for (let i = 0; i < cnt; i++) {
        const t = (await app.locator(CARD).nth(i).innerText().catch(() => '')).replace(/\s+/g, ' ');
        if (sols.some(s => t.includes(s))) ok++;
      }
      expect(ok, `솔루션 배지 보유 카드 ${ok}/${cnt}`).toBeGreaterThanOrEqual(1);
    });
  }

  // UPDATE-07 날짜 표기 — YYYY.MM.DD 노출 + "등록:" 라벨 미표기(고객 화면)
  await check(app, MU('업데이트 > 날짜 표기', 'UPDATE-07', '고객 날짜 표기: 날짜만(라벨 없음)', { failMsg: '날짜 표기 규칙 위반' }), async () => {
    const body = await app.locator('body').innerText();
    expect(/\d{4}\.\d{2}\.\d{2}/.test(body), '날짜(YYYY.MM.DD) 노출').toBeTruthy();
    expect(/등록\s*:|등록일\s*:/.test(body), '"등록:" 라벨 미표기').toBeFalsy();
  });

  // UPDATE-08 언어 선택기(KOR)
  await check(app, MU('업데이트 > 헤더', 'UPDATE-08', '언어 선택기(KOR) 노출', { failMsg: '언어 선택기 미노출' }), async () => {
    const kor = app.getByText('KOR', { exact: true });
    const c = await kor.count();
    let vis = false;
    for (let i = 0; i < c; i++) { if (await kor.nth(i).isVisible().catch(() => false)) { vis = true; break; } }
    expect(vis, `KOR 가시(matches=${c})`).toBeTruthy();
  });

  // UPDATE-09 미가공 코드/오타 미노출
  await checkRawCode(app, MU('업데이트 > 본문', 'UPDATE-09', '미가공 코드/오타 미노출', {}));

  // UPDATE-10 [diff] 솔루션명 무전→무전기
  if (await app.getByText('무전기', { exact: true }).first().isVisible().catch(() => false)) {
    diff(MENU, '솔루션명 "무전"(정책/tag_pool)', '"무전기"(구현)', '업데이트_고객노출_10', '기능 정상 — 명칭 표기 차이. 전 화면 공통');
  }

  // ── 인터랙션 ──────────────────────────────────────────────
  // UPDATE-11 솔루션 탭 필터 동작
  await check(app, MU('업데이트 > 필터 동작', 'UPDATE-11', '솔루션 탭 선택 시 필터 동작', { failMsg: '탭 필터 미동작' }), async () => {
    await gotoRoute(app, 'update'); await settle(app, 1000);
    const before = await app.locator(CARD).count();
    await app.locator('.sol-tab', { hasText: '경기관제' }).first().click();
    await settle(app, 1000);
    await expect(app, 'URL 필터(sol=)').toHaveURL(/[?&]sol=/);
    await expect(app.locator('.sol-tab.on', { hasText: '경기관제' }).first(), '활성 탭').toBeVisible({ timeout: 8_000 });
    const after = await app.locator(CARD).count();
    expect(after, `필터 후(${after}) ≤ 전체(${before})`).toBeLessThanOrEqual(before);
  });

  // UPDATE-12 상세 진입 (/update/{id} + .ud-title)
  const canDetail = (await (async () => { await gotoRoute(app, 'update'); await settle(app, 800); return app.locator(CARD).count().catch(() => 0); })()) > 0;
  if (!canDetail) {
    skip(MU('업데이트 > 상세 진입', 'UPDATE-12', '업데이트 상세 진입', {}), '업데이트 카드 0건');
  } else {
    await check(app, MU('업데이트 > 상세 진입', 'UPDATE-12', '카드 클릭 시 상세 진입', { failMsg: '상세 진입 실패' }), async () => {
      await gotoRoute(app, 'update'); await settle(app, 1000);
      await app.locator(CARD).first().click();
      await settle(app, 1200);
      await expect(app, '상세 URL(/update/{id})').toHaveURL(/\/update\/\d+/);
      await expect(app.locator('.ud-title').first(), '상세 제목').toBeVisible({ timeout: 8_000 });
    });

    // UPDATE-13 상세 상태 텍스트 숨김
    await check(app, MU('업데이트 > 상세 상태', 'UPDATE-13', '상세 상태 텍스트(반영완료 등) 미노출', { failMsg: '상세 상태 텍스트 노출' }), async () => {
      const body = await app.locator('body').innerText();
      expect(/반영완료|반영대기/.test(body), '상세 상태 텍스트 미노출').toBeFalsy();
    });

    // UPDATE-14 뒤로가기 → 목록 복귀
    await check(app, MU('업데이트 > 뒤로가기', 'UPDATE-14', '상세에서 목록으로 복귀', { failMsg: '목록 복귀 실패' }), async () => {
      const back = app.locator('.pg-back-btn').or(app.getByText('업데이트 목록', { exact: true }));
      await back.first().click();
      await settle(app, 1000);
      await expect(app, '목록 URL 복귀').toHaveURL(/\/update(\?|$)/);
      await expect(app.locator(CARD).first(), '목록 카드 재노출').toBeVisible({ timeout: 8_000 });
    });
  }
}
