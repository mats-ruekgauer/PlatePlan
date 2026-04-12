import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) throw new Error('No active session — please sign in again');
  return token;
}

async function doRequest(path: string, body: unknown, token: string): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });
}

// ─── Main client ──────────────────────────────────────────────────────────────

/**
 * Typed HTTP client for the FastAPI backend.
 *
 * - Sends the current Supabase session JWT in the Authorization header.
 * - On 401: refreshes the session once and retries.
 * - On second 401 (or refresh failure): signs the user out so the AuthGuard
 *   redirects to the login screen.
 * - Throws with the server error message on all other non-2xx responses.
 */
export async function callAPI<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  let token = await getAccessToken();
  let res = await doRequest(path, body, token);

  // ── 401 handling: refresh once then retry ─────────────────────────────────
  if (res.status === 401) {
    const { error: refreshError } = await supabase.auth.refreshSession();

    if (refreshError) {
      // Refresh failed — session is dead, sign out
      await supabase.auth.signOut();
      throw new Error('Session expired — please sign in again');
    }

    const {
      data: { session: newSession },
    } = await supabase.auth.getSession();

    if (!newSession?.access_token) {
      await supabase.auth.signOut();
      throw new Error('Session expired — please sign in again');
    }

    token = newSession.access_token;
    res = await doRequest(path, body, token);

    // Still 401 after refresh → sign out
    if (res.status === 401) {
      await supabase.auth.signOut();
      throw new Error('Session expired — please sign in again');
    }
  }

  // ── Error handling for all other non-2xx ──────────────────────────────────
  if (!res.ok) {
    let message: string;
    try {
      const json = await res.json();
      message = json?.detail ?? json?.error ?? res.statusText;
    } catch {
      message = res.statusText;
    }
    throw new Error(`API error ${res.status}: ${message}`);
  }

  return res.json() as Promise<TResponse>;
}
