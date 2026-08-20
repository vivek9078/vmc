"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

/**
 * Catches any error thrown while rendering a page (or its layout) inside
 * `(app)/` — e.g. a repository/Excel read failure, or `requireAuth()`
 * throwing because the session was valid at the middleware check a moment
 * ago but the user/role lookup failed or the account was deactivated in
 * between. Without this file, Next.js falls back to its default blank/
 * generic error page for any uncaught render error, which is what "the
 * dashboard doesn't open" looks like from the browser with no way to see
 * why. This does not change auth behavior — middleware is still the real
 * gate; this only makes failures *visible* instead of silent.
 */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[app] render error:", error);
  }, [error]);

  const isAuthError = error.name === "AuthorizationError";

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-sm w-full text-center">
        <div
          className="h-12 w-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
          style={{ background: "#FEF2F2", color: "#B91C1C" }}
        >
          <AlertTriangle size={22} />
        </div>
        <h1 className="text-lg font-bold tracking-tight mb-1">
          {isAuthError ? "Session problem" : "Something went wrong"}
        </h1>
        <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
          {isAuthError
            ? "We couldn't confirm your session. Try signing in again."
            : "This page hit an unexpected error. You can try again, or head back to the dashboard."}
        </p>
        <div className="flex items-center justify-center gap-2">
          {isAuthError ? (
            <Link
              href="/login"
              className="text-sm font-medium px-4 py-2 rounded-xl text-white"
              style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
            >
              Go to login
            </Link>
          ) : (
            <>
              <button
                onClick={reset}
                className="text-sm font-medium px-4 py-2 rounded-xl text-white"
                style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
              >
                Try again
              </button>
              <Link
                href="/dashboard"
                className="text-sm font-medium px-4 py-2 rounded-xl"
                style={{ border: "1px solid var(--color-border)", color: "var(--color-text-secondary)" }}
              >
                Dashboard
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
