import {expect, test} from '@playwright/test';
import {loginAsTestAdmin} from './portal-test-helpers';

test('internal round decision simulator is isolated and calculates mechanics', async ({page}) => {
  await loginAsTestAdmin(page);
  await page.goto('/demo/dev/round-decision');
  await expect(page.getByRole('heading', {name: 'Choose the capital that earns the next proof point.'})).toBeVisible();
  await expect(page.getByText('AWAITING FOUNDER APPROVAL', {exact: true})).toBeVisible();
  await expect(page.getByRole('button', {name: /RECOMMENDED CORE €1M/})).toBeVisible();
  await expect(page.locator('header nav').getByText(/round decision/i)).toHaveCount(0);
  await expect(page.getByText('€7M', {exact: true})).toBeVisible();
  await expect(page.getByText('14.3%', {exact: true})).toBeVisible();
  await page.getByRole('button', {name: /CAPITAL SCENARIO €1\.5M/}).click();
  await expect(page.getByText('€7.5M', {exact: true})).toBeVisible();
  await expect(page.getByText('20%', {exact: true}).first()).toBeVisible();
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
});
