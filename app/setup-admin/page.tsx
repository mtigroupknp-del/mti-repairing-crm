
"use client";

import { useState, type FormEvent } from "react";

export default function SetupAdminPage() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setMessage("");
    setSuccess(false);

    const cleanUsername = username.trim().toLowerCase();

    if (!/^[a-z0-9._-]{4,30}$/.test(cleanUsername)) {
      setMessage("Username 4 se 30 characters ka hona chahiye.");
      return;
    }

    if (password.length < 8 || password.length > 72) {
      setMessage("Password 8 se 72 characters ka hona chahiye.");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Password aur Confirm Password match nahi kar rahe.");
      return;
    }

    if (!setupKey.trim()) {
      setMessage("Admin Setup Key enter karein.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/setup-admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          setupKey,
          username: cleanUsername,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Admin account create nahi hua.");
        return;
      }

      setSuccess(true);
      setMessage("Admin account successfully create ho gaya.");

      setPassword("");
      setConfirmPassword("");
      setSetupKey("");
    } catch {
      setMessage("Server connection nahi ho paya. Dobara try karein.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl sm:p-8">

        <div className="mb-7 text-center">
          <h1 className="text-3xl font-bold text-slate-900">
            MTI BUSINESS CRM
          </h1>

          <p className="mt-2 text-lg font-semibold text-blue-700">
            Initial Admin Setup
          </p>

          <p className="mt-2 text-sm text-slate-500">
            Create your first administrator account.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Admin Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600"
              placeholder="Enter admin username"
              autoComplete="username"
              required
              maxLength={30}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600"
              placeholder="Minimum 8 characters"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={72}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Confirm Password
            </label>

            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600"
              placeholder="Enter password again"
              autoComplete="new-password"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-semibold text-slate-700">
              Admin Setup Key
            </label>

            <input
              type="password"
              value={setupKey}
              onChange={(e) => setSetupKey(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 outline-none focus:border-blue-600"
              placeholder="Enter private setup key"
              autoComplete="off"
              required
            />

            <p className="mt-1 text-xs text-slate-500">
              Setup key aapke project ki .env file mein configured hai.
            </p>
          </div>

          {message && (
            <div
              role="alert"
              className={`rounded-lg p-3 text-sm font-medium ${
                success
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || success}
            className="w-full rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {loading
              ? "Creating Admin Account..."
              : success
                ? "Admin Account Created"
                : "Create Admin Account"}
          </button>

        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          MTI Mobile & Laptop Repairing Shop
        </p>
      </div>
    </main>
  );
}
