// 고객성공(CS) 고객 화면 통합 TC — 전 메뉴 1개 파일(시트별), 각 시트 = 프론트 UI + 연계 + 예외·경계
// 실행: node tc/build_all_tc.js
const { buildWorkbook } = require('./_tclib');
const noticeV2 = require('./build_notice_tc_v2');      // 프론트 22 + 연계 16
const noticeExc = require('./build_notice_exception_tc'); // 예외 34
const update = require('./build_update_tc');            // 업데이트 28
const guide = require('./build_guide_tc');              // 가이드 21
const faq = require('./build_faq_tc');                  // FAQ 15
const inquiry = require('./build_inquiry_tc');          // 문의 23
const home = require('./build_home_tc');                // 홈 13
const exc = require('./_exceptions');                   // 가이드/FAQ/문의/홈 예외

const sheets = [
  { sheet: '공지사항', s1: '공지사항', rows: [...noticeV2, ...noticeExc], headerColor: 'FF1C1E54' },
  { sheet: '업데이트', s1: '업데이트', rows: update, headerColor: 'FF1C1E54' },
  { sheet: '솔루션 가이드', s1: '솔루션 가이드', rows: [...guide, ...exc.guide], headerColor: 'FF3A2A6A' },
  { sheet: 'FAQ', s1: '자주 묻는 질문', rows: [...faq, ...exc.faq], headerColor: 'FF3A2A6A' },
  { sheet: '문의', s1: '문의(내문의·골프장·새문의)', rows: [...inquiry, ...exc.inquiry], headerColor: 'FF13303A' },
  { sheet: '홈', s1: '홈', rows: [...home, ...exc.home], headerColor: 'FF2A2A5A' },
];

buildWorkbook({ sheets, outName: '고객성공_CS_통합TC_2026-10_v1.xlsx' });
