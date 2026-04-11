import { supabase } from './supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

/**
 * Typed HTTP client for the FastAPI backend.
 *
 * Sends the current Supabase session JWT in the Authorization header.
 * Throws with the server error message on non-2xx responses.
 */
export async function callAPI<TResponse>(
  path: string,
  body: unknown,
): Promise<TResponse> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const token = session?.access_token;
  if (!token) {
    throw new Error('No active session — please sign in again');
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

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
