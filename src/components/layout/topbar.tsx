"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useRef, useState } from "react";
import { Search, Plus, Sun, Moon, Bell, LogOut, ChevronDown, Menu } from "lucide-react";
import { CommandPalette } from "./command-palette";
import { logoutAction } from "@/app/(app)/logout-action";

export function Topbar({ user, onMenuClick }: { user: { name: string; email: string; roleName: string }; onMenuClick?: () => void }) {
  const { theme, setTheme } = useTheme();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- standard hydration-safe "mounted" flag for theme-dependent UI
  useEffect(() => setMounted(true), []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((o) => !o);
      }
    }
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const initials = user.name
    .split(" ")
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <>
      <header
        className="h-16 sticky top-0 z-20 flex items-center justify-between px-3 sm:px-6 gap-2 glass-surface"
      >
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={onMenuClick}
            className="p-2 rounded-xl transition-colors lg:hidden shrink-0"
            style={{ color: "var(--color-text-secondary)" }}
            aria-label="Open menu"
          >
            <Menu size={19} />
          </button>

          <button
            onClick={() => setPaletteOpen(true)}
            className="flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-xl text-sm w-9 sm:w-80 sm:max-w-full justify-center sm:justify-start shrink-0"
            style={{ background: "var(--color-bg)", color: "var(--color-text-muted)", border: "1px solid var(--color-border)" }}
          >
            <Search size={15} />
            <span className="hidden sm:inline flex-1 text-left">Search inquiries, hotels, suppliers...</span>
            <kbd className="hidden sm:inline-block text-[10px] px-1.5 py-0.5 rounded" style={{ background: "var(--color-border)" }}>⌘K</kbd>
          </button>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          <button
            className="p-2 rounded-xl transition-colors"
            style={{ color: "var(--color-text-secondary)" }}
          >
            <Bell size={17} />
          </button>

          {mounted && (
            <button
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="p-2 rounded-xl transition-colors"
              style={{ color: "var(--color-text-secondary)" }}
              title="Toggle theme"
            >
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
          )}

          <Link
            href="/queries/new"
            className="inline-flex items-center gap-1.5 text-white text-sm font-medium px-2.5 sm:px-4 py-2 rounded-xl transition-transform hover:scale-[1.02]"
            style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
          >
            <Plus size={15} /> <span className="hidden sm:inline">New Inquiry</span>
          </Link>

          <div className="relative pl-2" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-xl transition-colors"
              style={{ color: "var(--color-text-primary)" }}
            >
              <span
                className="h-8 w-8 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ background: "linear-gradient(135deg, var(--color-teal-600), var(--color-ocean-500))" }}
              >
                {initials || "?"}
              </span>
              <ChevronDown size={14} style={{ color: "var(--color-text-muted)" }} />
            </button>

            {menuOpen && (
              <div
                className="absolute right-0 mt-2 w-56 rounded-xl overflow-hidden z-30"
                style={{ background: "var(--color-card)", border: "1px solid var(--color-border)", boxShadow: "var(--shadow-hover)" }}
              >
                <div className="px-3.5 py-3" style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <p className="text-sm font-semibold truncate">{user.name}</p>
                  <p className="text-xs truncate" style={{ color: "var(--color-text-secondary)" }}>{user.email}</p>
                  <p className="text-[11px] mt-1 inline-block px-1.5 py-0.5 rounded" style={{ background: "var(--color-teal-100)", color: "var(--color-teal-700)" }}>
                    {user.roleName}
                  </p>
                </div>
                <form action={logoutAction}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 text-sm text-left transition-colors"
                    style={{ color: "var(--color-text-secondary)" }}
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      <CommandPalette open={paletteOpen} onOpenChange={setPaletteOpen} />
    </>
  );
}
