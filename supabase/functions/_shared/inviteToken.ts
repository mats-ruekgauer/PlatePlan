// supabase/functions/_shared/inviteToken.ts
// Utilities for generating and hashing invite tokens.

/**
 * Generates a 256-bit URL-safe base64 token and its SHA-256 hex hash.
 * The raw token is sent to the user; only the hash is stored in the DB.
 */
export async function generateInviteToken(): Promise<{ token: string; tokenHash: string }> {
  const rawBytes = new Uint8Array(32); // 256-bit entropy
  crypto.getRandomValues(rawBytes);

  // URL-safe base64 (no padding)
  const token = btoa(String.fromCharCode(...rawBytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const tokenHash = await hashInviteToken(token);
  return { token, tokenHash };
}

/**
 * SHA-256 hex hash of a raw token string. Used during join validation.
 */
export async function hashInviteToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}
