"use client";

import Link from "next/link";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

const shortcuts = [
  { key: "F1", label: "Dashboard", href: "/" },
  { key: "F2", label: "Repairing", href: "/repairing" },
  { key: "F3", label: "Sale", href: "/sale" },
  { key: "F4", label: "Staff Management", href: "/staff" },
  { key: "F5", label: "Purchase + Parts", href: "/repairing/stock" },
  { key: "F6", label: "Current Stock", href: "/repairing/stock?tab=stock" },
  { key: "F7", label: "Purchase History", href: "/repairing/stock?tab=purchaseHistory" },
  { key: "F8", label: "Stock Audit", href: "/repairing/stock?tab=audit" },
  { key: "F9", label: "Correction History", href: "/repairing/stock?tab=history" },
  { key: "F10", label: "Part List", href: "/repairing/stock?tab=parts" },
  { key: "F11", label: "Backup", href: "/repairing/stock?tab=backup" },
];

export default function MtiShortcutMenu() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select" || target?.isContentEditable) return;
      const item = shortcuts.find((shortcut) => shortcut.key === event.key);
      if (item) {
        event.preventDefault();
        router.push(item.href);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router]);

  return (
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[166px] flex-col border-l border-slate-300 bg-slate-100 shadow-sm">
      <div className="border-b border-slate-300 bg-slate-200 px-2 py-3 text-center text-sm font-bold text-slate-800">
        MTI Shortcut Menu
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {shortcuts.map((item) => {
          const active = item.href.split("?")[0] === pathname &&
            (item.href === "/repairing/stock" || !item.href.includes("?"));
          return (
            <Link
              key={item.key}
              href={item.href}
              title={`${item.key} — ${item.label}`}
              className={`flex min-h-9 items-center gap-2 rounded border px-2 py-2 text-xs transition ${
                active
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-blue-50"
              }`}
            >
              <span className="min-w-7 rounded-sm border border-current px-1 py-0.5 text-center font-bold">{item.key}</span>
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
      <div className="border-t border-slate-300 px-2 py-2 text-center text-[10px] text-slate-500">
        Function keys · MTI CRM
      </div>
    </aside>
  );
}
