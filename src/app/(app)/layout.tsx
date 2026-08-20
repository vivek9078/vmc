import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth";

// This entire section is per-user and reads from a live Excel data file —
// it must never be statically generated/executed at build time. Without
// this, Next tries to prerender these pages during the build (no cookies,
// no data.xlsx yet), which throws and shows up as a generic "Failed to
// collect page data" error on whatever page it reaches first.
export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // Defense in depth: middleware already gates every non-public route on a
  // valid session, but this re-resolves the live permission set for this
  // request (role changes and deactivations apply immediately) and supplies
  // it to the nav so admin-only links don't flash for everyone.
  const ctx = await requireAuth();

  return (
    <AppShell permissions={Array.from(ctx.permissions)} user={{ name: ctx.name, email: ctx.email, roleName: ctx.roleName }}>
      {children}
    </AppShell>
  );
}
