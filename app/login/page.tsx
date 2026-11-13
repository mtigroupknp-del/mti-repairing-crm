
"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMessage("");

    const cleanUsername = username.trim().toLowerCase();

    if (!cleanUsername || !password) {
      setMessage("Username aur password enter karein.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          username: cleanUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        setMessage(data.message || "Login failed. Dobara try karein.");
        return;
      }

      router.replace("/");
      router.refresh();
    } catch {
      setMessage("Server se connection nahi ho paya.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">

        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-3xl">
            🔐
          </div>

          <h1 className="text-3xl font-bold text-slate-900">
            MTI BUSINESS CRM
          </h1>

          <p className="mt-3 text-lg font-semibold text-blue-700">
            Secure Login
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Login to access your CRM account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter username"
              autoComplete="username"
              autoFocus
              required
              maxLength={100}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
              placeholder="Enter password"
              autoComplete="current-password"
              required
              maxLength={200}
            />
          </div>

          {message && (
            <div
              role="alert"
              className="rounded-lg bg-red-100 p-3 text-sm font-medium text-red-700"
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading ? "Logging in..." : "Login to CRM"}
          </button>

        </form>

        <p className="mt-7 text-center text-xs text-slate-500">
          MTI Mobile & Laptop Repairing Shop
        </p>

        <p className="mt-2 text-center text-xs text-slate-400">
          Secure Administrator & Staff Access
        </p>
      </div>
    </main>
  );
}
