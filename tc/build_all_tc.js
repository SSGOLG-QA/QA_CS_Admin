// 고객성공(CS) 통합 TC — 고객(Front) 6화면 + 운영자(Admin) 9화면 = 1개 파일(시트별)
// 각 시트 = 프론트 UI/연계/예외·경계(고객), 또는 구조·폼·유효성·연계·예외(운영자)
// 실행: node tc/build_all_tc.js
const { buildWorkbook } = require('./_tclib');
// 고객(Front)
const noticeV2 = require('./build_notice_tc_v2');
const noticeExc = require('./build_notice_exception_tc');
const update = require('./build_update_tc');
const guide = require('./build_guide_tc');
const faq = require('./build_faq_tc');
const inquiry = require('./build_inquiry_tc');
const home = require('./build_home_tc');
const exc = require('./_exceptions');
// 운영자(Admin)
const A = require('./_admin_rows');

const FRONT = 'FF1C1E54', FRONT2 = 'FF13303A', FRONT3 = 'FF2A2A5A';
const ADMIN = 'FF4434D4'; // admin 브랜드 인디고 계열(고객 시트와 구분)
const S0A = '고객성공(admin)';

const sheets = [
  // ── 고객(Front) ──
  { sheet: '공지사항', s1: '공지사항', rows: [...noticeV2, ...noticeExc], headerColor: FRONT },
  { sheet: '업데이트', s1: '업데이트', rows: update, headerColor: FRONT },
  { sheet: '솔루션 가이드', s1: '솔루션 가이드', rows: [...guide, ...exc.guide], headerColor: 'FF3A2A6A' },
  { sheet: 'FAQ', s1: '자주 묻는 질문', rows: [...faq, ...exc.faq], headerColor: 'FF3A2A6A' },
  { sheet: '문의', s1: '문의(내문의·골프장·새문의)', rows: [...inquiry, ...exc.inquiry], headerColor: FRONT2 },
  { sheet: '홈', s1: '홈', rows: [...home, ...exc.home], headerColor: FRONT3 },
  // ── 운영자(Admin) ──
  { sheet: 'A.대시보드', s0: S0A, s1: '대시보드', rows: A.dashboard, headerColor: ADMIN },
  { sheet: 'A.공지사항', s0: S0A, s1: '공지사항', rows: A.notice, headerColor: ADMIN },
  { sheet: 'A.업데이트', s0: S0A, s1: '업데이트', rows: A.update, headerColor: ADMIN },
  { sheet: 'A.솔루션 가이드', s0: S0A, s1: '솔루션 가이드', rows: A.guide, headerColor: ADMIN },
  { sheet: 'A.FAQ', s0: S0A, s1: '자주 묻는 질문', rows: A.faq, headerColor: ADMIN },
  { sheet: 'A.빠른 검색 태그', s0: S0A, s1: '빠른 검색 태그', rows: A.quicktags, headerColor: ADMIN },
  { sheet: 'A.문의 관리', s0: S0A, s1: '문의 관리', rows: A.inquiry, headerColor: ADMIN },
  { sheet: 'A.관리자 계정', s0: S0A, s1: '관리자 계정', rows: A.members, headerColor: ADMIN },
  { sheet: 'A.국가·골프장', s0: S0A, s1: '국가 / 골프장', rows: A.countries, headerColor: ADMIN },
];

buildWorkbook({ sheets, outName: '고객성공_통합TC_2026-10_v2.xlsx' });
