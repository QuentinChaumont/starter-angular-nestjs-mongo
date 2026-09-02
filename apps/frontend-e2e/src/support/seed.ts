import { API_URL } from '../../playwright.config';

/** A user seeded before the suite — for the "known account" scenarios
 * (wrong password, redirect-after-login). Tests that need a *fresh*
 * account register their own. */
export const SEEDED_USER = {
  email: 'e2e.user@example.com',
  password: 'Passw0rd!e2e',
  firstName: 'Eve',
  lastName: 'Tester',
};

export async function apiRegister(user: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(user),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`seed register failed: ${res.status} ${await res.text()}`);
  }
}
