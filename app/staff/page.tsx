
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Staff = {
  id: string;
  name: string;
  designation: string;
  phone: string;
  status: "Active" | "Inactive";
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
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Technician");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "Inactive">("Active");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setStaff(parsed);
      }
    } catch {
      setMessage("Saved staff data could not be read.");
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (loaded) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(staff));
    }
  }, [staff, loaded]);

  function resetForm() {
    setName("");
    setDesignation("Technician");
    setPhone("");
    setStatus("Active");
    setEditingId(null);
  }

  function saveStaff(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const cleanName = name.trim();
    if (!cleanName) {
      setMessage("Employee name is required.");
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

    if (editingId) {
      setStaff((current) =>
        current.map((person) =>
          person.id === editingId
            ? { ...person, name: cleanName, designation, phone: phone.trim(), status }
            : person
        )
      );
      setMessage("Staff details updated.");
    } else {
      const newStaff: Staff = {
        id: crypto.randomUUID(),
        name: cleanName,
        designation,
        phone: phone.trim(),
        status,
      };
      setStaff((current) => [...current, newStaff]);
      setMessage("Staff member added successfully.");
    }

    resetForm();
  }

  function editStaff(person: Staff) {
    setEditingId(person.id);
    setName(person.name);
    setDesignation(person.designation);
    setPhone(person.phone);
    setStatus(person.status);
    setMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleStatus(person: Staff) {
    const nextStatus = person.status === "Active" ? "Inactive" : "Active";

    setStaff((current) =>
      current.map((item) =>
        item.id === person.id ? { ...item, status: nextStatus } : item
      )
    );

    setMessage(`${person.name} marked ${nextStatus}.`);
  }

  if (!loaded) {
    return <main className="p-8">Loading staff...</main>;
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

        <section className="rounded-xl bg-white p-5 shadow-sm">
          <h2 className="mb-4 text-xl font-semibold">
            {editingId ? "Edit Staff Member" : "Add New Staff Member"}
          </h2>

          <form onSubmit={saveStaff} className="grid gap-4 md:grid-cols-2">
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
                onChange={(e) => setDesignation(e.target.value)}
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

            <div className="flex flex-wrap gap-3 md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white"
              >
                {editingId ? "Update Staff" : "Save Staff"}
              </button>
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-lg border px-5 py-3"
                >
                  Cancel Edit
                </button>
              )}
            </div>
          </form>

          {message && (
            <p className="mt-4 text-sm font-medium text-blue-700">{message}</p>
          )}
        </section>

        <section className="overflow-hidden rounded-xl bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 p-5">
            <h2 className="text-xl font-semibold">Staff Register</h2>
            <p className="text-sm text-slate-600">
              Total: {staff.length} | Active:{" "}
              {staff.filter((person) => person.status === "Active").length}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[750px] text-left text-sm">
              <thead className="bg-slate-100 text-slate-700">
                <tr>
                  <th className="p-3">Employee Name</th>
                  <th className="p-3">Designation</th>
                  <th className="p-3">Mobile</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {staff.map((person) => (
                  <tr key={person.id} className="border-t">
                    <td className="p-3 font-medium">{person.name}</td>
                    <td className="p-3">{person.designation}</td>
                    <td className="p-3">{person.phone || "—"}</td>
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
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => editStaff(person)}
                          className="rounded border px-3 py-1"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleStatus(person)}
                          className="rounded border px-3 py-1"
                        >
                          {person.status === "Active" ? "Deactivate" : "Activate"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {staff.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500">
                      No staff added yet. Use the form above to add your first
                      employee.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-xs text-slate-500">
          Prototype: staff data is stored in this browser. Online database and
          automatic backup will be configured later.
        </p>
      </div>
    </main>
  );
}
