"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type RepairJob = {
  id: string | number;
  jobNo?: string;
  date?: string;
  customer?: string;
  phone?: string;
  model?: string;
  technician?: string;
  status?: string;
  repairStatus?: string;
  [key: string]: unknown;
};
type Staff = { id?: string | number; name: string; designation?: string; status?: string };
type PurchaseDraft = { date: string; partName: string; qty: string; unitCost: string; serials: string; notes: string; jobId: string; technician: string };
type IssueDraft = { partName: string; qty: string; serials: string; notes: string };
type PurchaseLine = {
  id: string; date: string; billNo: string; dealer: string; partName: string;
  qty: number; unitCost: number; serials: string[]; notes: string; consumedJobId?: string; technician?: string; createdAt: string;
};
type IssueRecord = {
  id: string; date: string; jobId: string; technician: string; partName: string;
  qty: number; unitCost: number; serials: string[]; createdAt: string;
};
type IssueEvent = {
  id: string; issueId: string; date: string;
  status: "Issued" | "Used" | "Unused" | "Returned" | "Damaged" | "Missing";
  qty: number; notes: string; createdAt: string;
};
type AuditRecord = {
  id: string; date: string; partName: string; systemQty: number; physicalQty: number;
  difference: number; notes: string; createdAt: string;
};
type LogRecord = {
  id: string; date: string; action: string; reference: string; details: string; createdAt: string;
};

