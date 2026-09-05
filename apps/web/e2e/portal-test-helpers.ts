import {expect, type APIRequestContext, type Page} from '@playwright/test';

export const testAdminEmail = process.env.E2E_ADMIN_EMAIL ?? 'e2e-owner@example.invalid';
export const testAdminPassword = process.env.E2E_ADMIN_PASSWORD ?? 'E2E-Owner-Only-2026!';

export async function loginAsTestAdmin(page: Page) {
  await page.goto('/demo/admin/login');
  await page.getByLabel('Email').fill(testAdminEmail);
  await page.getByLabel('Password').fill(testAdminPassword);
  await page.getByRole('button', {name: 'ENTER PRIVATE PORTAL'}).click();
  await expect(page).toHaveURL(/\/demo\/admin$/);
  await expect(page.getByRole('heading', {name: /project, meeting and private investor flow/i})).toBeVisible();
}

export async function csrfToken(request: APIRequestContext) {
  const state = await request.storageState();
  const cookie = state.cookies.find((item) => item.name === 'ued_admin_csrf' || item.name === '__Host-ued-admin-csrf');
  if (!cookie) throw new Error('Admin CSRF cookie is missing from the test context');
  return cookie.value;
}

export async function adminMutation(request: APIRequestContext, method: 'post' | 'patch', path: string, data: unknown) {
  const headers = {'x-csrf-token': await csrfToken(request), origin: process.env.E2E_ORIGIN ?? 'http://127.0.0.1:8090'};
  return request[method](path, {data, headers});
}

export function invitationToken(shareUrl: string) {
  const url = new URL(shareUrl);
  const fragmentToken = new URLSearchParams(url.hash.slice(1)).get('token');
  const pathToken = url.pathname.split('/').filter(Boolean).at(-1);
  const token = fragmentToken ?? pathToken;
  if (!token || token.length < 32) throw new Error('One-time invitation token was not present');
  return token;
}
