# QA_CS_Admin

> SMARTSCORE **고객성공(CS Admin)** UI 검증 자동화 (Playwright).
> **실제 구현 사이트 ↔ 기획서 정책 정합성 검토**가 목적. 결과는 엑셀 리포트로 산출.

## 대상
- **사이트**: `https://customer-success-td.smartscore.kr` (클라우드 로그인 필요)
- **기획서**: `_docs/`(원본 `gwon-plan/cs-admin` 저장소에서 이관) — policy_admin·policy_user·common·cs_improvements·tag_pool·issued·DESIGN
- **분석 요약**: [`_docs/ANALYSIS_기획요약.md`](_docs/ANALYSIS_기획요약.md)
- **검토 계획**: [`_docs/정합성검토_계획.md`](_docs/정합성검토_계획.md)

## 스택
`@playwright/test` ^1.60 · TypeScript · exceljs(리포트). 리포터/헬퍼 패턴은 경기관제 하네스(SS_QA_Playwright) 재사용.

## 시작하기
```bash
npm install
npx playwright install chromium
npm run auth        # 브라우저에서 클라우드 수동 로그인 → auth/.auth/admin.json 세션 저장
npm run probe:ia    # 실제 사이트 IA·DOM 실측 덤프 → analysis/_ia-probe.json (헬퍼 보정용)
npm run typecheck   # 타입 전수 검증
npm run test        # (스위트 작성 후) CS Admin 정합성 검증
npm run report      # HTML 리포트 열기
```

## 디렉터리
| 위치 | 내용 |
|------|------|
| `auth/auth.setup.ts` | 클라우드 로그인 세션 생성(headed) |
| `lib/csHelpers.ts` | 진입(`openApp`)·네비게이션(`navigateMenu`)·`settle`·`extractDom` — **실측 후 보정 필요** |
| `lib/reporter.ts` | `check`/`checkText`/`gotoMenu`/`diff`/`skip`/`writeReport` (경기관제 이식) |
| `lib/reportHtml.ts`·`historyDb.ts` | 엑셀/HTML 리포트·이력 DB (제네릭 이식) |
| `Admin/*.spec.ts` | 검증 스펙 (진입 → run*() → writeReport) |
| `Admin/_probe-ia.spec.ts` | IA 실측 프로브(커밋 제외) |
| `locators/*.md` | UI요소·Locator 설계서 |
| `analysis/*.json` | DOM 덤프(기계가독, 커밋 제외) |
| `reports/` | 엑셀+HTML 산출물(커밋 제외) |

## 진행 상황
- ✅ **Phase 0 — 저장소 세팅**(config·auth·lib 이식·docs). 현재 단계.
- ⬜ Phase 1 — 접근 & IA 실측(로그인 필요, 헬퍼 보정)
- ⬜ Phase 2 — 화면별 정합성 스위트
- ⬜ Phase 3 — admin↔cs 차등 노출 교차검증
- ⬜ Phase 4 — 리포트

## ⚠️ 주의
- 자격증명은 자동화가 입력하지 않음 — `npm run auth`에서 사용자가 직접 로그인.
- 공유 QA 계정 추정 → 직렬 실행(workers=1) 기본. 동시 로그인 시 강제 로그아웃 주의.
- 실 DOM 확정 전까지 셀렉터/메뉴 매핑은 프로토타입 기준 초안(Phase 1에서 보정).
- 비파괴 원칙: 데이터 변경 동작은 노출·활성만 검증.
