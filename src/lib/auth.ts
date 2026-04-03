
import { createAuthClient } from '@neondatabase/neon-js/auth';

const authUrl =
  (import.meta.env as any).VITE_NEON_AUTH_URL ||
  (import.meta.env as any).NEON_AUTH_URL;

if (!authUrl) {
  throw new Error('Missing VITE_NEON_AUTH_URL for browser auth client');
}

export const authClient = createAuthClient(authUrl);

export async function getAuthToken(session?: any) {
  const directToken =
    session?.idToken ||
    session?.accessToken ||
    session?.token ||
    session?.session?.token ||
    session?.data?.session?.token;

  if (directToken) {
    return directToken;
  }

  try {
    const jwtToken = await (authClient as any).getJWTToken?.();
    return jwtToken || null;
  } catch (error) {
    console.error('Failed to retrieve JWT token', error);
    return null;
  }
}
