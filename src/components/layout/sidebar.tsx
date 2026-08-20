"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  LayoutGrid, PlusCircle, Inbox, FileClock, CheckCircle2, PlaneTakeoff, History,
  TrendingUp, Hotel, Bus, Ticket, Users as UsersIcon, BarChart3, Settings, ChevronLeft, ChevronRight, Table,
  UserCog, ShieldCheck, ScrollText, CalendarCheck, Wallet, UploadCloud, PackagePlus,
  type LucideIcon,
} from "lucide-react";
import { motion } from "framer-motion";

const NAV_SECTIONS: { label: string; items: { href: string; label: string; icon: LucideIcon; permission?: string }[] }[] = [
  {
    label: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutGrid },
      { href: "/queries", label: "Inquiries", icon: Inbox, permission: "query.view" },
      { href: "/queries/new", label: "New Inquiry", icon: PlusCircle, permission: "query.create" },
    ],
  },
  {
    label: "Quotations",
    items: [
      { href: "/queries?status=Quotation%20Sent", label: "Past Quotes", icon: FileClock },
      { href: "/queries?status=Confirmed", label: "Confirmed Quotes", icon: CheckCircle2 },
      { href: "/trips/upcoming", label: "Upcoming Trips", icon: PlaneTakeoff },
      { href: "/queries?status=Completed", label: "History", icon: History },
      { href: "/profit", label: "Profit", icon: TrendingUp, permission: "quotation.view_pricing" },
    ],
  },
  {
    label: "Bookings",
    items: [
      { href: "/bookings", label: "Bookings", icon: CalendarCheck, permission: "booking.view" },
      { href: "/accounts", label: "Accounts", icon: Wallet, permission: "accounts.view" },
    ],
  },
  {
    label: "Inventory",
    items: [
      { href: "/hotels", label: "Hotels Inventory", icon: Hotel },
      { href: "/transport", label: "Transport Inventory", icon: Bus },
      { href: "/activities", label: "Activities Inventory", icon: Ticket },
      { href: "/rate-sheet", label: "Rate Sheet", icon: Table, permission: "inventory.manage_rates" },
      { href: "/import-center", label: "Import History", icon: UploadCloud },
      { href: "/add-ons", label: "Add-ons", icon: PackagePlus },
      { href: "/suppliers", label: "Suppliers", icon: UsersIcon },
    ],
  },
  {
    label: "Admin",
    items: [
      { href: "/reports", label: "Reports", icon: BarChart3, permission: "reports.view" },
      { href: "/users", label: "Users", icon: UserCog, permission: "users.manage" },
      { href: "/roles", label: "Roles", icon: ShieldCheck, permission: "roles.manage" },
      { href: "/audit-logs", label: "Audit Logs", icon: ScrollText, permission: "audit.view" },
      { href: "/settings", label: "Settings", icon: Settings, permission: "settings.manage" },
    ],
  },
];

export function Sidebar({
  permissions,
  mobileOpen = false,
  onMobileClose,
}: {
  permissions: string[];
  mobileOpen?: boolean;
  onMobileClose?: () => void;
}) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const permissionSet = new Set(permissions);

  const visibleSections = NAV_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => !item.permission || permissionSet.has(item.permission)),
  })).filter((section) => section.items.length > 0);

  // Below the `lg` breakpoint the sidebar is an off-canvas drawer (fixed,
  // translated out of view, shown over a backdrop when `mobileOpen`) instead
  // of the always-visible column used at `lg` and above. The collapse
  // toggle at the bottom is a desktop-only density control — the drawer
  // always renders expanded so labels stay legible while open on a phone.
  const expanded = mobileOpen || !collapsed;

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={onMobileClose} aria-hidden="true" />
      )}
      <motion.aside
        animate={{ width: mobileOpen ? 248 : collapsed ? 72 : 248 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className={`shrink-0 h-screen lg:sticky top-0 flex flex-col border-r fixed z-50 lg:z-auto transition-transform duration-200 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ borderColor: "var(--color-border)", background: "var(--color-card)" }}
      >
        <div className="h-16 flex items-center px-4 gap-2 border-b" style={{ borderColor: "var(--color-border)" }}>
          <div
            className="h-8 w-8 rounded-xl flex items-center justify-center text-white text-xs font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
          >
            VD
          </div>
          {expanded && <span className="font-semibold text-sm truncate">The Vietnam DMC</span>}
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-5">
          {visibleSections.map((section) => (
            <div key={section.label}>
              {expanded && (
                <p className="px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-wider" style={{ color: "var(--color-text-muted)" }}>
                  {section.label}
                </p>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const active = pathname.startsWith(item.href.split("?")[0]);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={!expanded ? item.label : undefined}
                      onClick={onMobileClose}
                      className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-[13px] transition-colors"
                      style={
                        active
                          ? { background: "var(--color-teal-100)", color: "var(--color-teal-700)", fontWeight: 600 }
                          : { color: "var(--color-text-secondary)" }
                      }
                    >
                      <Icon size={17} strokeWidth={2} className="shrink-0" />
                      {expanded && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <button
          onClick={() => setCollapsed((c) => !c)}
          className="h-11 hidden lg:flex items-center justify-center border-t text-[13px]"
          style={{ borderColor: "var(--color-border)", color: "var(--color-text-secondary)" }}
        >
          {collapsed ? <ChevronRight size={16} /> : <><ChevronLeft size={16} className="mr-1" /> Collapse</>}
        </button>
      </motion.aside>
    </>
  );
}
