
import { createInternalNeonAuth } from '@neondatabase/neon-js/auth';
import { BetterAuthReactAdapter } from '@neondatabase/neon-js/auth/react/adapters';

const authUrl =
  (import.meta.env as any).VITE_NEON_AUTH_URL ||
  (import.meta.env as any).NEON_AUTH_URL;

if (!authUrl) {
  throw new Error('Missing VITE_NEON_AUTH_URL for browser auth client');
}

const neonAuth = createInternalNeonAuth(authUrl, {
  adapter: BetterAuthReactAdapter(),
});

export const authClient = neonAuth.adapter;

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
    const jwtToken = await neonAuth.getJWTToken();
    return jwtToken || null;
  } catch (error) {
    console.error('Failed to retrieve JWT token', error);
    return null;
  }
}
