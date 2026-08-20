"use server";

import { redirect } from "next/navigation";
import { login } from "@/lib/auth";
import { verifyCsrfToken } from "@/lib/csrf";

export interface LoginFormState {
  error?: string;
}

/** Only allow same-app relative redirects — never follow an attacker-supplied absolute or protocol-relative URL. */
function safeNextPath(next: FormDataEntryValue | null): string {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//")) return "/dashboard";
  return next;
}

export async function loginAction(_prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const csrfToken = formData.get("csrfToken");
  const nextPath = safeNextPath(formData.get("next"));

  const csrfValid = await verifyCsrfToken(typeof csrfToken === "string" ? csrfToken : null);
  if (!csrfValid) {
    return { error: "Your session expired — please reload the page and try again." };
  }

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const result = await login(email, password);
  if (!result.ok) {
    return { error: result.error };
  }

  redirect(nextPath);
}
