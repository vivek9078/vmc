"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { loginAction, type LoginFormState } from "./actions";

const initialState: LoginFormState = {};

export function LoginForm({ csrfToken, next }: { csrfToken: string; next?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialState);

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="csrfToken" value={csrfToken} />
      {next && <input type="hidden" name="next" value={next} />}

      <div>
        <label htmlFor="email" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="username"
          autoFocus
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-xs font-medium mb-1.5" style={{ color: "var(--color-text-secondary)" }}>
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
          style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)" }}
        />
      </div>

      {state.error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: "#FEF2F2", color: "#B91C1C" }}>
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full inline-flex items-center justify-center gap-2 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-transform hover:scale-[1.01] disabled:opacity-70"
        style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
      >
        {pending && <Loader2 size={15} className="animate-spin" />}
        Sign in
      </button>
    </form>
  );
}
