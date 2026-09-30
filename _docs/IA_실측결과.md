# IA 실측 결과 (2026-09-30)

> `npm run probe:ia` (`analysis/_ia-probe.json`) 결과. 라이브 사이트 구조 확정.

## 결론: 라이브 사이트 = **고객(Customer) CS 화면**
- URL: `https://customer-success-td.smartscore.kr`
- title: `Smartscore Customer Success`
- 정체: **골프장 관계자용 고객 화면** (= `smartscore_cs.html` 실구현) → 기준 정책 = **`policy_user.md`**
- 운영자(admin) 화면 아님. (admin은 policy_admin 기준 `cc.smartscore.kr/ss/mng` 별도 경로로 추정 — 현재 스코프 밖)
- 스택: **Vue SPA**, GNB = `.nav-item`(router-link), 라우트 직접 이동 가능.

## GNB / 라우트 (실측)
| 키 | 라벨 | 라우트 |
|----|------|--------|
| home | 홈 | `/` |
| notice | 공지사항 | `/notice` |
| update | 업데이트 | `/update` |
| guide | 솔루션 가이드 | `/guide` |
| faq | 자주 묻는 질문 | `/faq` |
| myinquiry | 내 문의 | `/myinquiry` |
| gcinquiry | 골프장 문의 | `/gcinquiry` |
| (newinquiry) | (새 문의 접수 — GNB 아님, 버튼 진입) | `/newinquiry` |

- 홈 섹션(headings): 도움이 필요하신가요? · 공지사항 · 업데이트 · 내 문의 · 골프장 문의 · 자주 묻는 질문 · 솔루션별 가이드 → cs.html 기획과 일치.
- 언어 선택기: `KOR` 버튼(헤더). `Smartscore Cloud 홈` 링크.

## 공지사항(/notice) 구조
- 솔루션 필터 탭 **12개**: 전체 / 경기관제 / ERP / 테이블오더 / **무전기** / 셀프체크 / 블랙박스 / 대기호출 / 데이터마케팅 / 카트내결제 / 코스관리 / 클라우드
  - ⚠ **기획-구현 차이 후보**: 정책/태그풀은 "무전" → 실구현 탭은 **"무전기"** (검증 시 `diff` 기록 대상)
- 공지 목록은 **카드형**(테이블 아님).
- **QA 시험 데이터 존재**: "(시험) 적용 국가 한국 단독 공지", "(시험) URL 토큰 표본 공지", "(시험) 공지 제목 최대 길이 표본 — 오십 자를…" → 경계값 검증용 시드 확인.

## 헬퍼 보정 반영 (lib/csHelpers.ts)
- `CS_ROUTE` / `CS_NAV_LABEL` 실측 라우트로 교체(admin 메뉴 제거).
- `gotoRoute(app, key)` — Vue SPA 라우트 직접 이동(권장).
- `SIDEBAR_LINK` → `.nav-item` 기반.

## 남은 확인
- 운영자(admin) 화면도 검토 대상인지 → 별도 URL/로그인 필요(스코프 확인 요망).
- 각 화면 상세 구조(업데이트/가이드/FAQ/문의)는 화면별 프로브로 추가 덤프 후 스위트 작성.
