
"use client";

import { useState } from "react";

const STORAGE_KEYS = [
  "mti-repair-jobs",
  "mti-staff",
  "mti-stock-purchases-v1",
  "mti-stock-issues-v1",
  "mti-stock-issue-events-v1",
  "mti-stock-audits-v1",
  "mti-stock-audit-log-v1",
  "mti-stock-part-catalog-v1",
  "mti-stock-dealer-catalog-v1",
];

export default function BackupPage() {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function exportBackup() {
    setBusy(true);
    setMessage("");

    try {
      const data: Record<string, string | null> = {};

      for (const key of STORAGE_KEYS) {
        data[key] = localStorage.getItem(key);
      }

      const backup = {
        app: "MTI Repairing CRM",
        formatVersion: 1,
        exportedAt: new Date().toISOString(),
        storageType: "browser-localStorage",
        data,
      };

      const json = JSON.stringify(backup, null, 2);
      const blob = new Blob([json], {
        type: "application/json;charset=utf-8",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `MTI-CRM-backup-${new Date()
        .toISOString()
        .replace(/[:.]/g, "-")}.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      window.setTimeout(() => URL.revokeObjectURL(url), 1000);

      const savedCount = STORAGE_KEYS.filter(
        (key) => data[key] !== null
      ).length;

      setMessage(
        `Backup export shuru ho gaya. ${savedCount} storage keys mein data mila. Downloads folder check karein.`
      );
    } catch (error) {
      console.error("MTI CRM backup export failed:", error);
      setMessage(
        "Backup export nahi ho saka. Browser download permission check karein."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900">
      <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold">
          MTI CRM — Data Backup
        </h1>

        <p className="mt-3 text-sm leading-6 text-slate-600">
          Repairing Jobs, Staff, Stock Purchases, Stock Issues,
          Stock Audit, History aur Part/Dealer Catalog ka browser
          data ek JSON file mein export karein.
        </p>

        <button
          type="button"
          onClick={exportBackup}
          disabled={busy}
          className="mt-6 rounded-xl bg-blue-700 px-5 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {busy ? "Backup ban raha hai..." : "Download Data Backup"}
        </button>

        {message && (
          <p
            role="status"
            className="mt-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900"
          >
            {message}
          </p>
        )}

        <div className="mt-6 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950">
          <strong>Zaroori:</strong> Yeh backup sirf isi browser
          profile ke localStorage data ko export karta hai. Yeh
          PostgreSQL database ka backup nahi hai. Yeh page data
          delete ya modify nahi karta. Backup file ko safe jagah
          rakhein, kyunki ismein customer ke phone aur repair
          records ho sakte hain.
        </div>

        <a
          href="/repairing"
          className="mt-6 inline-block text-sm font-semibold text-blue-700 underline"
        >
          ← Repairing page par wapas jaayein
        </a>
      </div>
    </main>
  );
}
