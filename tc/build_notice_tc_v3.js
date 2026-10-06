// 공지사항 TC v3 — 프론트 UI + 연계 검증 + 예외·경계 통합(취합)
// 실행: node tc/build_notice_tc_v3.js  (cwd = D:\CS_Admin_QA)
const { buildTC } = require('./_tclib');
const v2 = require('./build_notice_tc_v2');          // 프론트 UI 22 + 연계 16
const exc = require('./build_notice_exception_tc');   // 예외·경계 34

// 섹션 구분선(2depth 그룹명이 바뀌므로 자동 구분됨). v2 뒤에 예외 세트 이어붙임.
const rows = [...v2, ...exc];

buildTC({
  sheet: '공지사항',
  s1: '공지사항',
  rows,
  outName: '공지사항_TC_2026-10_v3.xlsx',
}).then(() => {
  console.log(`  → v2(${v2.length}) + 예외·경계(${exc.length}) = ${rows.length}행 통합`);
});
