import { readCsrfToken } from "@/lib/csrf";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const csrfToken = await readCsrfToken();

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: "var(--color-bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div
            className="h-9 w-9 rounded-xl flex items-center justify-center text-white text-xs font-bold"
            style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
          >
            VD
          </div>
          <span className="font-semibold text-sm">The Vietnam DMC</span>
        </div>

        <div className="card-surface p-6">
          <h1 className="text-lg font-bold tracking-tight mb-1">Sign in</h1>
          <p className="text-sm mb-5" style={{ color: "var(--color-text-secondary)" }}>
            Internal access only.
          </p>
          <LoginForm csrfToken={csrfToken} next={next} />
        </div>
      </div>
    </div>
  );
}
