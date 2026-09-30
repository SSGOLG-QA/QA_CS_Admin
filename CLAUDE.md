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
- ✅ **Phase 0 세팅 완료**: playwright.config·auth.setup·lib(reporter/reportHtml/historyDb 이식 + csHelpers 신규)·docs·probe.
- ⬜ **Phase 1 (다음)**: `npm run auth` → `npm run probe:ia` → 실 DOM 기준으로 **csHelpers 보정**(SIDEBAR_LINK·CS_MENU·openApp 판정, auth.setup 로그인 URL/판정).
- ⬜ Phase 2 화면별 스위트 / Phase 3 admin↔cs 차등 / Phase 4 리포트. (계획: `_docs/정합성검토_계획.md`)

## ⚠️ 미보정(실측 필요) — 프로토타입 기준 초안
- `lib/csHelpers.ts`: `SIDEBAR_LINK`(사이드바 셀렉터), `CS_MENU`(메뉴 라벨), `openApp` 세션판정.
- `auth/auth.setup.ts`: 로그인 URL·성공 판정 셀렉터(현재 URL 도달 기반 보수적 판정).
- 위는 실제 사이트 DOM을 몰라 프로토타입(`gwon-plan/cs-admin` HTML) IA 기준으로 작성. **probe:ia 후 반드시 보정.**

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