const KEYS = {
  jobs: "mti-repair-jobs",
  staff: "mti-staff",
  purchases: "mti-stock-purchases-v1",
  issues: "mti-stock-issues-v1",
  events: "mti-stock-issue-events-v1",
  audits: "mti-stock-audits-v1",
  log: "mti-stock-audit-log-v1",
  parts: "mti-stock-part-catalog-v1",
  dealers: "mti-stock-dealer-catalog-v1",
};
const today = () => new Date().toISOString().slice(0, 10);
const id = () => `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
const qtyNum = (v: unknown) => Math.max(0, Number(v) || 0);
const money = (v: number) => String.fromCharCode(0x20B9) + (Number.isFinite(v) ? v : 0).toLocaleString("en-IN", { maximumFractionDigits: 2 });
const asArray = <T,>(key: string): T[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) || "[]");
    return Array.isArray(value) ? value : [];
  } catch { return []; }
};
const store = <T,>(key: string, value: T[]) => localStorage.setItem(key, JSON.stringify(value));

function latestStatus(events: IssueEvent[], issueId: string): IssueEvent | undefined {
  return events.filter(e => e.issueId === issueId).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
}

export default function RepairingStockPage() {
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [purchases, setPurchases] = useState<PurchaseLine[]>([]);
  const [issues, setIssues] = useState<IssueRecord[]>([]);
  const [events, setEvents] = useState<IssueEvent[]>([]);
  const [audits, setAudits] = useState<AuditRecord[]>([]);
  const [log, setLog] = useState<LogRecord[]>([]);
  const [tab, setTab] = useState<"purchase" | "issue" | "stock" | "audit" | "history" | "purchaseHistory">("purchase");
  const [notice, setNotice] = useState("");

  const [purchaseDate, setPurchaseDate] = useState("");
  const [billNo, setBillNo] = useState("");
  const [dealer, setDealer] = useState("");
  const [dealerCatalog, setDealerCatalog] = useState<string[]>([]);
  const [purchasePart, setPurchasePart] = useState("");
  const [purchaseQty, setPurchaseQty] = useState("1");
  const [purchaseCost, setPurchaseCost] = useState("");
  const [purchaseSerials, setPurchaseSerials] = useState("");
  const [purchaseNotes, setPurchaseNotes] = useState("");
  const [purchaseLines, setPurchaseLines] = useState<PurchaseDraft[]>([{ date: "", partName: "", qty: "1", unitCost: "", serials: "", notes: "", jobId: "", technician: "" }]);
  const [historyDealer, setHistoryDealer] = useState("");
  const [currentStockDealer, setCurrentStockDealer] = useState("");
  const [partCatalog, setPartCatalog] = useState<string[]>([]);
  const [newPartName, setNewPartName] = useState("");
  const [editingPartName, setEditingPartName] = useState("");
  const [editingPartValue, setEditingPartValue] = useState("");

  const [issueDate, setIssueDate] = useState("");
  const [issueJobId, setIssueJobId] = useState("");
  const [issueTechnician, setIssueTechnician] = useState("");
  const [issuePart, setIssuePart] = useState("");
  const [issueQty, setIssueQty] = useState("1");
  const [issueSerials, setIssueSerials] = useState("");
  const [issueNotes, setIssueNotes] = useState("");
  const [issueLines, setIssueLines] = useState<IssueDraft[]>([{ partName: "", qty: "1", serials: "", notes: "" }]);

  const [eventIssueId, setEventIssueId] = useState("");
  const [eventStatus, setEventStatus] = useState<IssueEvent["status"]>("Used");
  const [eventQty, setEventQty] = useState("1");
  const [eventDate, setEventDate] = useState("");
  const [eventNotes, setEventNotes] = useState("");

  const [auditPart, setAuditPart] = useState("");
  const [physicalQty, setPhysicalQty] = useState("");
  const [auditDate, setAuditDate] = useState("");
  const [auditNotes, setAuditNotes] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  useEffect(() => {
    const initialDate = today();
    setPurchaseDate(initialDate);
    setPurchaseLines(lines => lines.map(line => line.date ? line : { ...line, date: initialDate }));
    setIssueDate(initialDate);
    setEventDate(initialDate);
    setAuditDate(initialDate);
    setJobs(asArray<RepairJob>(KEYS.jobs));
    // Staff list ab PostgreSQL API se load hogi; stock ke purane records localStorage mein hi rahenge.
    fetch("/api/staff/active")
      .then(async (res) => {
        if (!res.ok) {
          throw new Error("Staff list load nahi hui.");
        }
        const data = await res.json();
        setStaff(Array.isArray(data.staff) ? data.staff : []);
      })
      .catch((error) => {
        console.error("Staff loading error:", error);
        setStaff([]);
      });
    setPurchases(asArray<PurchaseLine>(KEYS.purchases));
    setIssues(asArray<IssueRecord>(KEYS.issues));
    setEvents(asArray<IssueEvent>(KEYS.events));
    setAudits(asArray<AuditRecord>(KEYS.audits));
    setLog(asArray<LogRecord>(KEYS.log));
    setPartCatalog(asArray<string>(KEYS.parts));
    const savedDealers = asArray<unknown>(KEYS.dealers)
      .map(value => typeof value === "string" ? value.trim() : "")
      .filter(Boolean);
    const dealersFromPurchases = asArray<PurchaseLine>(KEYS.purchases)
      .map(p => String(p?.dealer || "").trim())
      .filter(Boolean);
    const dealerMap = new Map<string, string>();
    for (const name of [...savedDealers, ...dealersFromPurchases]) {
      const key = name.toLocaleLowerCase();
      if (!dealerMap.has(key)) dealerMap.set(key, name);
    }
    const mergedDealers = Array.from(dealerMap.values()).sort((a, b) => a.localeCompare(b));
    setDealerCatalog(mergedDealers);
    store(KEYS.dealers, mergedDealers);
  }, []);

  const partNames = useMemo(() => Array.from(new Set([
    ...partCatalog.map(p => p.trim()).filter(Boolean),
    ...purchases.map(p => p.partName.trim()).filter(Boolean),
    ...issues.map(p => p.partName.trim()).filter(Boolean),
  ])).sort((a, b) => a.localeCompare(b)), [partCatalog, purchases, issues]);

  // FIFO batch allocation: total net issued quantity is deducted from the oldest
  // purchase batches of the same part. Returned quantity is added back first.
  const currentStockRows = useMemo(() => {
    const rows: Array<PurchaseLine & { consumedQty: number; availableQty: number }> = [];
    const partGroups = new Map<string, PurchaseLine[]>();
    for (const purchase of purchases) {
      const key = purchase.partName.trim().toLowerCase();
      if (!key) continue;
      const group = partGroups.get(key) || [];
      group.push(purchase);
      partGroups.set(key, group);
    }

    for (const [partKey, group] of partGroups) {
      const fifo = [...group].sort((a, b) => {
        const dateOrder = (a.date || "").localeCompare(b.date || "");
        return dateOrder || (a.createdAt || "").localeCompare(b.createdAt || "");
      });
      const issued = issues
        .filter(issue => issue.partName.trim().toLowerCase() === partKey)
        .reduce((sum, issue) => sum + qtyNum(issue.qty), 0);
      const returned = events
        .filter(event => event.status === "Returned")
        .reduce((sum, event) => {
          const relatedIssue = issues.find(issue => issue.id === event.issueId);
          return sum + (relatedIssue?.partName.trim().toLowerCase() === partKey ? qtyNum(event.qty) : 0);
        }, 0);
      let remainingConsumption = Math.max(0, issued - returned);

      for (const purchase of fifo) {
        const consumedQty = Math.min(qtyNum(purchase.qty), remainingConsumption);
        remainingConsumption = Math.max(0, remainingConsumption - consumedQty);
        const availableQty = Math.max(0, qtyNum(purchase.qty) - consumedQty);
        if (availableQty > 0) rows.push({ ...purchase, consumedQty, availableQty });
      }
    }

    return rows.sort((a, b) => {
      const dateOrder = (b.date || "").localeCompare(a.date || "");
      return dateOrder || (b.createdAt || "").localeCompare(a.createdAt || "");
    });
  }, [purchases, issues, events]);

  // Dono jagah ek hi master list use hogi: saved dealer catalog + purani purchase entries.
  // Isse aise dealers bhi dropdown mein rahenge jinki abhi unconsumed stock entry nahi hai.
  const allDealerNames = useMemo(() => {
    const names = [...dealerCatalog, ...purchases.map(p => p.dealer || "")];
    const unique = new Map<string, string>();
    for (const rawName of names) {
      const name = String(rawName || "").trim();
      if (!name) continue;
      const key = name.toLocaleLowerCase();
      if (!unique.has(key)) unique.set(key, name);
    }
    return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
  }, [dealerCatalog, purchases]);

  const currentStockDealers = allDealerNames;

  const filteredCurrentStockRows = currentStockRows.filter(row =>
    !currentStockDealer || row.dealer.trim().toLowerCase() === currentStockDealer.toLowerCase()
  );

  function rememberDealer(rawName: string) {
    const name = rawName.trim();
    if (!name) return;
    const existing = dealerCatalog.find(d => d.toLowerCase() === name.toLowerCase());
    if (existing) {
      if (dealer !== existing) setDealer(existing);
      return;
    }
    const next = [...dealerCatalog, name].sort((a, b) => a.localeCompare(b));
    setDealerCatalog(next);
    store(KEYS.dealers, next);
    setNotice(`${name} dealer list mein automatic save ho gaya.`);
    addLog("DEALER_MASTER_ADD", name, "Purchase entry ke dauran naya dealer automatic list mein add hua.");
  }

  function addPartToCatalog() {
    const name = newPartName.trim();
    if (!name) return;
    if (partNames.some(p => p.toLowerCase() === name.toLowerCase())) {
      setNotice("Ye part pehle se list mein hai.");
      return;
    }
    const next = [...partCatalog, name].sort((a, b) => a.localeCompare(b));
    setPartCatalog(next);
    store(KEYS.parts, next);
    setNewPartName("");
    setNotice(`${name} part list mein add ho gaya.`);
    addLog("PART_MASTER_ADD", name, "Part master list mein naya part add kiya.");
  }

  function startEditPart(name: string) {
    setEditingPartName(name);
    setEditingPartValue(name);
  }

  function savePartNameEdit() {
    const oldName = editingPartName.trim();
    const newName = editingPartValue.trim();
    if (!oldName || !newName) {
      setNotice("Part name khali nahi ho sakta.");
      return;
    }
    if (oldName.toLowerCase() !== newName.toLowerCase() && partNames.some(p => p.toLowerCase() === newName.toLowerCase())) {
      setNotice("Is naam ka part pehle se list mein hai.");
      return;
    }
    const nextCatalog = Array.from(new Set([
      ...partCatalog.filter(p => p.toLowerCase() !== oldName.toLowerCase()),
      newName,
    ])).sort((a, b) => a.localeCompare(b));
    const nextPurchases = purchases.map(p => p.partName.toLowerCase() === oldName.toLowerCase() ? { ...p, partName: newName } : p);
    const nextIssues = issues.map(i => i.partName.toLowerCase() === oldName.toLowerCase() ? { ...i, partName: newName } : i);
    const nextAudits = audits.map(a => a.partName.toLowerCase() === oldName.toLowerCase() ? { ...a, partName: newName } : a);
    setPartCatalog(nextCatalog); store(KEYS.parts, nextCatalog);
    setPurchases(nextPurchases); store(KEYS.purchases, nextPurchases);
    setIssues(nextIssues); store(KEYS.issues, nextIssues);
    setAudits(nextAudits); store(KEYS.audits, nextAudits);
    setPurchaseLines(lines => lines.map(line => line.partName.toLowerCase() === oldName.toLowerCase() ? { ...line, partName: newName } : line));
    addLog("PART_MASTER_RENAME", oldName, `Part name changed from "${oldName}" to "${newName}".`);
    setEditingPartName("");
    setEditingPartValue("");
    setNotice(`Part name "${oldName}" se "${newName}" kar diya. Existing purchase, issue aur audit records bhi update hue.`);
  }

  const issueStatus = (issue: IssueRecord) => latestStatus(events, issue.id)?.status || "Issued";
  const issueStatusQty = (issue: IssueRecord) => latestStatus(events, issue.id)?.qty ?? issue.qty;

  // Stock is a movement balance: purchase adds; issuing removes; returns add back.
  const purchasedQty = (part: string) => purchases.filter(p => p.partName.toLowerCase() === part.toLowerCase()).reduce((s, p) => s + p.qty, 0);
  const issuedQty = (part: string) => issues.filter(i => i.partName.toLowerCase() === part.toLowerCase()).reduce((s, i) => s + i.qty, 0);
  const returnedQty = (part: string) => events.filter(e => e.status === "Returned").reduce((s, e) => s + (issues.find(i => i.id === e.issueId)?.partName.toLowerCase() === part.toLowerCase() ? e.qty : 0), 0);
  const shopQty = (part: string) => purchasedQty(part) - issuedQty(part) + returnedQty(part);
  const unitCostFor = (part: string) => {
    const line = [...purchases].filter(p => p.partName.toLowerCase() === part.toLowerCase()).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return line?.unitCost ?? 0;
  };
  const custodyQty = (issue: IssueRecord) => {
    const all = events.filter(e => e.issueId === issue.id);
    const returned = all.filter(e => e.status === "Returned").reduce((s, e) => s + e.qty, 0);
    const used = all.filter(e => e.status === "Used").reduce((s, e) => s + e.qty, 0);
    const damaged = all.filter(e => e.status === "Damaged").reduce((s, e) => s + e.qty, 0);
    const missing = all.filter(e => e.status === "Missing").reduce((s, e) => s + e.qty, 0);
    return Math.max(0, issue.qty - returned - used - damaged - missing);
  };
  const selectedIssue = issues.find(i => i.id === eventIssueId);
  const selectedIssueRemaining = selectedIssue ? custodyQty(selectedIssue) : 0;
  const selectedJob = jobs.find(j => String(j.id) === issueJobId);
  const jobLabel = (j: RepairJob) => `${j.jobNo || `Job ${j.id}`} · ${j.customer || "Customer"} · ${j.model || "Mobile"}`;
  const jobPartCost = (jobId: string) => issues.filter(i => i.jobId === jobId).reduce((s, i) => {
    const used = events.filter(e => e.issueId === i.id && e.status === "Used").reduce((n, e) => n + e.qty, 0);
    return s + used * i.unitCost;
  }, 0);
  const totalPurchasedValue = purchases.reduce((s, p) => s + p.qty * p.unitCost, 0);
  const totalStockValue = partNames.reduce((s, p) => s + Math.max(0, shopQty(p)) * unitCostFor(p), 0);
  const missingQty = events.filter(e => e.status === "Missing").reduce((s, e) => s + e.qty, 0);
  const damagedQty = events.filter(e => e.status === "Damaged").reduce((s, e) => s + e.qty, 0);

  const addLog = (action: string, reference: string, details: string, date = today()) => {
    const entry: LogRecord = { id: id(), date, action, reference, details, createdAt: new Date().toISOString() };
    const next = [entry, ...log];
    setLog(next); store(KEYS.log, next);
  };
  const exportStockBackup = () => {
    try {
      const stockData: Record<string, unknown> = {};
      Object.entries(KEYS).forEach(([name, key]) => {
        stockData[name] = localStorage.getItem(key);
      });
      const backup = {
        app: "MTI Repairing CRM",
        type: "stock-backup",
        exportedAt: new Date().toISOString(),
        data: stockData,
      };
      const blob = new Blob([JSON.stringify(backup, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `mti-stock-backup-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setNotice("Stock backup download start ho gaya.");
    } catch {
      setNotice("Backup export nahi ho saka. Dobara try karein.");
    }
  };
  const savePurchases = (v: PurchaseLine[]) => { setPurchases(v); store(KEYS.purchases, v); };
  const saveIssues = (v: IssueRecord[]) => { setIssues(v); store(KEYS.issues, v); };
  const saveEvents = (v: IssueEvent[]) => { setEvents(v); store(KEYS.events, v); };

  function addPurchase(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const drafts = purchaseLines.filter(x => x.partName.trim() || x.unitCost.trim() || x.serials.trim() || x.jobId);
    if (!dealer.trim() || drafts.length === 0) {
      setNotice("Dealer aur kam se kam ek part ki entry bhariye."); return;
    }
    const prepared: PurchaseLine[] = [];
    const autoIssues: IssueRecord[] = [];
    const autoEvents: IssueEvent[] = [];
    const serialsThisBatch: string[] = [];
    for (const line of drafts) {
      const name = line.partName.trim(), q = qtyNum(line.qty), cost = qtyNum(line.unitCost);
      if (!name || q <= 0 || line.unitCost.trim() === "") {
        setNotice("Har part row mein part name, valid quantity aur purchase rate bhariye."); return;
      }
      const linkedJob = line.jobId ? jobs.find(j => String(j.id) === line.jobId) : undefined;
      if (line.jobId && !linkedJob) { setNotice("Purchase row mein selected job nahi mili."); return; }
      if (linkedJob && !String(linkedJob.technician || "").trim()) {
        setNotice(`Job ${linkedJob.jobNo || linkedJob.id} mein technician assigned nahi hai. Pehle Repairing Dashboard mein technician assign karein.`); return;
      }
      const serials = line.serials.split(/[\\n,;]+/).map(x => x.trim()).filter(Boolean);
      if (serials.length > 0 && (serials.length !== q || !Number.isInteger(q))) {
        setNotice("Serial/barcode enter kiye hain to whole-number quantity ke barabar unique codes dein."); return;
      }
      if (new Set(serials).size !== serials.length) { setNotice("Ek part row mein duplicate serial/barcode hai."); return; }
      serialsThisBatch.push(...serials);
      const purchase: PurchaseLine = {
        id: id(), date: line.date || purchaseDate, billNo: billNo.trim(), dealer: dealer.trim(), partName: name,
        qty: q, unitCost: cost, serials, notes: line.notes.trim() || purchaseNotes.trim(),
        technician: line.technician.trim() || undefined,
        consumedJobId: linkedJob ? String(linkedJob.id) : undefined, createdAt: new Date().toISOString()
      };
      prepared.push(purchase);
      if (linkedJob) {
        const issueId = id();
        autoIssues.push({
          id: issueId, date: line.date || purchaseDate, jobId: String(linkedJob.id),
          technician: String(linkedJob.technician), partName: name, qty: q, unitCost: cost,
          serials, createdAt: new Date().toISOString()
        });
        autoEvents.push({
          id: id(), issueId, date: purchaseDate, status: "Used", qty: q,
          notes: `Purchase row ${purchase.id} linked directly to job ${linkedJob.jobNo || linkedJob.id}`,
          createdAt: new Date().toISOString()
        });
      }
    }
    if (new Set(serialsThisBatch).size !== serialsThisBatch.length) { setNotice("Is purchase mein duplicate serial/barcode hai."); return; }
    const alreadyUsed = serialsThisBatch.find(code => purchases.some(p => p.serials.includes(code)));
    if (alreadyUsed) { setNotice(`Serial/barcode ${alreadyUsed} pehle se purchase mein record hai.`); return; }
    rememberDealer(dealer);
    savePurchases([...prepared].reverse().concat(purchases));
    const nextPartCatalog = Array.from(new Set([...partCatalog, ...prepared.map(p => p.partName.trim())])).filter(Boolean).sort((a, b) => a.localeCompare(b));
    setPartCatalog(nextPartCatalog);
    store(KEYS.parts, nextPartCatalog);
    const nextDealerCatalog = Array.from(new Set([...dealerCatalog, ...prepared.map(p => p.dealer.trim())])).filter(Boolean).sort((a, b) => a.localeCompare(b));
    setDealerCatalog(nextDealerCatalog);
    store(KEYS.dealers, nextDealerCatalog);
    if (autoIssues.length) saveIssues([...autoIssues].reverse().concat(issues));
    if (autoEvents.length) saveEvents([...autoEvents].reverse().concat(events));
    for (const p of prepared) {
      const linked = p.consumedJobId ? jobs.find(j => String(j.id) === p.consumedJobId) : undefined;
      addLog("PURCHASE_IN", p.id, `${p.qty} × ${p.partName}; dealer ${p.dealer}; rate ${money(p.unitCost)}; bill ${p.billNo || "not entered"}${linked ? "; auto-consumed on job " + (linked.jobNo || linked.id) : ""}`, p.date);
    }
    setPurchaseLines([{ date: today(), partName: "", qty: "1", unitCost: "", serials: "", notes: "", jobId: "", technician: "" }]);
    setPurchasePart(""); setPurchaseQty("1"); setPurchaseCost(""); setPurchaseSerials(""); setPurchaseNotes("");
    setNotice(`${prepared.length} purchase line(s) save hui. ${autoIssues.length} line(s) job se link hokar technician ke parts record mein Used mark hui.`);
  }

  function addIssue(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const job = jobs.find(j => String(j.id) === issueJobId);
    if (!job || !issueTechnician.trim()) { setNotice("Job aur technician select karein."); return; }
    const drafts = issueLines.filter(x => x.partName.trim());
    if (drafts.length === 0) { setNotice("Kam se kam ek part select karein."); return; }
    const prepared: IssueRecord[] = [];
    const batchSerials: string[] = [];
    for (const line of drafts) {
      const part = line.partName.trim(), q = qtyNum(line.qty);
      if (!part || q <= 0) { setNotice("Har part row mein part aur valid quantity enter karein."); return; }
      if (!partNames.some(p => p.toLowerCase() === part.toLowerCase())) { setNotice(`Pehle Purchase Inward mein ${part} add karein.`); return; }
      const alreadyPrepared = prepared.filter(x => x.partName.toLowerCase() === part.toLowerCase()).reduce((sum, x) => sum + x.qty, 0);
      if (q + alreadyPrepared > shopQty(part)) { setNotice(`Stock kam hai. ${part} ka available stock ${shopQty(part)} hai.`); return; }
      const serials = line.serials.split(/[\\n,;]+/).map(x => x.trim()).filter(Boolean);
      if (serials.length > 0 && (serials.length !== q || !Number.isInteger(q))) { setNotice("Serial/barcode enter kiye hain to whole-number quantity ke barabar codes dein."); return; }
      if (new Set(serials).size !== serials.length) { setNotice("Issue row mein duplicate serial/barcode hai."); return; }
      batchSerials.push(...serials);
      const allSerialsForPart = purchases.filter(p => p.partName.toLowerCase() === part.toLowerCase()).flatMap(p => p.serials);
      for (const serial of serials) {
        if (!allSerialsForPart.includes(serial)) { setNotice(`Serial/barcode ${serial} is part ke purchase stock mein nahi mila.`); return; }
        const priorIssue = [...issues, ...prepared].filter(i => i.serials.includes(serial)).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
        if (priorIssue && latestStatus(events, priorIssue.id)?.status !== "Returned") { setNotice(`Serial/barcode ${serial} pehle issue ho chuka hai. Return record karein.`); return; }
      }
      prepared.push({ id: id(), date: issueDate, jobId: String(job.id), technician: issueTechnician.trim(), partName: part, qty: q, unitCost: unitCostFor(part), serials, createdAt: new Date().toISOString() });
    }
    if (new Set(batchSerials).size !== batchSerials.length) { setNotice("Is issue batch mein duplicate serial/barcode hai."); return; }
    saveIssues([...prepared.reverse(), ...issues]);
    for (const item of prepared) addLog("ISSUE_TO_TECH", item.id, `${item.qty} × ${item.partName} issued to ${item.technician}; job ${job.jobNo || job.id}; serials ${item.serials.join(", ") || "not recorded"}`, issueDate);
    setIssueLines([{ partName: "", qty: "1", serials: "", notes: "" }]);
    setIssuePart(""); setIssueQty("1"); setIssueSerials(""); setIssueNotes("");
    setNotice(`${prepared.length} part line(s) ek saath technician ko issue ho gayi.`);
  }

  function addIssueEvent(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const issue = issues.find(i => i.id === eventIssueId);
    const q = qtyNum(eventQty);
    if (!issue || q <= 0 || q > custodyQty(issue)) { setNotice(`Valid issue aur quantity enter karein. Is issue par technician ke paas ${issue ? custodyQty(issue) : 0} bache hain.`); return; }
    if (eventStatus === "Issued") { setNotice("Status update ke liye Used, Unused, Returned, Damaged ya Missing select karein."); return; }
    const ev: IssueEvent = { id: id(), issueId: issue.id, date: eventDate, status: eventStatus, qty: q, notes: eventNotes.trim(), createdAt: new Date().toISOString() };
    saveEvents([ev, ...events]);
    addLog(`PART_${eventStatus.toUpperCase()}`, issue.id, `${q} × ${issue.partName}; technician ${issue.technician}; job ${issue.jobId}${ev.notes ? "; " + ev.notes : ""}`, ev.date);
    setEventQty("1"); setEventNotes("");
    setNotice(`Part status "${eventStatus}" record ho gaya. Purani history preserve hai.`);
  }

  function addAudit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const part = auditPart.trim(), physical = qtyNum(physicalQty);
    if (!part || physicalQty.trim() === "") { setNotice("Part aur actual physical quantity enter karein."); return; }
    const system = shopQty(part);
    const a: AuditRecord = { id: id(), date: auditDate, partName: part, systemQty: system, physicalQty: physical, difference: physical - system, notes: auditNotes.trim(), createdAt: new Date().toISOString() };
    const next = [a, ...audits]; setAudits(next); store(KEYS.audits, next);
    addLog("STOCK_AUDIT", a.id, `${part}: system ${system}, physical ${physical}, difference ${a.difference}${a.notes ? "; " + a.notes : ""}`, a.date);
    setPhysicalQty(""); setAuditNotes("");
    setNotice(a.difference === 0 ? "Stock match hai." : `Stock mismatch mila: ${a.difference > 0 ? "+" : ""}${a.difference}. Investigation karein; system stock automatic change nahi kiya.`);
  }

  const btn = "rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-50";
  const secondary = "rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50";
  const input = "w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500";
  const label = "mb-1 block text-xs font-semibold text-slate-600";
  const card = "rounded-xl border border-slate-200 bg-white p-4 shadow-sm";
  const jobFor = (jobId: string) => jobs.find(j => String(j.id) === jobId);
  const filteredLog = log.filter(l => `${l.action} ${l.reference} ${l.details} ${l.date}`.toLowerCase().includes(historySearch.toLowerCase()));

  return (
    <main className="min-h-screen bg-slate-100 p-4 text-slate-900 md:p-7">
      <div className="mx-auto w-full max-w-none space-y-5">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><p className="text-sm font-semibold uppercase tracking-wider text-blue-700">MTI Repairing CRM</p><h1 className="text-2xl font-bold md:text-3xl">Parts Stock Control</h1><p className="mt-1 text-sm text-slate-600">Purchase + multi-part issue · returns · audit trail</p></div>
          <div className="flex flex-wrap gap-2"><button type="button" className={secondary} onClick={exportStockBackup}>Download Stock Backup</button><a className={secondary} href="/repairing">← Repairing Dashboard</a></div>
        </header>

        <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className={card}><p className="text-sm text-slate-500">Purchase Value</p><p className="mt-1 text-2xl font-bold">{money(totalPurchasedValue)}</p><p className="text-xs text-slate-500">{purchases.length} inward entries</p></div>
          <div className={card}><p className="text-sm text-slate-500">Current Stock Value (est.)</p><p className="mt-1 text-2xl font-bold">{money(totalStockValue)}</p><p className="text-xs text-slate-500">Latest purchase rate per part name</p></div>
          <div className={card}><p className="text-sm text-slate-500">Marked Missing</p><p className="mt-1 text-2xl font-bold text-rose-700">{missingQty}</p><p className="text-xs text-slate-500">Qty recorded as missing</p></div>
          <div className={card}><p className="text-sm text-slate-500">Marked Damaged</p><p className="mt-1 text-2xl font-bold text-amber-700">{damagedQty}</p><p className="text-xs text-slate-500">Qty recorded as damaged</p></div>
        </section>

        {notice && <div className="flex items-start justify-between gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><span>{notice}</span><button className="font-bold" onClick={() => setNotice("")}>×</button></div>}

        <nav className="flex flex-wrap gap-2">
          {([{id:"purchase",label:"Purchase Inward"},{id:"issue",label:"Issue to Technician"},{id:"purchaseHistory",label:"Purchase History"},{id:"stock",label:"Current Stock"},{id:"audit",label:"Stock Audit"},{id:"history",label:"Correction History"}] as const).map(t => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-lg px-4 py-2 text-sm font-semibold ${tab===t.id ? "bg-blue-700 text-white" : "border border-slate-300 bg-white text-slate-700"}`}>{t.label}</button>)}
        </nav>

        {tab === "purchase" && <section className="w-full">
          <form onSubmit={addPurchase} className={`${card} w-full space-y-3`}>
            <h2 className="text-lg font-bold">Purchase Inward — Bulk Date-wise Entry</h2>
            <p className="text-xs text-slate-500">Dealer select ya type karein; neeche har row ki date, item, price, consumed Job No. aur technician set karein. + se nayi entry add karein.</p>
            <p className="text-xs text-slate-500">Dealer se maal aane par ek entry karein. Is entry ko baad mein edit/delete karne ke bajay correction log use karein.</p>
            <div className="grid grid-cols-2 gap-3"><div><label className={label}>Purchase date *</label><input className={input} type="date" value={purchaseDate} onChange={e=>setPurchaseDate(e.target.value)} required /></div><div><label className={label}>Bill / invoice no.</label><input className={input} value={billNo} onChange={e=>setBillNo(e.target.value)} /></div></div>
            <div>
              <label className={label}>Dealer / supplier *</label>
              <input className={input} list="mti-saved-dealer-names" value={dealer}
                onChange={e=>setDealer(e.target.value)} onBlur={()=>rememberDealer(dealer)}
                onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();rememberDealer(dealer);}}}
                placeholder="Dealer select karein ya naya naam type karein" autoComplete="off" required />
              <datalist id="mti-saved-dealer-names">{dealerCatalog.map(name=><option key={name} value={name} />)}</datalist>
              <p className="mt-1 text-xs text-slate-500">Naya naam type karke field se bahar aate hi dealer list mein automatic save ho jayega.</p>
            </div>
            <datalist id="mti-saved-part-names">
              {partNames.map(name => <option key={name} value={name} />)}
            </datalist>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2"><label className={label}>Purchase parts *</label><button type="button" className={secondary} onClick={()=>setPurchaseLines([...purchaseLines,{date:today(),partName:"",qty:"1",unitCost:"",serials:"",notes:"",jobId:"",technician:""}])}><span className="mr-1 text-base leading-none">+</span> Add another part</button></div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[920px] text-left text-sm">
                  <thead><tr className="border-b bg-slate-50 text-xs text-slate-600">
                    <th className="p-2">Date *</th><th className="p-2">Item name *</th><th className="p-2">Qty *</th><th className="p-2">Unit price ₹ *</th><th className="p-2">Consumed Job No.</th><th className="p-2">Technician</th><th className="p-2">Action</th>
                  </tr></thead>
                  <tbody>{purchaseLines.map((line,index)=><tr key={index} className="border-b align-top">
                    <td className="p-2"><input className={`${input} min-w-[135px]`} type="date" value={line.date} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,date:e.target.value}:x))} required /></td>
                    <td className="p-2"><input className={`${input} min-w-[150px]`} list="mti-saved-part-names" value={line.partName} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,partName:e.target.value}:x))} placeholder="Part name select/type karein" autoComplete="off" required />
                      <details className="mt-1 min-w-[180px] rounded-md border border-slate-200 px-2 py-1">
                        <summary className="cursor-pointer text-xs font-medium text-slate-600">Serial / barcode & notes (optional)</summary>
                        <div className="space-y-2 py-2">
                          <input className={input} value={line.serials} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,serials:e.target.value}:x))} placeholder="Serial / barcode" />
                          <input className={input} value={line.notes} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,notes:e.target.value}:x))} placeholder="Notes (optional)" />
                        </div>
                      </details></td>
                    <td className="p-2"><input className={`${input} min-w-[75px]`} type="number" min="0.01" step="0.01" value={line.qty} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,qty:e.target.value}:x))} required /></td>
                    <td className="p-2"><input className={`${input} min-w-[105px]`} type="number" min="0" step="0.01" value={line.unitCost} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,unitCost:e.target.value}:x))} required /><p className="mt-1 text-xs text-slate-500">Total {money(qtyNum(line.qty)*qtyNum(line.unitCost))}</p></td>
                    <td className="p-2"><select className={`${input} min-w-[170px]`} value={line.jobId} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,jobId:e.target.value}:x))}><option value="">Keep in stock</option>{jobs.map(j=><option key={String(j.id)} value={String(j.id)}>{jobLabel(j)}</option>)}</select></td>
                    <td className="p-2"><select className={`${input} min-w-[150px]`} value={line.technician} onChange={e=>setPurchaseLines(purchaseLines.map((x,i)=>i===index?{...x,technician:e.target.value}:x))}><option value="">Technician select karein</option>{staff.filter(person=>person.status==="Active" && person.designation==="Technician").map(person=><option key={String(person.id ?? person.name)} value={person.name}>{person.name}</option>)}</select></td>
                    <td className="p-2"><div className="flex items-center gap-1">
                      <button type="button" title="Next entry add karein" aria-label="Next entry add karein" className="flex h-8 w-8 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-lg font-bold leading-none text-blue-700 hover:bg-blue-100" onClick={()=>setPurchaseLines([...purchaseLines.slice(0,index+1),{date:today(),partName:"",qty:"1",unitCost:"",serials:"",notes:"",jobId:"",technician:""},...purchaseLines.slice(index+1)])}>+</button>
                      {purchaseLines.length>1&&<button type="button" title="Remove row" className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700" onClick={()=>setPurchaseLines(purchaseLines.filter((_,i)=>i!==index))}>Remove</button>}
                    </div></td>
                  </tr>)}</tbody>
                </table>
              </div>
              <div className="rounded-lg bg-slate-50 p-3 text-sm">Purchase total: <b>{money(purchaseLines.reduce((sum,line)=>sum+qtyNum(line.qty)*qtyNum(line.unitCost),0))}</b></div>
            </div>
            <button className={btn} type="submit">Save Purchase Inward</button>
          </form>
        </section>}

        {tab === "issue" && <section className={`${card} w-full space-y-4`}>
          <div>
            <h2 className="text-lg font-bold">Issue Parts to Technician</h2>
            <p className="mt-1 text-sm text-slate-500">Active Technician select karein, Repair Job choose karein aur parts issue record karein.</p>
          </div>

          <form onSubmit={addIssue} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <label className={label}>Issue date *</label>
                <input className={input} type="date" value={issueDate} onChange={e=>setIssueDate(e.target.value)} required />
              </div>
              <div>
                <label className={label}>Repair Job *</label>
                <select className={input} value={issueJobId} onChange={e=>setIssueJobId(e.target.value)} required>
                  <option value="">Job select karein</option>
                  {jobs.map(j=><option key={String(j.id)} value={String(j.id)}>{jobLabel(j)}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Technician *</label>
                <select className={input} value={issueTechnician} onChange={e=>setIssueTechnician(e.target.value)} required>
                  <option value="">Technician select karein</option>
                  {staff.filter(person => person.status === "Active" && person.designation === "Technician").map(person=><option key={String(person.id ?? person.name)} value={person.name}>{person.name}</option>)}
                </select>
                {staff.filter(person => person.status === "Active" && person.designation === "Technician").length === 0 &&
                  <p className="mt-1 text-xs text-rose-600">Koi Active Technician nahi mila. Staff Management mein Technician ka status check karein.</p>}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">Parts to issue *</h3>
              <button type="button" className={secondary} onClick={()=>setIssueLines([...issueLines,{partName:"",qty:"1",serials:"",notes:""}])}>+ Add another part</button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-600">
                  <tr>
                    <th className="p-2">Part name *</th>
                    <th className="p-2">Available qty</th>
                    <th className="p-2">Issue qty *</th>
                    <th className="p-2">Serial / barcode</th>
                    <th className="p-2">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {issueLines.map((line,index)=><tr key={index} className="border-b align-top">
                    <td className="p-2">
                      <select className={`${input} min-w-[180px]`} value={line.partName} onChange={e=>setIssueLines(issueLines.map((x,i)=>i===index?{...x,partName:e.target.value}:x))}>
                        <option value="">Part select karein</option>
                        {partNames.map(part=><option key={part} value={part}>{part}</option>)}
                      </select>
                    </td>
                    <td className="p-2 font-semibold">{line.partName ? shopQty(line.partName) : "—"}</td>
                    <td className="p-2">
                      <input className={`${input} min-w-[90px]`} type="number" min="0.01" step="0.01" value={line.qty} onChange={e=>setIssueLines(issueLines.map((x,i)=>i===index?{...x,qty:e.target.value}:x))} required />
                    </td>
                    <td className="p-2">
                      <input className={`${input} min-w-[180px]`} value={line.serials} onChange={e=>setIssueLines(issueLines.map((x,i)=>i===index?{...x,serials:e.target.value}:x))} placeholder="Optional serial / barcode" />
                    </td>
                    <td className="p-2">
                      {issueLines.length>1 && <button type="button" className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-700" onClick={()=>setIssueLines(issueLines.filter((_,i)=>i!==index))}>Remove</button>}
                    </td>
                  </tr>)}
                </tbody>
              </table>
            </div>

            <button className={btn} type="submit">Save Issue to Technician</button>
          </form>
        </section>}

        {tab === "stock" && <section className={`${card} overflow-x-auto`}>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold">Current Stock — Dealer-wise Purchase Balance</h2>
              <p className="mt-1 text-xs text-slate-500">FIFO rule: same part ki sabse purani purchase se issue quantity pehle adjust hoti hai. Sirf available stock wali purchase entries dikhengi.</p>
            </div>
            <div className="flex min-w-[240px] flex-wrap items-center gap-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="current-stock-dealer">Dealer filter</label>
              <select
                id="current-stock-dealer"
                className={`${input} min-w-[190px]`}
                value={currentStockDealer}
                onChange={e => setCurrentStockDealer(e.target.value)}
              >
                <option value="">All Dealers — Full Stock</option>
                {currentStockDealers.map(name => <option key={name} value={name}>{name}</option>)}
              </select>
              {currentStockDealer && <button type="button" className={secondary} onClick={() => setCurrentStockDealer("")}>Clear</button>}
            </div>
          </div>

          <div className="mb-3 grid gap-3 sm:grid-cols-3">
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Available purchase lines</p><p className="text-xl font-bold">{filteredCurrentStockRows.length}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Available quantity</p><p className="text-xl font-bold">{filteredCurrentStockRows.reduce((sum, row) => sum + row.availableQty, 0)}</p></div>
            <div className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">Available stock value</p><p className="text-xl font-bold">{money(filteredCurrentStockRows.reduce((sum, row) => sum + row.availableQty * row.unitCost, 0))}</p></div>
          </div>

          {filteredCurrentStockRows.length === 0 ? (
            <p className="rounded-lg border border-dashed p-8 text-center text-sm text-slate-500">
              {currentStockDealer ? `Is dealer (${currentStockDealer}) ka koi unconsumed stock available nahi hai.` : "Koi unconsumed stock available nahi hai."}
            </p>
          ) : (
            <table className="w-full min-w-[950px] text-left text-sm">
              <thead>
                <tr className="border-b bg-slate-50 text-xs text-slate-600">
                  <th className="p-3">Purchase Date</th>
                  <th className="p-3">Item Name</th>
                  <th className="p-3">Dealer Name</th>
                  <th className="p-3">Purchase Price</th>
                  <th className="p-3">Purchased Qty</th>
                  <th className="p-3">Consumed Qty (FIFO)</th>
                  <th className="p-3">Available Qty</th>
                  <th className="p-3">Available Value</th>
                </tr>
              </thead>
              <tbody>
                {filteredCurrentStockRows.map(row => (
                  <tr key={row.id} className="border-b hover:bg-slate-50">
                    <td className="p-3 whitespace-nowrap">{row.date}</td>
                    <td className="p-3 font-semibold">{row.partName}</td>
                    <td className="p-3">{row.dealer || "—"}</td>
                    <td className="p-3 whitespace-nowrap">{money(row.unitCost)}</td>
                    <td className="p-3">{row.qty}</td>
                    <td className="p-3">{row.consumedQty}</td>
                    <td className="p-3 font-bold text-emerald-700">{row.availableQty}</td>
                    <td className="p-3 whitespace-nowrap">{money(row.availableQty * row.unitCost)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>}

        {tab === "audit" && <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <form onSubmit={addAudit} className={`${card} space-y-3`}><h2 className="text-lg font-bold">Physical stock audit</h2><p className="text-xs text-slate-500">System quantity aur actual count compare karein. Mismatch milne par stock ko chupchaap change nahi kiya jayega.</p><div><label className={label}>Part *</label><select className={input} value={auditPart} onChange={e=>setAuditPart(e.target.value)} required><option value="">Part select karein</option>{partNames.map(p=><option key={p} value={p}>{p} · system {shopQty(p)}</option>)}</select></div><div><label className={label}>Physical quantity counted *</label><input className={input} type="number" min="0" step="0.01" value={physicalQty} onChange={e=>setPhysicalQty(e.target.value)} required /></div><div><label className={label}>Audit date</label><input className={input} type="date" value={auditDate} onChange={e=>setAuditDate(e.target.value)} required /></div><div><label className={label}>Notes / investigation</label><textarea className={input} rows={3} value={auditNotes} onChange={e=>setAuditNotes(e.target.value)} placeholder="Count kisne kiya, mismatch ka reason, etc." /></div>{auditPart && physicalQty!=="" && <div className="rounded-lg bg-slate-50 p-3 text-sm">System: <b>{shopQty(auditPart)}</b> · Physical: <b>{qtyNum(physicalQty)}</b> · Difference: <b className={qtyNum(physicalQty)-shopQty(auditPart)===0?"text-emerald-700":"text-rose-700"}>{qtyNum(physicalQty)-shopQty(auditPart)>0?"+":""}{qtyNum(physicalQty)-shopQty(auditPart)}</b></div>}<button className={btn} type="submit">Save Audit Result</button></form>
          <div className={`${card} overflow-x-auto`}><h2 className="mb-3 text-lg font-bold">Audit results / shortages</h2>{audits.length===0 ? <p className="text-sm text-slate-500">Abhi audit nahi hua.</p> : <table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600"><th className="p-3">Date / Part</th><th className="p-3">System</th><th className="p-3">Physical</th><th className="p-3">Difference</th><th className="p-3">Notes</th></tr></thead><tbody>{audits.map(a=><tr key={a.id} className="border-b"><td className="p-3">{a.date}<p className="font-semibold">{a.partName}</p></td><td className="p-3">{a.systemQty}</td><td className="p-3">{a.physicalQty}</td><td className={`p-3 font-bold ${a.difference<0?"text-rose-700":a.difference>0?"text-emerald-700":""}`}>{a.difference>0?"+":""}{a.difference}</td><td className="p-3">{a.notes || "—"}</td></tr>)}</tbody></table>}</div>
        </section>}

        {tab === "history" && <section className={`${card} overflow-x-auto`}>
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="text-lg font-bold">Append-only correction / activity history</h2><p className="text-xs text-slate-500">Purchase, issue, status aur stock audit actions ka record.</p></div><input className={`${input} sm:max-w-sm`} value={historySearch} onChange={e=>setHistorySearch(e.target.value)} placeholder="Search action, job, part, date..." /></div>
          {filteredLog.length===0 ? <p className="text-sm text-slate-500">Matching history nahi mili.</p> : <table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b bg-slate-50 text-xs text-slate-600"><th className="p-3">Date / time</th><th className="p-3">Action</th><th className="p-3">Reference</th><th className="p-3">Details</th></tr></thead><tbody>{filteredLog.map(l=><tr key={l.id} className="border-b"><td className="p-3">{l.date}<p className="text-xs text-slate-500">{new Date(l.createdAt).toLocaleString("en-IN")}</p></td><td className="p-3 font-semibold">{l.action}</td><td className="p-3">{l.reference}</td><td className="p-3">{l.details}</td></tr>)}</tbody></table>}
        </section>}

      </div>
    </main>
  );
}


