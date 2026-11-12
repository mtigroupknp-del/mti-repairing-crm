
"use client";

import { useState } from "react";

export default function RepairBackupImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<{
    received?: number;
    imported?: number;
    skipped?: number;
  } | null>(null);

  async function handleImport(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setResult(null);

    if (!file) {
      setMessage("पहले अपनी JSON backup file चुनें।");
      return;
    }

    if (!secret.trim()) {
      setMessage("Import secret भरें।");
      return;
    }

    setBusy(true);

    try {
      const text = await file.text();
      let backup: unknown;

      try {
        backup = JSON.parse(text);
      } catch {
        setMessage("यह valid JSON file नहीं है।");
        return;
      }

      const response = await fetch("/api/repair-jobs/import", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-import-key": secret,
        },
        body: JSON.stringify(backup),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Import नहीं हो सका।");
        return;
      }

      setResult({
        received: data.received,
        imported: data.imported,
        skipped: data.skipped,
      });

      setMessage(data.message || "Import पूरा हुआ।");
    } catch {
      setMessage(
        "Server से संपर्क नहीं हो पाया। Terminal में error जाँचें।"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-2 text-2xl font-bold">
        MTI CRM — Repairing Backup Import
      </h1>

      <p className="mb-6 text-sm text-gray-600">
        अपनी पहले से डाउनलोड की हुई MTI CRM JSON backup file चुनें।
        Import केवल नए records जोड़ेगा; मौजूदा records update नहीं होंगे।
      </p>

      <form
        onSubmit={handleImport}
        className="space-y-5 rounded-xl border p-5"
      >
        <div>
          <label className="mb-2 block font-medium">
            1. JSON Backup File
          </label>
          <input
            type="file"
            accept=".json,application/json"
            onChange={(event) =>
              setFile(event.target.files?.[0] ?? null)
            }
            className="block w-full text-sm"
          />
          {file && (
            <p className="mt-2 break-all text-sm text-gray-600">
              Selected: {file.name}
            </p>
          )}
        </div>

        <div>
          <label className="mb-2 block font-medium">
            2. Import Secret
          </label>
          <input
            type="password"
            value={secret}
            onChange={(event) => setSecret(event.target.value)}
            autoComplete="off"
            placeholder="अपनी .env वाली CRM_IMPORT_KEY भरें"
            className="w-full rounded-lg border px-3 py-2"
          />
          <p className="mt-1 text-xs text-gray-500">
            वही secret डालें जो आपने project की .env file में रखा है।
          </p>
        </div>

        <button
          type="submit"
          disabled={busy || !file || !secret.trim()}
          className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Import हो रहा है..." : "Import Repairing Records"}
        </button>

        {message && (
          <div
            role="status"
            className="break-words rounded-lg border p-3 text-sm"
          >
            {message}
          </div>
        )}

        {result && (
          <div className="space-y-1 rounded-lg border p-4 text-sm">
            <p>Backup में मिले records: {result.received ?? 0}</p>
            <p>नए Import हुए: {result.imported ?? 0}</p>
            <p>Duplicate होने के कारण छोड़े गए: {result.skipped ?? 0}</p>
          </div>
        )}
      </form>

      <p className="mt-5 text-sm text-red-700">
        सावधानी: Import से पहले अपने JSON और PostgreSQL backup की
        सुरक्षित कॉपी रखें। यह पेज दूसरे कंप्यूटरों के लिए LAN access
        या authentication setup नहीं करता।
      </p>
    </main>
  );
}
