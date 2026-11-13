
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
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

type CurrentUser = {
  username: string;
  role: string;
  displayName: string;
};

export default function MtiShortcutMenu() {
  const pathname = usePathname();
  const router = useRouter();

  const [loggingOut, setLoggingOut] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordMessage, setPasswordMessage] = useState("");

  const hideMenu =
    pathname === "/login" || pathname === "/setup-admin";

  useEffect(() => {
    if (hideMenu) return;

    let cancelled = false;

    async function loadCurrentUser() {
      try {
        const response = await fetch("/api/me", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok || !data.success) return;

        if (!cancelled) {
          setCurrentUser(data.user);
        }
      } catch (error) {
        console.error("Current user load error:", error);
      }
    }

    loadCurrentUser();

    return () => {
      cancelled = true;
    };
  }, [hideMenu]);

  useEffect(() => {
    if (hideMenu) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;

      const target = event.target as HTMLElement | null;
      const tag = target?.tagName?.toLowerCase();

      if (
        tag === "input" ||
        tag === "textarea" ||
        tag === "select" ||
        target?.isContentEditable
      ) {
        return;
      }

      const item = shortcuts.find(
        (shortcut) => shortcut.key === event.key
      );

      if (item) {
        event.preventDefault();
        router.push(item.href);
      }
    }

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [router, hideMenu]);

  async function handleChangePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordMessage("Naya password 8 se 72 characters ka hona chahiye.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage("New Password aur Confirm Password match nahi karte.");
      return;
    }

    setChangingPassword(true);
    setPasswordMessage("");

    try {
      const response = await fetch("/api/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Password change nahi ho paya.");
      }

      setPasswordMessage(data.message || "Password successfully change ho gaya.");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowChangePassword(false);
      window.alert(data.message || "Password successfully change ho gaya.");
    } catch (error) {
      setPasswordMessage(
        error instanceof Error ? error.message : "Password change nahi ho paya."
      );
    } finally {
      setChangingPassword(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) return;

    const confirmed = window.confirm("Kya aap CRM se Logout karna chahte hain?");
    if (!confirmed) return;

    setLoggingOut(true);

    try {
      const response = await fetch("/api/logout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Logout failed");
      }

      window.location.replace("/login");
    } catch {
      window.alert("Logout nahi ho paya. Dobara try karein.");
      setLoggingOut(false);
    }
  }

  if (hideMenu) return null;

  return (
    <>
    <aside className="fixed right-0 top-0 z-40 flex h-screen w-[166px] flex-col border-l border-slate-300 bg-slate-100 shadow-sm">

      <div className="border-b border-slate-300 bg-slate-200 px-2 py-3 text-center text-sm font-bold text-slate-800">
        MTI Shortcut Menu
      </div>

      <div className="border-b border-slate-300 bg-white px-2 py-3">
        <div className="mb-1 text-[10px] font-semibold uppercase text-slate-500">
          Logged In User
        </div>

        <div className="break-words text-sm font-bold text-slate-900">
          {currentUser?.displayName || "Loading..."}
        </div>

        <div className="mt-1">
          <span className={`rounded px-2 py-1 text-[10px] font-bold ${
            currentUser?.role === "ADMIN"
              ? "bg-blue-100 text-blue-800"
              : "bg-green-100 text-green-800"
          }`}>
            {currentUser?.role || "—"}
          </span>
        </div>
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto p-2">
        {shortcuts.map((item) => {
          const active =
            item.href.split("?")[0] === pathname &&
            (item.href === "/repairing/stock" || !item.href.includes("?"));

          return (
            <Link
              key={item.key}
              href={item.href}
              title={`${item.key} - ${item.label}`}
              className={`flex min-h-9 items-center gap-2 rounded border px-2 py-2 text-xs transition ${
                active
                  ? "border-blue-700 bg-blue-700 text-white"
                  : "border-slate-300 bg-white text-slate-800 hover:bg-blue-50"
              }`}
            >
              <span className="min-w-7 rounded-sm border border-current px-1 py-0.5 text-center font-bold">
                {item.key}
              </span>
              <span className="leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div className="border-t border-slate-300 p-2 space-y-2">
        <button
          type="button"
          onClick={() => {
            setPasswordMessage("");
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
            setShowChangePassword(true);
          }}
          className="w-full rounded border border-blue-300 bg-white px-2 py-2 text-xs font-bold text-blue-700 transition hover:bg-blue-50"
        >
          Change Password
        </button>
        <button
          type="button"
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full rounded border border-red-300 bg-red-600 px-2 py-2 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut ? "Logging out..." : "Logout"}
        </button>
      </div>

      <div className="border-t border-slate-300 px-2 py-2 text-center text-[10px] text-slate-500">
        Function keys - MTI CRM
      </div>
    </aside>

    {showChangePassword && (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4">
        <form
          onSubmit={handleChangePassword}
          className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold text-slate-900">Change My Password</h2>
            <button
              type="button"
              disabled={changingPassword}
              onClick={() => setShowChangePassword(false)}
              className="rounded px-2 py-1 text-slate-500 hover:bg-slate-100"
            >
              ✕
            </button>
          </div>

          <p className="text-sm text-slate-600">
            {currentUser?.displayName || currentUser?.username} — apna password update karein.
          </p>

          <label className="block text-sm font-medium text-slate-700">
            Current Password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              placeholder="Purana password"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            New Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              placeholder="Minimum 8 characters"
            />
          </label>

          <label className="block text-sm font-medium text-slate-700">
            Confirm New Password
            <input
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 w-full rounded-lg border border-slate-300 p-3"
              placeholder="Naya password dobara dalein"
            />
          </label>

          {passwordMessage && (
            <p className="text-sm font-medium text-blue-700">{passwordMessage}</p>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              disabled={changingPassword}
              onClick={() => setShowChangePassword(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={changingPassword}
              className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {changingPassword ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    )}
    </>
  );
}
