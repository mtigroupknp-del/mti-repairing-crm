"use client";
import { useEffect, useState } from "react";
type Job = {
id: number;
jobNo: string;
date: string;
customer: string;
phone: string;
model: string;
imei: string;
problem: string;
estimate: number;
finalAmount: number;
repairStatus: string;
deliveryStatus: string;
delivery: string;
technician: string;
received: number;
parts: string;
};
type StaffMember = {
id: string;
name: string;
designation: string;
phone: string;
status: "Active" | "Inactive";
};
const emptyForm = {
jobNo: "",
date: new Date().toISOString().slice(0, 10),
customer: "",
phone: "",
model: "",
imei: "",
problem: "",
estimate: "",
finalAmount: "",
repairStatus: "OK" as "OK" | "NR" | "In Process",
deliveryStatus: "Not Delivered" as "Delivered" | "Not Delivered",
delivery: "",
technician: "",
received: "",
parts: "",
};
const repairStatusOptions = ["OK", "NR", "In Process"] as const;
const deliveryStatusOptions = ["Not Delivered", "Delivered"] as const;
function generateJobNo(jobs: Job[]) {
const used = new Set(jobs.map((job) => job.jobNo.trim().toUpperCase()));
let number = 1;
while (used.has(`MTI-${String(number).padStart(4, "0")}`)) {
number++;
}
return `MTI-${String(number).padStart(4, "0")}`;
}
function escapeReceiptText(value: string) {
return value.replace(/[&<>"']/g, (char) => {
const entities: Record<string, string> = {
"&": "&amp;",
"<": "&lt;",
">": "&gt;",
'"': "&quot;",
"'": "&#39;",
};
return entities[char];
});
}
function money(amount: number) {
return new Intl.NumberFormat("en-IN", {
style: "currency",
currency: "INR",
maximumFractionDigits: 0,
}).format(amount);
}
export default function RepairingPage() {
const [jobs, setJobs] = useState<Job[]>([]);
const [activeTechnicians, setActiveTechnicians] = useState<StaffMember[]>([]);
const [form, setForm] = useState(emptyForm);
const [search, setSearch] = useState("");
const [editingId, setEditingId] = useState<number | null>(null);
const [loaded, setLoaded] = useState(false);
const [message, setMessage] = useState("");
const [linkedPurchaseParts, setLinkedPurchaseParts] = useState<
{ id: string; date: string; dealer: string; partName: string; qty: number; unitCost: number; consumedJobId?: string }[]
>([]);
const [consumedDealer, setConsumedDealer] = useState("");
const [consumedPurchaseIds, setConsumedPurchaseIds] = useState<string[]>([]);
const [savedDealerNames, setSavedDealerNames] = useState<string[]>([]);
// Load purchase rows saved by the Stock page. Existing jobs are not rewritten.
useEffect(() => {
function loadLinkedParts() {
try {
const saved = localStorage.getItem("mti-stock-purchases-v1");
const parsed = saved ? JSON.parse(saved) : [];
setLinkedPurchaseParts(Array.isArray(parsed) ? parsed : []);
const dealerSaved = localStorage.getItem("mti-stock-dealer-catalog-v1");
const dealerParsed = dealerSaved ? JSON.parse(dealerSaved) : [];
setSavedDealerNames(Array.isArray(dealerParsed) ? dealerParsed.map((name) => String(name || "").trim()).filter(Boolean) : []);
} catch {
setLinkedPurchaseParts([]);
setSavedDealerNames([]);
}
}
loadLinkedParts();
window.addEventListener("focus", loadLinkedParts);
window.addEventListener("storage", loadLinkedParts);
window.addEventListener("mti-stock-purchases-updated", loadLinkedParts);
return () => {
window.removeEventListener("focus", loadLinkedParts);
window.removeEventListener("storage", loadLinkedParts);
window.removeEventListener("mti-stock-purchases-updated", loadLinkedParts);
};
}, []);
const consumedDealerOptions = Array.from(new Set([
...savedDealerNames,
...linkedPurchaseParts.map((part) => String(part.dealer || "").trim()),
].filter(Boolean))).sort((a, b) => a.localeCompare(b));
const selectablePurchaseParts = linkedPurchaseParts.filter((part) =>
String(part.dealer || "").trim() === consumedDealer &&
(!part.consumedJobId || String(part.consumedJobId) === String(editingId ?? ""))
);
function toggleConsumedPurchaseId(purchaseId: string) {
setConsumedPurchaseIds((current) => current.includes(purchaseId)
? current.filter((id) => id !== purchaseId)
: [...current, purchaseId]);
}
function linkSelectedPurchaseParts() {
if (editingId === null) {
setMessage("Pehle job save karein, phir dealer aur purchase parts select karein.");
return;
}
if (!consumedDealer || consumedPurchaseIds.length === 0) {
setMessage("Dealer select karke kam se kam ek part tick karein.");
return;
}
const selected = linkedPurchaseParts.filter((part) => consumedPurchaseIds.includes(part.id));
if (selected.length !== consumedPurchaseIds.length) {
setMessage("Kuch selected purchase entries nahi milin. Stock page refresh karke dobara try karein.");
return;
}
if (selected.some((part) => String(part.dealer || "").trim() !== consumedDealer)) {
setMessage("Selected parts mein dealer mismatch hai. Ek hi dealer ke parts select karein.");
return;
}
if (selected.some((part) => part.consumedJobId && String(part.consumedJobId) !== String(editingId))) {
setMessage("Koi selected purchase entry pehle hi kisi doosri job se linked hai.");
return;
}
const selectedIds = new Set(consumedPurchaseIds);
const updated = linkedPurchaseParts.map((part) =>
selectedIds.has(part.id) ? { ...part, consumedJobId: String(editingId) } : part
);
try {
localStorage.setItem("mti-stock-purchases-v1", JSON.stringify(updated));
setLinkedPurchaseParts(updated);
setConsumedPurchaseIds([]);
const jobNo = jobs.find((job) => job.id === editingId)?.jobNo || editingId;
setMessage(`${selected.length} part(s) ${selected[0].dealer} se Job ${jobNo} mein link ho gaye.`);
window.dispatchEvent(new Event("mti-stock-purchases-updated"));
} catch {
setMessage("Purchase link save nahi ho paya. Browser storage check karein.");
}
}
function consumedPartsForJob(jobId: number | string, legacyParts = "") {
const linked = linkedPurchaseParts.filter(
(part) => String(part.consumedJobId ?? "") === String(jobId)
);
// Job Register mein sirf part name aur uski total purchase cost dikhayein.
const linkedText = linked.map((part) =>
`${part.partName} — ₹${(Number(part.qty) * Number(part.unitCost)).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`
);
const oldText = String(legacyParts || "").trim();
if (linkedText.length) return linkedText.join("\\\\\n");
return oldText || "—";
}
// Load existing repairing jobs without changing the existing storage key.
useEffect(() => {
try {
const saved = localStorage.getItem("mti-repair-jobs");
if (saved) {
const parsed = JSON.parse(saved) as Record<string, unknown>[];
const converted: Job[] = parsed.map((item) => ({
id: Number(item.id),
jobNo:
typeof item.jobNo === "string" && item.jobNo.trim()
? item.jobNo
: `MTI-${String(item.id).slice(-6)}`,
date: String(item.date ?? ""),
customer: String(item.customer ?? ""),
phone: String(item.phone ?? ""),
model: String(item.model ?? ""),
imei: String(item.imei ?? ""),
problem: String(item.problem ?? ""),
estimate: Number(item.estimate ?? 0),
finalAmount: Number(item.finalAmount ?? item.estimate ?? 0),
repairStatus:
            item.repairStatus === "NR"
              ? "NR"
              : item.repairStatus === "In Process"
                ? "In Process"
                : "OK",
deliveryStatus:
item.deliveryStatus === "Delivered" || item.status === "Delivered"
? "Delivered"
: "Not Delivered",
delivery: String(item.delivery ?? ""),
technician: String(item.technician ?? ""),
received: Number(item.received ?? 0),
parts: String(item.parts ?? ""),
}));
setJobs(converted);
}
} catch {
setMessage("Saved records load nahi ho sake.");
}
setLoaded(true);
}, []);
// Persist jobs in the same browser storage used by the previous version.
useEffect(() => {
if (loaded) {
localStorage.setItem("mti-repair-jobs", JSON.stringify(jobs));
}
}, [jobs, loaded]);
// Load active technicians from Staff Management.
useEffect(() => {
function loadTechnicians() {
try {
const savedStaff = localStorage.getItem("mti-staff");
const parsed: StaffMember[] = savedStaff ? JSON.parse(savedStaff) : [];
setActiveTechnicians(
parsed.filter(
(person) =>
person.designation === "Technician" && person.status === "Active"
)
);
} catch {
setActiveTechnicians([]);
}
}
loadTechnicians();
// Refresh names when returning to this browser tab.
window.addEventListener("focus", loadTechnicians);
window.addEventListener("storage", loadTechnicians);
return () => {
window.removeEventListener("focus", loadTechnicians);
window.removeEventListener("storage", loadTechnicians);
};
}, []);
// Automatically prepare the next available job number.
useEffect(() => {
if (loaded && editingId === null && !form.jobNo) {
setForm((old) => ({
...old,
jobNo: generateJobNo(jobs),
}));
}
}, [loaded, jobs, editingId, form.jobNo]);
function updateField(name: string, value: string) {
setForm((old) => ({ ...old, [name]: value }));
setMessage("");
}
function resetForm() {
setEditingId(null);
setForm({
...emptyForm,
date: new Date().toISOString().slice(0, 10),
jobNo: generateJobNo(jobs),
});
setMessage("");
}
function saveJob(event: React.FormEvent<HTMLFormElement>) {
event.preventDefault();
const jobNo = form.jobNo.trim();
const normalizedJobNo = jobNo.toUpperCase();
if (!jobNo) {
setMessage("Job No. khaali nahi chhod sakte.");
return;
}
const duplicate = jobs.some(
(job) =>
job.jobNo.trim().toUpperCase() === normalizedJobNo &&
job.id !== editingId
);
if (duplicate) {
setMessage("Ye Job No. pehle se hai. Dusra number daalein.");
return;
}
const estimate = Number(form.estimate || 0);
const finalAmount = Number(form.finalAmount || form.estimate || 0);
const received = Number(form.received || 0);
if (estimate < 0 || finalAmount < 0 || received < 0) {
setMessage("Amount negative nahi ho sakta.");
return;
}
if (editingId !== null) {
const updated = jobs.map((job) =>
job.id === editingId
? { ...job, ...form, jobNo, estimate, finalAmount, received }
: job
);
setJobs(updated);
setMessage("Job successfully update ho gayi.");
} else {
const newJob: Job = {
...form,
id: Date.now(),
jobNo,
estimate,
finalAmount,
received,
};
setJobs((old) => [newJob, ...old]);
setMessage("Nayi job successfully save ho gayi.");
}
setEditingId(null);
setForm({
...emptyForm,
date: new Date().toISOString().slice(0, 10),
jobNo: "",
});
}
function editJob(job: Job) {
setEditingId(job.id);
setForm({
jobNo: job.jobNo,
date: job.date,
customer: job.customer,
phone: job.phone,
model: job.model,
imei: job.imei,
problem: job.problem,
estimate: String(job.estimate),
finalAmount: String(job.finalAmount),
repairStatus:
        job.repairStatus === "NR"
          ? "NR"
          : job.repairStatus === "In Process"
            ? "In Process"
            : "OK",
deliveryStatus: job.deliveryStatus === "Delivered" ? "Delivered" : "Not Delivered",
delivery: job.delivery,
technician: job.technician,
received: String(job.received),
parts: job.parts,
});
setMessage("");
window.scrollTo({ top: 0, behavior: "smooth" });
}
async function updateRepairStatus(id: number, repairStatus: "OK" | "NR" | "In Process") {
const selectedJob = jobs.find((job) => job.id === id);
if (!selectedJob) return;
const previousJobs = jobs;
const updatedJob = { ...selectedJob, repairStatus };
setJobs((old) => old.map((job) => (job.id === id ? updatedJob : job)));
setMessage(`Job ${selectedJob.jobNo}: Repair Status save ho raha hai...`);
try {
const response = await fetch("/api/repair-jobs", {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ jobNo: selectedJob.jobNo, repairStatus }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || "Repair Status save nahi hua.");
setMessage(`Job ${selectedJob.jobNo}: Repair Status Database mein save ho gaya.`);
} catch (error) {
setJobs(previousJobs);
setMessage(error instanceof Error ? error.message : "Repair Status save nahi hua.");
}
}
async function updateDeliveryStatus(
id: number,
deliveryStatus: "Delivered" | "Not Delivered"
) {
const selectedJob = jobs.find((job) => job.id === id);
if (!selectedJob) return;
let deliveryDate = selectedJob.delivery || "";
if (deliveryStatus === "Delivered") {
const today = new Date().toISOString().slice(0, 10);
const pickedDate = window.prompt(
"Delivery Date enter karein (YYYY-MM-DD):",
deliveryDate || today
);
if (pickedDate === null) return;
const parsedDate = new Date(`${pickedDate}T00:00:00.000Z`);
if (!/^\d{4}-\d{2}-\d{2}$/.test(pickedDate) || Number.isNaN(parsedDate.getTime()) || parsedDate.toISOString().slice(0, 10) !== pickedDate) {
setMessage("Valid Delivery Date YYYY-MM-DD format mein enter karein.");
return;
}
deliveryDate = pickedDate;
}
const previousJobs = jobs;
const updatedJob = { ...selectedJob, deliveryStatus, delivery: deliveryDate };
setJobs((old) => old.map((job) => (job.id === id ? updatedJob : job)));
setMessage(`Job ${selectedJob.jobNo}: Delivery Status aur Date save ho rahi hai...`);
try {
const response = await fetch("/api/repair-jobs", {
method: "PATCH",
headers: { "Content-Type": "application/json" },
body: JSON.stringify({ jobNo: selectedJob.jobNo, deliveryStatus, delivery: deliveryDate }),
});
const result = await response.json();
if (!response.ok) throw new Error(result.error || "Delivery details save nahi hui.");
setMessage(`Job ${selectedJob.jobNo}: Delivery Status aur Date Database mein save ho gayi.`);
} catch (error) {
setJobs(previousJobs);
setMessage(error instanceof Error ? error.message : "Delivery details Database mein save nahi hui.");
}
}
function printReceipt(job: Job) {
const win = window.open("", "_blank", "width=800,height=900");
if (!win) {
alert("Pop-ups blocked hain. Is website ke liye pop-ups allow karein.");
return;
}
const e = escapeReceiptText;
const balance = Math.max(0, job.finalAmount - job.received);
win.document.write(`
<!DOCTYPE html>
<html>
<head>
<title>Job Receipt ${e(job.jobNo)}</title>
<meta charset="utf-8">
<style>
* { box-sizing: border-box; }
body { font-family: Arial, sans-serif; color: #222; padding: 20px; }
.receipt { max-width: 720px; margin: auto; border: 1px solid #444; padding: 26px; }
h1 { font-size: 22px; margin: 0 0 6px; }
h2 { font-size: 17px; }
.center { text-align: center; }
.line { border-top: 1px solid #888; margin: 16px 0; }
.meta { display: flex; justify-content: space-between; gap: 12px; }
table { width: 100%; border-collapse: collapse; margin-top: 15px; }
td { padding: 9px 6px; border-bottom: 1px solid #ddd; vertical-align: top; }
td:first-child { width: 38%; font-weight: bold; }
.terms { font-size: 12px; line-height: 1.6; }
.signatures { display: flex; justify-content: space-between; margin-top: 55px; }
@page { size: A4; margin: 12mm; }
@media print { body { padding: 0; } .receipt { border: none; } }
</style>
</head>
<body>
<div class="receipt">
<div class="center">
<h1>MTI MOBILE & LAPTOP REPAIRING SHOP</h1>
<p>Customer Job Receipt</p>
</div>
<div class="line"></div>
<div class="meta">
<p><strong>Job No.:</strong> ${e(job.jobNo)}</p>
<p><strong>Date:</strong> ${e(job.date)}</p>
</div>
<table>
<tr><td>Customer Name</td><td>${e(job.customer)}</td></tr>
<tr><td>Phone No.</td><td>${e(job.phone)}</td></tr>
<tr><td>Model No.</td><td>${e(job.model)}</td></tr>
${job.imei ? `<tr><td>IMEI / Serial No.</td><td>${e(job.imei)}</td></tr>` : ""}
<tr><td>Reported Problem</td><td>${e(job.problem)}</td></tr>
<tr><td>Repair Status</td><td>${e(job.repairStatus)}</td></tr>
<tr><td>Delivery Status</td><td>${e(job.deliveryStatus)}</td></tr>
<tr><td>Estimated Charges</td><td>${money(job.estimate)}</td></tr>
<tr><td>Received Amount</td><td>${money(job.received)}</td></tr>
<tr><td>Balance (final amount ke hisaab se)</td><td>${money(balance)}</td></tr>
</table>
<div class="line"></div>
<h2>Terms & Conditions</h2>
<div class="terms">
<p>1. Estimate inspection ke baad badal sakta hai; additional work se pehle customer ki approval li jayegi.</p>
<p>2. Device collect karte waqt ye receipt saath laayein.</p>
<p>3. Device aur accessories delivery ke waqt check kar lein.</p>
<p>4. Device ki delivery pending payment clear hone par hogi, jab tak alag se approval na ho.</p>
</div>
<div class="signatures">
<div>Customer Signature</div>
<div>Authorized Signature</div>
</div>
<p class="center" style="margin-top:25px;font-size:12px">
Thank you for choosing MTI.
</p>
</div>
<script>
window.onload = function() {
window.focus();
window.print();
};
</script>
</body>
</html>
`);
win.document.close();
}
const filtered = jobs.filter((job) =>
[
job.jobNo,
job.customer,
job.phone,
job.model,
job.imei,
job.technician,
job.repairStatus,
job.deliveryStatus,
]
.join(" ")
.toLowerCase()
.includes(search.toLowerCase())
);
const balance = (job: Job) =>
Math.max(0, job.finalAmount - job.received);
const inputClass =
"w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-blue-600";
const labelClass = "mb-1.5 block text-sm font-medium text-slate-700";
if (!loaded) {
return <main className="p-8">Loading repairing records...</main>;
}
return (
<main className="min-h-screen bg-slate-100 p-4 text-slate-900 sm:p-8">
<div className="mx-auto max-w-7xl space-y-6">
<header className="rounded-xl bg-slate-900 p-6 text-white">
<a href="/" className="text-sm text-blue-200">← Main Menu</a>
<h1 className="mt-3 text-2xl font-bold">MTI Repairing Dashboard</h1>
<p className="mt-1 text-sm text-slate-300">
Mobile & Laptop Repairing Shop
</p>
</header>
<section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
{[
{ title: "Total Jobs", value: jobs.length },
{
title: "Pending Jobs",
value: jobs.filter((job) => job.deliveryStatus !== "Delivered").length,
},
{
title: "Ready for Delivery",
value: jobs.filter((job) => job.repairStatus === "OK" && job.deliveryStatus === "Not Delivered").length,
},
{
title: "Outstanding Balance",
value: money(jobs.reduce((sum, job) => sum + balance(job), 0)),
},
].map((card) => (
<div key={card.title} className="rounded-xl bg-white p-5 shadow-sm">
<p className="text-sm text-slate-500">{card.title}</p>
<p className="mt-2 text-2xl font-bold">{card.value}</p>
</div>
))}
</section>
<section className="rounded-xl bg-white p-5 shadow-sm sm:p-7">
<div className="mb-5 flex items-center justify-between gap-3">
<h2 className="text-xl font-bold">
{editingId !== null ? "Edit Repairing Job" : "New Repairing Job"}
</h2>
{editingId !== null && (
<button
type="button"
onClick={resetForm}
className="rounded-lg border px-4 py-2 text-sm"
>
Cancel Edit
</button>
)}
</div>
{message && (
<div className="mb-4 rounded-lg bg-blue-50 p-3 text-sm text-blue-900">
{message}
</div>
)}
<form
onSubmit={saveJob}
className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3"
>
<div>
<label className={labelClass}>Date *</label>
<input
className={inputClass}
type="date"
required
value={form.date}
onChange={(e) => updateField("date", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Job No. *</label>
<input
className={inputClass}
required
value={form.jobNo}
onChange={(e) => updateField("jobNo", e.target.value)}
placeholder="MTI-0001"
/>
<p className="mt-1 text-xs text-slate-500">
Automatic number; save se pehle edit kar sakte hain.
</p>
</div>
<div>
<label className={labelClass}>Customer Name *</label>
<input
className={inputClass}
required
value={form.customer}
onChange={(e) => updateField("customer", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Phone No. *</label>
<input
className={inputClass}
required
value={form.phone}
onChange={(e) => updateField("phone", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Model No. *</label>
<input
className={inputClass}
required
value={form.model}
onChange={(e) => updateField("model", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>IMEI / Serial No. (Optional)</label>
<input
className={inputClass}
value={form.imei}
onChange={(e) => updateField("imei", e.target.value)}
/>
</div>
<div className="sm:col-span-2 lg:col-span-3">
<label className={labelClass}>Problem *</label>
<textarea
className={inputClass}
required
rows={2}
value={form.problem}
onChange={(e) => updateField("problem", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Estimate (₹)</label>
<input
className={inputClass}
type="number"
min="0"
value={form.estimate}
onChange={(e) => updateField("estimate", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Final Repairing Amount (₹)</label>
<input
className={inputClass}
type="number"
min="0"
value={form.finalAmount}
onChange={(e) => updateField("finalAmount", e.target.value)}
placeholder="Blank = estimate"
/>
</div>
<div>
<label className={labelClass}>Repair Status *</label>
<select
className={inputClass}
value={form.repairStatus}
onChange={(e) =>
updateField("repairStatus", e.target.value as "OK" | "NR" | "In Process")
}
>
{repairStatusOptions.map((status) => (
<option key={status} value={status}>
{status === "NR"
                      ? "NR (Not Repair)"
                      : status === "In Process"
                        ? "In Process"
                        : "OK (Repaired)"}
</option>
))}
</select>
</div>
<div>
<label className={labelClass}>Delivery Status *</label>
<select
className={inputClass}
value={form.deliveryStatus}
onChange={(e) =>
updateField(
"deliveryStatus",
e.target.value as "Delivered" | "Not Delivered"
)
}
>
{deliveryStatusOptions.map((status) => (
<option key={status} value={status}>
{status}
</option>
))}
</select>
</div>
<div>
<label className={labelClass}>Technician Name</label>
<select
className={inputClass}
value={form.technician}
onChange={(e) => updateField("technician", e.target.value)}
>
<option value="">Select Technician</option>
{form.technician &&
!activeTechnicians.some(
(person) => person.name === form.technician
) && (
<option value={form.technician}>
{form.technician} (Existing Job)
</option>
)}
{activeTechnicians.map((person) => (
<option key={person.id} value={person.name}>
{person.name}
</option>
))}
</select>
{activeTechnicians.length === 0 && (
<p className="mt-1 text-xs text-amber-700">
Koi Active Technician nahi mila. Staff Management mein
Technician add karke Active rakhein.
</p>
)}
</div>
<div>
<label className={labelClass}>Received Amount (₹)</label>
<input
className={inputClass}
type="number"
min="0"
value={form.received}
onChange={(e) => updateField("received", e.target.value)}
/>
</div>
<div>
<label className={labelClass}>Delivery Date</label>
<input
className={inputClass}
type="date"
value={form.delivery}
onChange={(e) => updateField("delivery", e.target.value)}
/>
</div>
<div className="sm:col-span-2 lg:col-span-3 rounded-xl border border-slate-200 p-4">
<label className={labelClass}>Consumed Parts — Dealer aur Part select karein</label>
<div className="mt-2 grid grid-cols-1 gap-3 md:grid-cols-[minmax(220px,1fr)_2fr]">
<div>
<label className={labelClass}>Purchase Dealer</label>
<select
className={inputClass}
value={consumedDealer}
onChange={(e) => { setConsumedDealer(e.target.value); setConsumedPurchaseIds([]); }}
disabled={editingId === null}
>
<option value="">Dealer select karein</option>
{consumedDealerOptions.map((name) => <option key={name} value={name}>{name}</option>)}
</select>
</div>
<div>
<label className={labelClass}>Purchase Parts — multiple select kar sakte hain</label>
<div className="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-slate-300 p-3">
{!consumedDealer ? (
<p className="text-sm text-slate-500">Pehle dealer select karein.</p>
) : selectablePurchaseParts.length === 0 ? (
<p className="text-sm text-slate-500">Is dealer ke available purchase parts nahi mile.</p>
) : selectablePurchaseParts.map((part) => (
<label key={part.id} className="flex cursor-pointer items-start gap-2 rounded-md border border-slate-100 p-2 hover:bg-slate-50">
<input
type="checkbox"
className="mt-1 h-4 w-4"
checked={consumedPurchaseIds.includes(part.id)}
onChange={() => toggleConsumedPurchaseId(part.id)}
disabled={editingId === null}
/>
<span className="text-sm">
<span className="font-medium">{part.partName}</span>
<span className="block text-xs text-slate-500">{part.date} · Qty {part.qty} · ₹{(Number(part.unitCost) || 0).toLocaleString("en-IN")} each</span>
</span>
</label>
))}
</div>
<button
type="button"
onClick={linkSelectedPurchaseParts}
disabled={editingId === null || consumedPurchaseIds.length === 0}
className="mt-3 w-full rounded-lg bg-blue-700 px-4 py-3 font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-slate-400"
>
Add selected parts ({consumedPurchaseIds.length}) to Job
</button>
</div>
</div>
<p className="mt-2 text-xs text-slate-500">
Pehle job save karein. Dealer select karke ek ya kai purchase entries tick karein, phir button dabayein. Sabhi selected parts ek saath job se link ho jayenge aur neeche history mein dealer, date, quantity aur actual cost dikhegi.
</p>
<textarea
className={`${inputClass} mt-3`}
rows={4}
readOnly
value={editingId !== null
? consumedPartsForJob(editingId, form.parts)
: (form.parts || "Job save karne ke baad dealer aur purchase part yahan select karein.")}
/>
</div>
<div className="sm:col-span-2 lg:col-span-3">
<button
type="submit"
className="rounded-lg bg-blue-700 px-6 py-3 font-semibold text-white hover:bg-blue-800"
>
{editingId !== null ? "Update Job" : "Save Job"}
</button>
</div>
</form>
</section>
<section className="rounded-xl bg-white p-5 shadow-sm sm:p-7">
<div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
<h2 className="text-xl font-bold">Repairing Job Register</h2>
<input
className={`${inputClass} sm:max-w-sm`}
value={search}
onChange={(e) => setSearch(e.target.value)}
placeholder="Search Job No., customer, phone, model..."
/>
</div>
<div className="overflow-x-auto">
<table className="w-full min-w-[1500px] text-left text-sm">
<thead className="bg-slate-100 text-slate-600">
<tr>
{[
"Job No.",
"Date",
"Customer",
"Phone",
"Model",
"IMEI / Serial",
"Problem",
"Estimate",
"Final Amount",
"Received",
"Balance",
"Repair Status",
"Delivery Status",
"Technician",
"Delivery",
"Parts",
"Actions",
].map((heading) => (
<th key={heading} className="px-3 py-3 font-semibold">
{heading}
</th>
))}
</tr>
</thead>
<tbody>
{filtered.map((job) => (
<tr key={job.id} className="border-b border-slate-100">
<td className="px-3 py-3 font-semibold">{job.jobNo}</td>
<td className="px-3 py-3">{job.date}</td>
<td className="px-3 py-3">{job.customer}</td>
<td className="px-3 py-3">{job.phone}</td>
<td className="px-3 py-3">{job.model}</td>
<td className="px-3 py-3">{job.imei || "—"}</td>
<td className="px-3 py-3">{job.problem}</td>
<td className="px-3 py-3">{money(job.estimate)}</td>
<td className="px-3 py-3">{money(job.finalAmount)}</td>
<td className="px-3 py-3">{money(job.received)}</td>
<td className="px-3 py-3">{money(balance(job))}</td>
<td className="px-3 py-3">
<select
className="rounded border border-slate-300 p-1.5"
value={job.repairStatus}
onChange={(e) =>
updateRepairStatus(job.id, e.target.value as "OK" | "NR" | "In Process")
}
>
{repairStatusOptions.map((status) => (
<option key={status} value={status}>
{status === "NR"
                      ? "NR (Not Repair)"
                      : status === "In Process"
                        ? "In Process"
                        : "OK (Repaired)"}
</option>
))}
</select>
</td>
<td className="px-3 py-3">
<select
className="rounded border border-slate-300 p-1.5"
value={job.deliveryStatus}
onChange={(e) =>
updateDeliveryStatus(
job.id,
e.target.value as "Delivered" | "Not Delivered"
)
}
>
{deliveryStatusOptions.map((status) => (
<option key={status} value={status}>
{status}
</option>
))}
</select>
</td>
<td className="px-3 py-3">{job.technician || "—"}</td>
<td className="px-3 py-3">{job.delivery || "—"}</td>
<td className="whitespace-pre-line px-3 py-3">{consumedPartsForJob(job.id, job.parts)}</td>
<td className="px-3 py-3">
<div className="flex flex-col gap-2">
<button
type="button"
onClick={() => editJob(job)}
className="rounded bg-blue-700 px-3 py-2 text-white"
>
Edit
</button>
<button
type="button"
onClick={() => printReceipt(job)}
className="rounded bg-emerald-700 px-3 py-2 text-white"
>
Print Receipt
</button>
</div>
</td>
</tr>
))}
{filtered.length === 0 && (
<tr>
<td
colSpan={17}
className="px-4 py-10 text-center text-slate-500"
>
Koi job nahi mili. Search badlein ya nayi entry karein.
</td>
</tr>
)}
</tbody>
</table>
</div>
<p className="mt-4 text-xs text-slate-500">
Prototype: data abhi isi browser mein save hota hai. Online
database, staff logins aur automatic backup agle setup steps mein
aayenge.
</p>
</section>
</div>
</main>
);
}
