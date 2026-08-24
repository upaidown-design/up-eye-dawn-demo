import {expect, test} from '@playwright/test';

const publicRoutes = ['/', '/admin/login', '/transparency'];
const viewports = [
  {name: 'small-phone', width: 360, height: 800},
  {name: 'phone', width: 390, height: 844},
  {name: 'tablet', width: 768, height: 1024},
  {name: 'desktop', width: 1440, height: 900},
];

test('language selector persists Spanish and restores English', async ({page}) => {
  await page.goto('/demo/?lang=es');
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  await expect(page.getByText('Observa desde el aire.')).toBeVisible();
  await expect(page.getByRole('button', {name: 'ES'})).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', {name: 'EN'}).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByText('Observe from the air.')).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');

  await page.goto('/demo/admin/login?lang=es');
  await expect(page.getByRole('heading', {name: 'Iniciar sesión'})).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Contraseña')).toBeVisible();
});

for (const viewport of viewports) {
  for (const route of publicRoutes) {
    test(`${route} fits ${viewport.name} without horizontal page overflow`, async ({page}) => {
      await page.setViewportSize({width: viewport.width, height: viewport.height});
      await page.goto(`/demo${route}?lang=es`);
      await expect(page.locator('html')).toHaveAttribute('lang', 'es');
      const dimensions = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
      }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.client + 1);
      const selector = page.locator('.language-switcher').first();
      await expect(selector).toBeVisible();
      const box = await selector.boundingBox();
      expect(box).not.toBeNull();
      expect(box!.x).toBeGreaterThanOrEqual(0);
      expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1);
    });
  }
}
