import { test } from '@playwright/test';
import { openApp } from '../lib/csHelpers';
import { runUpdate } from '../lib/suites';
import { writeReport, resetResults, resetDiff } from '../lib/reporter';

// ──────────────────────────────────────────────────────────────
//  업데이트(릴리즈 노트) 고객 노출 정합성 검증 (policy_user.md 기준)
//  실행: npx playwright test --project=cs-admin Admin/update.spec.ts --no-deps
//  ⚠ 재로그인 1회당 1런 — auth 직후 실행. 비파괴.
// ──────────────────────────────────────────────────────────────

test('업데이트 고객 노출 정합성', async ({ page, context }) => {
  test.setTimeout(120_000);
  resetResults();
  resetDiff();

  const app = await openApp(page, context);
  await runUpdate(app);

  await writeReport('업데이트');
});
