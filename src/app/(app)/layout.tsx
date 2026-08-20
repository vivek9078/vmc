import { AppShell } from "@/components/layout/app-shell";
import { requireAuth } from "@/lib/auth";

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
