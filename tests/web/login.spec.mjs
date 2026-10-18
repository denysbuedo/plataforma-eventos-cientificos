import { test, expect } from '@playwright/test';

const accounts=[{name:'Demo mixed',persona:'mixed'},{name:'Demo admin',persona:'admin'},{name:'Demo outsider',persona:'outsider'},{name:'Revisor de prueba 1',persona:'reviewer'}];
for(const account of accounts){test(`login authenticates account ${account.persona} and shows its accesses`,async({page,context})=>{
 await page.goto('/es');await page.getByRole('radio',{name:new RegExp('^'+account.name)}).click();const response=page.waitForResponse(r=>r.url().endsWith('/api/auth/login'));await page.getByRole('button',{name:'Entrar al espacio'}).click();expect((await response).status()).toBe(200);await expect(page).toHaveURL(/event=orgA&tab=access/);await expect(page.getByRole('heading',{level:1})).toHaveText('Mis accesos');await expect(page.getByRole('heading',{name:account.name,exact:true})).toBeVisible();const cookie=(await context.cookies()).find(c=>c.name==='sep_demo_session');expect(cookie?.httpOnly).toBe(true);expect(cookie?.sameSite).toBe('Lax');await page.locator('.participant-account summary').click();await page.getByRole('button',{name:'Cerrar sesión'}).click();await expect(page.getByRole('button',{name:'Entrar al espacio'})).toBeVisible();
});}
test('login preserves an explicit event destination',async({page})=>{await page.goto('/es?event=a1&tab=content');await page.getByRole('button',{name:'Entrar al espacio'}).click();await expect(page).toHaveURL(/event=a1&tab=content/);await expect(page.getByRole('heading',{level:1})).toBeVisible();});

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
