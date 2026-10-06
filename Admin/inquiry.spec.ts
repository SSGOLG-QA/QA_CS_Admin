import { test } from '@playwright/test';
import { openApp } from '../lib/csHelpers';
import { runInquiry } from '../lib/suites';
import { writeReport, resetResults, resetDiff } from '../lib/reporter';

// 문의(내문의·골프장·새문의) — 비파괴: 접수·발송·완료 클릭 금지(열람/필터만).
test('문의 고객 노출 정합성', async ({ page, context }) => {
  test.setTimeout(150_000);
  resetResults(); resetDiff();
  const app = await openApp(page, context);
  await runInquiry(app);
  await writeReport('문의');
});
