"use client";

import { useEffect, useState } from "react";
import { Command } from "cmdk";
import { useRouter } from "next/navigation";
import {
  LayoutGrid, PlusCircle, Hotel, Bus, Ticket, Users, BarChart3, Settings, FileClock, CheckCircle2,
  FileText, Building2, Loader2,
} from "lucide-react";
import { globalSearchAction, type GlobalSearchResult } from "@/lib/search";

const NAV_ITEMS = [
  { group: "Navigate", label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { group: "Navigate", label: "Inquiries", href: "/queries", icon: FileClock },
  { group: "Navigate", label: "New Inquiry", href: "/queries/new", icon: PlusCircle },
  { group: "Navigate", label: "Past Quotes", href: "/queries?status=Quotation%20Sent", icon: FileClock },
  { group: "Navigate", label: "Confirmed Quotes", href: "/queries?status=Confirmed", icon: CheckCircle2 },
  { group: "Inventory", label: "Hotels Inventory", href: "/hotels", icon: Hotel },
  { group: "Inventory", label: "Transport Inventory", href: "/transport", icon: Bus },
  { group: "Inventory", label: "Activities Inventory", href: "/activities", icon: Ticket },
  { group: "Inventory", label: "Suppliers", href: "/suppliers", icon: Users },
  { group: "System", label: "Reports", href: "/reports", icon: BarChart3 },
  { group: "System", label: "Settings", href: "/settings", icon: Settings },
];

const RESULT_ICONS: Record<GlobalSearchResult["type"], typeof FileText> = {
  query: FileText,
  hotel: Hotel,
  supplier: Building2,
};

export function CommandPalette({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [searching, setSearching] = useState(false);

  function handleOpenChange(next: boolean) {
    if (!next) {
      setTerm("");
      setResults([]);
    }
    onOpenChange(next);
  }

  useEffect(() => {
    const trimmed = term.trim();
    if (trimmed.length < 2) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect -- starting a loading indicator for a debounced search is a standard, correct use of an effect
    setSearching(true);
    const handle = setTimeout(async () => {
      const found = await globalSearchAction(trimmed);
      setResults(found);
      setSearching(false);
    }, 200); // debounce
    return () => clearTimeout(handle);
  }, [term]);

  const visibleResults = term.trim().length < 2 ? [] : results;

  function go(href: string) {
    router.push(href);
    handleOpenChange(false);
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={handleOpenChange}
      label="Global command menu"
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      shouldFilter={false}
    >
      <div className="fixed inset-0 bg-black/40" onClick={() => handleOpenChange(false)} />
      <div
        className="relative w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{ background: "var(--color-card)", border: "1px solid var(--color-border)" }}
      >
        <div className="relative">
          <Command.Input
            value={term}
            onValueChange={setTerm}
            placeholder="Search inquiries, hotels, suppliers, or jump to a page..."
            className="w-full px-4 py-3.5 text-sm outline-none border-b bg-transparent"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text-primary)" }}
          />
          {searching && (
            <Loader2 size={14} className="absolute right-4 top-1/2 -translate-y-1/2 animate-spin" style={{ color: "var(--color-text-muted)" }} />
          )}
        </div>
        <Command.List className="max-h-96 overflow-y-auto p-2">
          <Command.Empty className="px-3 py-6 text-center text-sm" style={{ color: "var(--color-text-muted)" }}>
            No results found.
          </Command.Empty>

          {visibleResults.length > 0 && (
            <Command.Group heading="Search Results" className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}>
              {visibleResults.map((r) => {
                const Icon = RESULT_ICONS[r.type];
                return (
                  <Command.Item
                    key={`${r.type}-${r.id}`}
                    value={`${r.type}-${r.id}`}
                    onSelect={() => go(r.href)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer data-[selected=true]:bg-[var(--color-teal-100)]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <Icon size={15} />
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{r.title}</div>
                      <div className="text-[11px] truncate" style={{ color: "var(--color-text-muted)" }}>{r.subtitle}</div>
                    </div>
                  </Command.Item>
                );
              })}
            </Command.Group>
          )}

          {["Navigate", "Inventory", "System"].map((group) => (
            <Command.Group key={group} heading={group} className="px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide"
              style={{ color: "var(--color-text-muted)" }}>
              {NAV_ITEMS.filter((i) => i.group === group).map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.href}
                    value={item.href}
                    onSelect={() => go(item.href)}
                    className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm cursor-pointer data-[selected=true]:bg-[var(--color-teal-100)]"
                    style={{ color: "var(--color-text-primary)" }}
                  >
                    <Icon size={15} />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>
          ))}
        </Command.List>
      </div>
    </Command.Dialog>
  );
}
