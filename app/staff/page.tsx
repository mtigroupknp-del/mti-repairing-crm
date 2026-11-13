"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  designation: string;
  phone: string;
  status: "Active" | "Inactive";
  defaultPercentage: number;
  user?: {
    id: string;
    username: string;
    isActive: boolean;
    role: string;
  } | null;
};

const STORAGE_KEY = "mti-staff";

const roles = [
  "Technician",
  "Receptionist",
  "Salesman",
  "Manager",
  "Other",
];

export default function StaffPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Technician");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [defaultPercentage, setDefaultPercentage] = useState("0");
  const [createLogin, setCreateLogin] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  const initialLoadStarted = useRef(false);

  async function loadStaff() {
    const response = await fetch("/api/staff", {
      method: "GET",
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok || !data.success) {
      throw new Error(data.message || "Staff list load nahi ho payi.");
    }

    return Array.isArray(data.staff) ? data.staff as Staff[] : [];
  }

  async function migrateOldStaff(databaseStaff: Staff[]) {
    let saved: unknown[] = [];

    try {
      const oldData = localStorage.getItem(STORAGE_KEY);
      const parsed = oldData ? JSON.parse(oldData) : [];
      if (Array.isArray(parsed)) saved = parsed;
    } catch {
      throw new Error("Purana Staff data read nahi ho paya.");
    }

    const existing = new Set(
      databaseStaff.map(
        (person) =>
          `${person.name.trim().toLowerCase()}|${person.designation.trim().toLowerCase()}`
      )
    );

    let migrated = 0;

    for (const item of saved) {
      if (!item || typeof item !== "object") continue;

      const old = item as Record<string, unknown>;

      const cleanName =
        typeof old.name === "string" ? old.name.trim() : "";

      const cleanDesignation =
        typeof old.designation === "string"
          ? old.designation.trim()
          : "Technician";

      const cleanPhone =
        typeof old.phone === "string" ? old.phone.trim() : "";

      const cleanStatus =
        old.status === "Inactive" ? "Inactive" : "Active";

      if (!cleanName || !cleanDesignation) continue;

      const key =
        `${cleanName.toLowerCase()}|${cleanDesignation.toLowerCase()}`;

      if (existing.has(key)) continue;

      const response = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: cleanName,
          designation: cleanDesignation,
          phone: cleanPhone,
          status: cleanStatus,
          createLogin: false,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(
          result.message || `${cleanName} migrate nahi ho paya.`
        );
      }

      existing.add(key);
      migrated++;
    }

    return migrated;
  }

  useEffect(() => {
    if (initialLoadStarted.current) return;

    initialLoadStarted.current = true;

    async function initialize() {
      try {
        const meResponse = await fetch("/api/me", { cache: "no-store" });
        const meData = await meResponse.json();

        if (!meResponse.ok || !meData.success) {
          throw new Error(meData.message || "Login details load nahi hui.");
        }

        const admin = meData.user?.role === "ADMIN";
        setIsAdmin(admin);

        if (!admin) {
          setMessage("Admin permission required. Staff Management sirf Admin use kar sakta hai.");
          return;
        }

        let databaseStaff = await loadStaff();

        const migrated = await migrateOldStaff(databaseStaff);

        if (migrated > 0) {
          databaseStaff = await loadStaff();

          setMessage(
            `${migrated} purane Staff record PostgreSQL mein migrate ho gaye.`
          );
        }

        setStaff(databaseStaff);
      } catch (error) {
        console.error("Staff loading/migration error:", error);

        setMessage(
          error instanceof Error
            ? error.message
            : "Staff data load nahi ho paya."
        );
      } finally {
        setLoaded(true);
      }
    }

    initialize();
  }, []);

  function resetForm() {
    setName("");
    setDesignation("Technician");
    setPhone("");
    setStatus("Active");
    setDefaultPercentage("0");
    setCreateLogin(false);
    setUsername("");
    setPassword("");
    setEditingId(null);
  }

  async function saveStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanName = name.trim();

    if (!cleanName) {
      setMessage("Employee name is required.");
      return;
    }

    const percentageValue = Number(defaultPercentage);
    if (designation === "Technician" && (!Number.isFinite(percentageValue) || percentageValue < 0 || percentageValue > 100)) {
      setMessage("Technician percentage 0 se 100 ke beech hona chahiye.");
      return;
    }

    const duplicate = staff.some(
      (person) =>
        person.id !== editingId &&
        person.name.trim().toLowerCase() === cleanName.toLowerCase() &&
        person.designation === designation
    );

    if (duplicate) {
      setMessage("This employee and designation already exist.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const isEditing = Boolean(editingId);

      const response = await fetch(
        isEditing ? `/api/staff/${editingId}` : "/api/staff",
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: cleanName,
            designation,
            phone: phone.trim(),
            status,
            defaultPercentage: designation === "Technician" ? percentageValue : 0,
            createLogin: !isEditing && createLogin,
            username: !isEditing && createLogin ? username : undefined,
            password: !isEditing && createLogin ? password : undefined,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Staff save nahi ho paya.");
      }

      const updatedStaff = await loadStaff();
      setStaff(updatedStaff);

      setMessage(
        isEditing
          ? "Staff details PostgreSQL mein update ho gayi hain."
          : createLogin
            ? "Staff aur login account successfully create ho gaye."
            : "Staff successfully PostgreSQL mein save ho gaya."
      );

      resetForm();
    } catch (error) {
      console.error("Staff save error:", error);

      setMessage(
        error instanceof Error
          ? error.message
          : "Staff save nahi ho paya."
      );
    } finally {
      setSaving(false);
    }
  }

  function editStaff(person: Staff) {
    setEditingId(person.id);
    setName(person.name);
    setDesignation(person.designation);
    setPhone(person.phone || "");
    setStatus(person.status);
    setDefaultPercentage(String(person.defaultPercentage ?? 0));
    setMessage("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function createStaffLogin(person: Staff) {
    const enteredUsername = window.prompt(
      `${person.name} ke liye username banayein (4-30 characters, lowercase):`
    );
    if (enteredUsername === null) return;

    const enteredPassword = window.prompt(
      `${person.name} ke liye temporary password set karein (minimum 8 characters):`
    );
    if (enteredPassword === null) return;

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/staff/${person.id}/create-login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: enteredUsername.trim().toLowerCase(),
          password: enteredPassword,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Login account create nahi hua.");
      }
      setStaff(await loadStaff());
      setMessage(`${person.name} ka login account create ho gaya.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Login create nahi hua.");
    } finally {
      setSaving(false);
    }
  }

  async function resetStaffPassword(person: Staff) {
    const newPassword = passwordDrafts[person.id] || "";

    if (newPassword.length < 8 || newPassword.length > 72) {
      setMessage("Naya password 8 se 72 characters ka hona chahiye.");
      return;
    }

    setSaving(true);
    setMessage("");
    try {
      const response = await fetch(`/api/staff/${person.id}/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPassword }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Password reset nahi hua.");
      }
      setShowPasswords((current) => ({ ...current, [person.id]: true }));
      setMessage(`${person.name} ka naya password update ho gaya. Aap ise Staff ko bata sakte hain.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Password reset nahi hua.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteStaff(person: Staff) {
    const confirmed = window.confirm(
      `Kya aap ${person.name} ko Staff Register se delete karna chahte hain?\n\nIska login account bhi deactivate ho jayega. Historical audit records preserve rahenge.`
    );

    if (!confirmed) return;

    setSaving(true);
    setMessage("");

    try {
      const response = await fetch(`/api/staff/${person.id}`, {
        method: "DELETE",
      });
      const responseText = await response.text();
      let data: { success?: boolean; message?: string } = {};

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error("Delete API se valid response nahi mila. API route check karein.");
      }

      if (!response.ok || !data.success) {
        throw new Error(data.message || `Staff delete nahi ho paya. (HTTP ${response.status})`);
      }

      setStaff(await loadStaff());
      if (editingId === person.id) resetForm();
      setMessage(`${person.name} Staff Register se delete ho gaya. Login account deactivate kar diya gaya hai.`);
    } catch (error) {
      console.error("Staff delete error:", error);
      setMessage(error instanceof Error ? error.message : "Staff delete nahi ho paya.");
    } finally {
      setSaving(false);
    }
  }


  if (!loaded) {
    return (
      <main className="p-8 text-slate-700">
        Loading Staff from PostgreSQL...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-100 p-4 md:p-8">
      <div className="mx-auto max-w-6xl space-y-6">

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">
              Staff Management
            </h1>

            <p className="mt-1 text-slate-600">
              Manage technicians, receptionists, salesmen and other staff.
            </p>
          </div>

          <Link
            href="/"
            className="rounded-lg border bg-white px-4 py-2 font-medium text-slate-700"
          >
            Back to Main Menu
          </Link>
        </div>

        {!isAdmin ? (
          <section className="rounded-xl bg-white p-6 shadow-sm">
            <p className="font-semibold text-red-700">Admin permission required.</p>
            <p className="mt-1 text-sm text-slate-600">Staff Management ke Edit, Delete aur Login controls sirf Admin ke liye available hain.</p>
          </section>
        ) : <>
        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            {editingId ? "Edit Staff Member" : "Add New Staff Member"}
          </h2>

          <form
            onSubmit={saveStaff}
            className="grid gap-4 md:grid-cols-2"
          >
            <label className="block text-sm font-medium">
              Employee Name *

              <input
                className="mt-1 w-full rounded-lg border p-3 font-normal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter employee name"
                required
              />
            </label>

            <label className="block text-sm font-medium">
              Designation *

              <select
                className="mt-1 w-full rounded-lg border bg-white p-3 font-normal"
                value={designation}
                onChange={(e) => {
                  const value = e.target.value;
                  setDesignation(value);
                  if (value !== "Technician") setDefaultPercentage("0");
                }}
              >
                {roles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-sm font-medium">
              Mobile Number

              <input
                className="mt-1 w-full rounded-lg border p-3 font-normal"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Enter mobile number"
                type="tel"
              />
            </label>

            {designation === "Technician" && (
              <label className="block text-sm font-medium">
                Default Technician Percentage (%) *
                <input
                  className="mt-1 w-full rounded-lg border p-3 font-normal"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultPercentage}
                  onChange={(e) => setDefaultPercentage(e.target.value)}
                  placeholder="Enter percentage, e.g. 30"
                  required
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Monthly net profit par ye percentage apply hoga.
                </span>
              </label>
            )}

            <label className="block text-sm font-medium">
              Employee Status

              <select
                className="mt-1 w-full rounded-lg border bg-white p-3 font-normal"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "Active" | "Inactive")
                }
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </label>

            {!editingId && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 md:col-span-2">
                <label className="flex items-center gap-2 font-semibold">
                  <input
                    type="checkbox"
                    checked={createLogin}
                    onChange={(e) => setCreateLogin(e.target.checked)}
                  />
                  Is Staff ka Login Account bhi banayein
                </label>
                {createLogin && (
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <label className="text-sm font-medium">
                      Login Username *
                      <input
                        className="mt-1 w-full rounded-lg border p-3 font-normal"
                        value={username}
                        onChange={(e) => setUsername(e.target.value.toLowerCase())}
                        placeholder="e.g. nazar01"
                        minLength={4}
                        maxLength={30}
                        required
                      />
                    </label>
                    <label className="text-sm font-medium">
                      Login Password *
                      <input
                        className="mt-1 w-full rounded-lg border p-3 font-normal"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Minimum 8 characters"
                        minLength={8}
                        maxLength={72}
                        required
                      />
                    </label>
                    <p className="text-xs text-blue-800 md:col-span-2">
                      Username 4-30 characters ka ho. Password kam se kam 8 characters ka rakhein.
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : editingId
                    ? "Update Staff"
                    : "Save Staff"}
              </button>

              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  disabled={saving}
                  className="rounded-lg border px-5 py-3"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {message && (
            <p className="mt-4 text-sm font-medium text-blue-700">
              {message}
            </p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5">
            <h2 className="text-xl font-semibold">
              Staff Register
            </h2>

            <p className="text-sm text-slate-600">
              Total: {staff.length} | Active:{" "}
              {staff.filter((person) => person.status === "Active").length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[980px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Default %</th>
                  <th className="p-3">Login Account</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((person) => (
                  <tr key={person.id} className="border-t">
                    <td className="p-3 font-medium">
                      <div>{person.name}</div>
                      {person.user && (
                        <div className="mt-1 text-xs font-normal text-slate-500">
                          Password: <span className="font-semibold">Set (hidden)</span>
                        </div>
                      )}
                    </td>

                    <td className="p-3">
                      {person.designation}
                    </td>

                    <td className="p-3">
                      {person.phone || "â€”"}
                    </td>

                    <td className="p-3">
                      <span
                        className={
                          person.status === "Active"
                            ? "rounded-full bg-green-100 px-3 py-1 text-green-800"
                            : "rounded-full bg-slate-200 px-3 py-1 text-slate-700"
                        }
                      >
                        {person.status}
                      </span>
                    </td>

                    <td className="p-3">
                      {person.designation === "Technician" ? `${Number(person.defaultPercentage ?? 0)}%` : "—"}
                    </td>

                    <td className="p-3">
                      {person.user ? (
                        <span className="text-green-700">
                          {person.user.username}
                        </span>
                      ) : (
                        <span className="text-amber-700">Not created</span>
                      )}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        {person.user ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <input
                              type={showPasswords[person.id] ? "text" : "password"}
                              autoComplete="new-password"
                              value={passwordDrafts[person.id] || ""}
                              onChange={(e) =>
                                setPasswordDrafts((current) => ({
                                  ...current,
                                  [person.id]: e.target.value,
                                }))
                              }
                              minLength={8}
                              maxLength={72}
                              placeholder="Enter new password"
                              aria-label={`${person.name} new password`}
                              className="w-44 rounded border border-slate-300 px-2 py-1.5 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => setShowPasswords((current) => ({ ...current, [person.id]: !current[person.id] }))}
                              className="rounded border px-2 py-1.5 text-xs"
                              aria-label={showPasswords[person.id] ? "Hide password" : "Show password"}
                            >
                              {showPasswords[person.id] ? "Hide" : "Show"}
                            </button>
                            <button
                              type="button"
                              disabled={saving || (passwordDrafts[person.id] || "").length < 8}
                              onClick={() => resetStaffPassword(person)}
                              className="rounded border border-blue-300 bg-blue-50 px-3 py-1.5 text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {saving ? "Saving..." : "Save Password"}
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            disabled={saving}
                            onClick={() => createStaffLogin(person)}
                            className="rounded border border-green-300 px-3 py-1 text-green-700 disabled:opacity-50"
                          >
                            Create Login
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => editStaff(person)}
                          className="rounded border px-3 py-1 disabled:opacity-50"
                        >
                          Edit
                        </button>

                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => deleteStaff(person)}
                          className="rounded border border-red-300 px-3 py-1 text-red-700 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {staff.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      className="p-8 text-center text-slate-500"
                    >
                      No staff found in PostgreSQL.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
        </>}

        <p className="text-xs text-slate-500">
          Staff data is now managed through PostgreSQL.
          Previous browser data is preserved as a migration backup.
        </p>

      </div>
    </main>
  );
}
