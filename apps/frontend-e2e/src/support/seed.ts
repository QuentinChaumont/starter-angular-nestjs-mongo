import { MongoClient } from 'mongodb';
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

/** Seeded and promoted to `admin` — for the console scenarios. */
export const SEEDED_ADMIN = {
  email: 'e2e.admin@example.com',
  password: 'Passw0rd!e2e',
  firstName: 'Ada',
  lastName: 'Root',
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

/** No admin route can bootstrap the first admin, so poke the DB directly. */
export async function promoteToAdmin(
  mongoUri: string,
  email: string,
): Promise<void> {
  const client = new MongoClient(mongoUri);
  try {
    await client.connect();
    const res = await client
      .db()
      .collection('users')
      .updateOne({ email }, { $set: { roles: ['admin'] } });
    if (res.matchedCount !== 1) {
      throw new Error(
        `promoteToAdmin(${email}): matched ${res.matchedCount} docs at ${mongoUri}`,
      );
    }
  } finally {
    await client.close();
  }
}
