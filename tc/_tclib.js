// 공통 TC 빌더 — SmartScore QA 표준 시트(2행 헤더/화면 0~3depth 병합/요소 단위)
// rows: [2depth, 3depth, 기능, 사전조건, 절차, 예상결과, 기획서, 비고]
const ExcelJS = require('exceljs');
const path = require('path');

const FN_FILL = { '보안': 'FFFDE4EA', '예외처리': 'FFFDF0D5', '경계값': 'FFE7F0FF', '정합성': 'FFEAF6F0', '연계': 'FFF3F0FF' };

// 한 워크북에 시트 1개 추가(표준 포맷)
function addSheet(wb, { sheet, s0 = '고객성공(고객)', s1, rows, headerColor = 'FF1C1E54' }) {
  const ws = wb.addWorksheet(sheet);
  const headers = ['No.', '화면', '화면', '화면', '화면', '기능', '사전 조건', '절차', '예상결과', '기획서', 'QA 확인 결과', 'JIRA', '비고'];
  const sub = ['', '(0 depth)', '(1 depth)', '(2 depth)', '(3 depth)', '', '', '', '', '', '', '', ''];
  ws.addRow(headers); ws.addRow(sub);
  ws.mergeCells('B1:E1');
  ['A', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M'].forEach(c => ws.mergeCells(`${c}1:${c}2`));
  rows.forEach((r, i) => ws.addRow([i + 1, s0, s1, r[0], r[1], r[2], r[3], r[4], r[5], r[6], '', '', r[7]]));
  const first = 3, last = first + rows.length - 1;
  ws.mergeCells(`B${first}:B${last}`); ws.mergeCells(`C${first}:C${last}`);
  let gs = first;
  for (let i = 1; i <= rows.length; i++) {
    const cur = rows[i - 1][0], nxt = i < rows.length ? rows[i][0] : null;
    if (cur !== nxt) { const rs = gs, re = first + i - 1; if (re > rs) ws.mergeCells(`D${rs}:D${re}`); gs = first + i; }
  }
  const widths = [5, 14, 13, 16, 22, 8, 26, 30, 48, 22, 12, 8, 40];
  widths.forEach((w, i) => (ws.getColumn(i + 1).width = w));
  ws.eachRow((row, rn) => {
    row.eachCell(cell => {
      cell.alignment = { vertical: 'top', wrapText: true };
      cell.border = { top: { style: 'thin', color: { argb: 'FFDDDDDD' } }, bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } }, left: { style: 'thin', color: { argb: 'FFDDDDDD' } }, right: { style: 'thin', color: { argb: 'FFDDDDDD' } } };
    });
    if (rn <= 2) row.eachCell(cell => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: headerColor } }; cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true }; });
    else { const fn = rows[rn - 3][2]; const c = FN_FILL[fn]; if (c) ws.getCell(`F${rn}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: c } }; }
  });
  ws.autoFilter = { from: { row: 2, column: 1 }, to: { row: last, column: headers.length } };
  ws.views = [{ state: 'frozen', ySplit: 2 }];
  return ws;
}

// 단일 시트 파일
async function buildTC({ sheet, s0, s1, rows, outName, headerColor }) {
  const wb = new ExcelJS.Workbook();
  addSheet(wb, { sheet, s0, s1, rows, headerColor });
  const out = path.join(process.cwd(), 'tc', outName);
  await wb.xlsx.writeFile(out);
  const by = {}; rows.forEach(r => (by[r[2]] = (by[r[2]] || 0) + 1));
  console.log('생성 완료:', outName, '| 행:', rows.length, '| 기능별:', JSON.stringify(by));
  return out;
}

// 다중 시트(통합) 파일 — sheets: [{sheet, s1, rows, headerColor}]
async function buildWorkbook({ sheets, outName, s0 }) {
  const wb = new ExcelJS.Workbook();
  let total = 0;
  sheets.forEach(sh => { addSheet(wb, { s0, ...sh }); total += sh.rows.length; });
  const out = path.join(process.cwd(), 'tc', outName);
  await wb.xlsx.writeFile(out);
  console.log('통합 생성 완료:', outName, '| 시트:', sheets.length, '| 총 행:', total);
  sheets.forEach(sh => console.log(`  - ${sh.sheet}: ${sh.rows.length}행`));
  return out;
}

module.exports = { buildTC, buildWorkbook, addSheet, FN_FILL };
