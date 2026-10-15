import { test, expect } from '@playwright/test';

const profiles = [
  { name: 'Organizador', event: 'a1', heading: 'Un encuentro, muchas posibilidades.' },
  { name: 'Administrador de organización', event: 'orgA', heading: 'Un encuentro, muchas posibilidades.' },
  { name: 'Participante', event: 'b1', heading: 'Este espacio tiene permisos propios.' },
];

for (const profile of profiles) {
  test(`login accepts the browser origin for ${profile.name}`, async ({ page, context }) => {
    await page.goto('/es');
    await page.getByRole('radio', { name: new RegExp(`^${profile.name}`) }).click();
    const response = page.waitForResponse((response) => response.url().endsWith('/api/auth/login'));
    await page.getByRole('button', { name: 'Entrar al espacio' }).click();
    expect((await response).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`event=${profile.event}`));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(profile.heading);
    const cookie = (await context.cookies()).find((cookie) => cookie.name === 'sep_demo_session');
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe('Lax');
    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page.getByRole('button', { name: 'Entrar al espacio' })).toBeVisible();
  });
}

test('login rejects foreign and missing origins', async ({ request }) => {
  for (const headers of [{ origin: 'https://untrusted.example' }, {}]) {
    const response = await request.post('/api/auth/login', { headers, data: { persona: 'mixed' } });
    expect(response.status()).toBe(403);
    expect(response.headers()['set-cookie']).toBeUndefined();
  }
});

test('a forged session does not enter the workspace', async ({ page, context, baseURL }) => {
  await context.addCookies([{ name: 'sep_demo_session', value: 'forged.invalid', url: baseURL }]);
  await page.goto('/es?event=a1');
  await expect(page.getByRole('button', { name: 'Entrar al espacio' })).toBeVisible();
});
