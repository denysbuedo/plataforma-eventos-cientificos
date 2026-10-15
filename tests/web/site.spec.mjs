import { test, expect } from '@playwright/test';

test('an organizer saves a private draft and explicitly publishes it', async ({ page, context }) => {
  await page.goto('/es');
  await page.getByRole('button', { name: 'Entrar al espacio' }).click();
  await expect(page).toHaveURL(/event=a1/);
  await page.getByRole('link', { name: 'Contenido', exact: true }).first().click();
  const publicPage = await context.newPage();
  const publicUrl = `${process.env.SEP_TEST_PUBLIC_URL}/es?event=a1`;
  await publicPage.goto(publicUrl);
  const before = await publicPage.getByRole('heading', { level: 1 }).innerText();
  const title = 'La ciencia que nos reúne';
  await page.getByRole('textbox', { name: 'Título de portada', exact: true }).fill(title);
  await expect(page.getByRole('button', { name: 'Publicar cambios', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Guardar borrador', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Borrador guardado.');
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText(before, { useInnerText: true });
  await page.getByRole('button', { name: 'Publicar cambios', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Cambios publicados.');
  await publicPage.reload();
  await expect(publicPage.getByRole('heading', { level: 1 })).toHaveText(title);
});

test('public portals support both languages and fit a mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  for (const event of ['a1', 'b1']) {
    for (const lang of ['es', 'en']) {
      const response = await page.goto(`${process.env.SEP_TEST_PUBLIC_URL}/${lang}?event=${event}`);
      expect(response.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', lang);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    }
  }
});
