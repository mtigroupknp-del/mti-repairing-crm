
import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-100 p-6 text-slate-900 sm:p-10">
      <div className="mx-auto max-w-5xl">
        <header className="rounded-2xl bg-slate-900 p-8 text-white">
          <h1 className="text-3xl font-bold">MTI BUSINESS CRM</h1>
          <p className="mt-2 text-slate-300">
            Mobile & Laptop Repairing Shop
          </p>
          <p className="mt-5 text-sm text-slate-400">
            Select a section to continue
          </p>
        </header>

        <section className="mt-8 grid gap-6 sm:grid-cols-2">
          <Link
            href="/repairing"
            className="group rounded-2xl border border-blue-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-blue-100 text-3xl">
              🔧
            </div>
            <h2 className="mt-6 text-2xl font-bold text-blue-900">
              Repairing
            </h2>
            <p className="mt-3 leading-6 text-slate-600">
              New job entry, customer details, model, technician, repairing
              status, payment and delivery.
            </p>
            <div className="mt-6 inline-flex rounded-lg bg-blue-700 px-5 py-3 font-semibold text-white group-hover:bg-blue-800">
              Open Repairing Dashboard →
            </div>
          </Link>

          <Link
            href="/sale"
            className="group rounded-2xl border border-emerald-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-emerald-100 text-3xl">
              🛒
            </div>
            <h2 className="mt-6 text-2xl font-bold text-emerald-900">
              Sale
            </h2>
            <p className="mt-3 leading-6 text-slate-600">
              Product sales, customer billing, quantity, price, invoice and
              payment tracking.
            </p>
            <div className="mt-6 inline-flex rounded-lg bg-emerald-700 px-5 py-3 font-semibold text-white group-hover:bg-emerald-800">
              Open Sale Dashboard →
            </div>
          </Link>

          <Link
            href="/staff"
            className="group rounded-2xl border border-purple-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-100 text-3xl">
              👥
            </div>
            <h2 className="mt-6 text-2xl font-bold text-purple-900">
              Staff Management
            </h2>
            <p className="mt-3 leading-6 text-slate-600">
              Add and edit technicians, receptionists, salesmen and other
              employees. Manage active and inactive staff.
            </p>
            <div className="mt-6 inline-flex rounded-lg bg-purple-700 px-5 py-3 font-semibold text-white group-hover:bg-purple-800">
              Manage Staff →
            </div>
          </Link>
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          MTI Mobile & Laptop Repairing Shop
        </footer>
      </div>
    </main>
  );
}
