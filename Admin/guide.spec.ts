import { test } from '@playwright/test';
import { openApp } from '../lib/csHelpers';
import { runGuide } from '../lib/suites';
import { writeReport, resetResults, resetDiff } from '../lib/reporter';

// 솔루션 가이드 고객 노출 정합성 (policy_user.md) — 비파괴. 재로그인 직후 실행.
test('솔루션 가이드 고객 노출 정합성', async ({ page, context }) => {
  test.setTimeout(120_000);
  resetResults(); resetDiff();
  const app = await openApp(page, context);
  await runGuide(app);
  await writeReport('솔루션가이드');
});
