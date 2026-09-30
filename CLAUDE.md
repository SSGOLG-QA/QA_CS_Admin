# CLAUDE.md — QA_CS_Admin

> SMARTSCORE **고객성공(CS Admin)** 정책-구현 정합성 검토 자동화. 새 세션 맥락 인계용.

## 목적
- **대상**: `https://customer-success-td.smartscore.kr` (클라우드 로그인 필요, SPA)
- **일**: 기획서(`_docs/`) ↔ 실제 구현 사이트 **정합성 전수 검토** → 엑셀 리포트
- **스택**: `@playwright/test` ^1.60 · TypeScript(commonjs) · exceljs. 리포터/헬퍼는 경기관제 하네스(`D:\Playwright`=SS_QA_Playwright)에서 이식.

## 실행
```bash
npm install && npx playwright install chromium
npm run auth        # headed 수동 클라우드 로그인 → auth/.auth/admin.json
npm run probe:ia    # 실 IA/DOM 덤프 → analysis/_ia-probe.json
npm run typecheck   # tsc -p tsconfig.typecheck.json
npm run test        # cs-admin 스위트 (작성 후)
```

## 현재 상태 (2026-09-30)
- ✅ **Phase 0 세팅 완료**: playwright.config·auth.setup·lib(reporter/reportHtml/historyDb 이식 + csHelpers)·docs·probe.
- ✅ **Phase 1 접근·IA 실측 완료**: `npm run auth`(클라우드 로그인 우선, SSO로 CS 자동 진입) 성공 → `npm run probe:ia` 덤프.
  - **핵심 발견**: 라이브 사이트 = **고객(Customer) CS 화면**(= cs.html 실구현, 기준 = `policy_user.md`). 운영자 admin 아님. → `_docs/IA_실측결과.md`
  - csHelpers 실측 보정 완료(`CS_ROUTE`/`CS_NAV_LABEL`/`gotoRoute`/`SIDEBAR_LINK=.nav-item`).
- ⬜ **Phase 2 (다음)**: 고객 화면별 정합성 스위트(공지→업데이트→가이드→FAQ→문의). policy_user.md 기준.
- ⬜ Phase 3 admin↔cs 차등(운영자 화면 스코프 확인 필요) / Phase 4 리포트. (계획: `_docs/정합성검토_계획.md`)

## 실측 확정 (2026-09-30) — `_docs/IA_실측결과.md`
- 라이브 = 고객 CS 화면. Vue SPA, GNB=.nav-item, 라우트 직접이동 가능.
- 라우트: `/ /notice /update /guide /faq /myinquiry /gcinquiry (/newinquiry)`.
- 공지 솔루션 탭 12개(전체+11). ⚠ 실구현 "무전기" vs 정책 "무전"(diff 후보). QA 시험 데이터("(시험)…") 시드 존재.
- 운영자 admin 화면은 별도 경로(cc.smartscore.kr/ss/mng 추정) — **스코프 확인 요망**.

## 컨벤션 (경기관제 승계)
1. 리포터: `check`/`checkText`(안내문구 전문 일치)/`diff`(기획-구현 차이)/`skip`(사유). 실패해도 계속(전수).
2. 비파괴: 저장/삭제/발송 등 데이터 변경은 노출·활성만. 토글은 원복.
3. 동적 채번 id 금지 → 섹션/텍스트 스코프. 공백 무시 매칭.
4. 2축: 기능 정상인데 기획과 다르면 AS-IS 검증(PASS)+`diff`. 데이터 의존은 `≥N`/`skip`.

## 제약
- 자격증명은 자동화가 입력 안 함(사용자 수동 로그인). 공유 QA 계정 추정 → workers=1 직렬.
- `historyDb.ts`는 `node:sqlite`(Node 24+) 사용.

## 확정 규칙 요약
→ `_docs/ANALYSIS_기획요약.md` (솔루션 11·국가 11·언어 8, 블록30·제목50자·영상50MB·첨부5, 문의 3상태, 번역 저장형+Google, 알림 6종 7일, 관련가이드 5개 양방향, 태그 3depth 등).
