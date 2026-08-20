"use client";

import { useState } from "react";
import { Sidebar } from "./sidebar";
import { Topbar } from "./topbar";

/**
 * Wraps Sidebar + Topbar + page content. The only reason this exists is to
 * hold the "is the mobile nav drawer open" flag somewhere both Sidebar (which
 * renders the drawer) and Topbar (which renders the hamburger button that
 * opens it) can reach — they're rendered as siblings from the (app) layout,
 * a Server Component, so this small client boundary is the simplest way to
 * share that one piece of state. Desktop layout/behavior is unchanged.
 */
export function AppShell({
  permissions,
  user,
  children,
}: {
  permissions: string[];
  user: { name: string; email: string; roleName: string };
  children: React.ReactNode;
}) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ background: "var(--color-bg)" }}>
      <Sidebar permissions={permissions} mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar user={user} onMenuClick={() => setMobileNavOpen(true)} />
        <main className="flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
