import { test } from '@playwright/test';
import { openApp } from '../lib/csHelpers';
import { runFaq } from '../lib/suites';
import { writeReport, resetResults, resetDiff } from '../lib/reporter';

test('FAQ 고객 노출 정합성', async ({ page, context }) => {
  test.setTimeout(120_000);
  resetResults(); resetDiff();
  const app = await openApp(page, context);
  await runFaq(app);
  await writeReport('FAQ');
});
