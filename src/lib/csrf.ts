// =============================================================================
// CSRF protection.
//
// Next.js Server Actions already reject cross-origin POSTs by comparing the
// request's Origin header against the deployment's host (built into the
// framework since 13.4). The login flow below is the one place that runs
// *before* a session exists, so it gets an explicit double-submit-cookie
// token on top of that as defense in depth. `assertSameOrigin` is a second
// layer applied to the plain Route Handlers (PDF/Excel export) that mutate
// nothing but do read protected data.
//
// Cookie *mutation* is only allowed from a Server Action or Route Handler
// in Next.js — a Server Component (like the /login page) may only read
// cookies. So the token is actually created in middleware.ts (which runs
// on every request and can set cookies on its response) the first time it
// sees a request to /login without one; the page and the login Server
// Action both just read it.
// =============================================================================

import { cookies, headers } from "next/headers";

export const CSRF_COOKIE_NAME = "vdmc_csrf";
export const CSRF_COOKIE_MAX_AGE_SECONDS = 60 * 60; // 1 hour — long enough to fill in a login form

export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Read-only — safe to call from a Server Component. Returns "" if middleware hasn't set the cookie yet (shouldn't happen for a normal browser navigation to /login, since middleware sets it on the way in). */
export async function readCsrfToken(): Promise<string> {
  const store = await cookies();
  return store.get(CSRF_COOKIE_NAME)?.value ?? "";
}

/** Call from the form-handling Server Action with the hidden-field value the client submitted. */
export async function verifyCsrfToken(submittedToken: string | undefined | null): Promise<boolean> {
  if (!submittedToken) return false;
  const store = await cookies();
  const cookieToken = store.get(CSRF_COOKIE_NAME)?.value;
  if (!cookieToken) return false;
  return timingSafeEqual(cookieToken, submittedToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return result === 0;
}

/** Defense-in-depth Origin check for plain Route Handlers. Server Actions already get this from Next.js itself. */
export async function assertSameOrigin(): Promise<void> {
  const h = await headers();
  const origin = h.get("origin");
  if (!origin) return; // same-origin navigations/GETs from a browser often omit Origin — nothing to compare against
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl && origin !== appUrl) {
    throw new Error("Cross-origin request blocked.");
  }
}
