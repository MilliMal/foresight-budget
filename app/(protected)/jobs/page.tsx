"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { getCurrentMonthYear, monthName } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { PageSpinner } from "@/components/ui/Spinner";

const WORK_TYPES = ["Hair braiding", "Hair colouring", "Hair styling", "Nails", "Other"];
const STATUS_LABELS: Record<string, string> = { PAID: "Paid", PENDING: "Pending", PARTIAL: "Partial" };
const STATUS_COLORS: Record<string, string> = {
  PAID: "bg-teal-100 text-teal-700",
  PENDING: "bg-amber-100 text-amber-700",
  PARTIAL: "bg-orange-100 text-orange-700",
};

interface Expense { id: string; label: string; amount: number; }
interface Job {
  id: string;
  date: string;
  clientName?: string;
  workType: string;
  grossAmount: number;
  status: "PAID" | "PENDING" | "PARTIAL";
  notes?: string;
  expenses: Expense[];
}

interface JobForm {
  date: string;
  clientName: string;
  workType: string;
  customWorkType: string;
  grossAmount: string;
  status: "PAID" | "PENDING" | "PARTIAL";
  notes: string;
  expenses: Array<{ label: string; amount: string }>;
}

function emptyForm(): JobForm {
  return {
    date: new Date().toISOString().slice(0, 10),
    clientName: "",
    workType: "Hair braiding",
    customWorkType: "",
    grossAmount: "",
    status: "PENDING",
    notes: "",
    expenses: [],
  };
}

export default function JobsPage() {
  const { fmt } = useCurrency();
  const { data: session } = useSession();
  const { month, year } = getCurrentMonthYear();
  const [filterMonth, setFilterMonth] = useState(month);
  const [filterYear] = useState(year);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editJob, setEditJob] = useState<Job | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [expandedJob, setExpandedJob] = useState<string | null>(null);
  const [form, setForm] = useState<JobForm>(emptyForm());

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/jobs?month=${filterMonth}&year=${filterYear}`);
      if (!res.ok) throw new Error();
      setJobs(await res.json());
    } catch {
      toast.error("Could not load jobs");
    } finally {
      setLoading(false);
    }
  }, [filterMonth, filterYear]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  function openAdd() {
    setEditJob(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(job: Job) {
    setEditJob(job);
    const isCustom = !WORK_TYPES.slice(0, -1).includes(job.workType);
    setForm({
      date: job.date.slice(0, 10),
      clientName: job.clientName ?? "",
      workType: isCustom ? "Other" : job.workType,
      customWorkType: isCustom ? job.workType : "",
      grossAmount: String(job.grossAmount),
      status: job.status,
      notes: job.notes ?? "",
      expenses: job.expenses.map((e) => ({ label: e.label, amount: String(e.amount) })),
    });
    setModalOpen(true);
  }

  function addExpenseRow() {
    setForm((f) => ({ ...f, expenses: [...f.expenses, { label: "", amount: "" }] }));
  }

  function updateExpense(i: number, field: "label" | "amount", val: string) {
    setForm((f) => {
      const exps = [...f.expenses];
      exps[i] = { ...exps[i], [field]: val };
      return { ...f, expenses: exps };
    });
  }

  function removeExpense(i: number) {
    setForm((f) => ({ ...f, expenses: f.expenses.filter((_, idx) => idx !== i) }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const gross = parseFloat(form.grossAmount);
    if (isNaN(gross) || gross < 0) { toast.error("Enter a valid amount"); return; }
    const workType = form.workType === "Other" ? form.customWorkType : form.workType;
    if (!workType) { toast.error("Enter a work type"); return; }
    const expenses = form.expenses
      .filter((ex) => ex.label && ex.amount)
      .map((ex) => ({ label: ex.label, amount: parseFloat(ex.amount) }));
    if (expenses.some((ex) => ex.amount < 0)) { toast.error("Expense amounts cannot be negative"); return; }

    setSaving(true);
    try {
      if (editJob) {
        const res = await fetch("/api/jobs", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: editJob.id, date: form.date, clientName: form.clientName || null, workType, grossAmount: gross, status: form.status, notes: form.notes || null }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      } else {
        const res = await fetch("/api/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: form.date, clientName: form.clientName || null, workType, grossAmount: gross, status: form.status, notes: form.notes || null, expenses }),
        });
        if (!res.ok) throw new Error((await res.json()).error);
      }
      toast.success(editJob ? "Job updated" : "Job logged");
      setModalOpen(false);
      fetchJobs();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/jobs?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Job deleted");
      setDeleteId(null);
      fetchJobs();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const grossTotal = jobs.reduce((s, j) => s + j.grossAmount, 0);
  const expensesTotal = jobs.reduce((s, j) => s + j.expenses.reduce((es, e) => es + e.amount, 0), 0);
  const netTotal = grossTotal - expensesTotal;

  const months = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Jobs</h1>
          <p className="page-subheader">{session?.user?.name}&apos;s income tracker</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Log job</button>
      </div>

      {/* Month filter */}
      <div className="flex items-center gap-3 mb-5">
        <label className="text-sm text-stone-600 font-medium">Month:</label>
        <select
          className="input w-auto"
          value={filterMonth}
          onChange={(e) => setFilterMonth(parseInt(e.target.value))}
        >
          {months.map((m) => (
            <option key={m} value={m}>{monthName(m)}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="card">
              <p className="text-stone-500 text-xs">Jobs</p>
              <p className="text-2xl font-bold mt-0.5">{jobs.length}</p>
            </div>
            <div className="card">
              <p className="text-stone-500 text-xs">Gross income</p>
              <p className="text-2xl font-bold mt-0.5 text-stone-900">{fmt(grossTotal)}</p>
            </div>
            <div className="card">
              <p className="text-stone-500 text-xs">Expenses</p>
              <p className="text-2xl font-bold mt-0.5 text-red-600">{fmt(expensesTotal)}</p>
            </div>
            <div className="card">
              <p className="text-stone-500 text-xs">Net income</p>
              <p className={`text-2xl font-bold mt-0.5 ${netTotal >= 0 ? "text-teal-700" : "text-red-600"}`}>
                {fmt(netTotal)}
              </p>
            </div>
          </div>

          {/* Jobs list */}
          {jobs.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-stone-400 mb-3">No jobs logged for {monthName(filterMonth)} {filterYear}</p>
              <button onClick={openAdd} className="btn-primary">Log your first job</button>
            </div>
          ) : (
            <div className="space-y-3">
              {jobs.map((job) => {
                const jobExpenses = job.expenses.reduce((s, e) => s + e.amount, 0);
                const jobNet = job.grossAmount - jobExpenses;
                const isExpanded = expandedJob === job.id;
                return (
                  <div key={job.id} className="card">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-stone-800">{job.workType}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[job.status]}`}>
                            {STATUS_LABELS[job.status]}
                          </span>
                        </div>
                        <p className="text-sm text-stone-500 mt-0.5">
                          {new Date(job.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                          {job.clientName && ` · ${job.clientName}`}
                        </p>
                        {job.notes && <p className="text-xs text-stone-400 mt-0.5">{job.notes}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-bold text-teal-700">{fmt(jobNet)}</p>
                        {jobExpenses > 0 && (
                          <p className="text-xs text-stone-400">{fmt(job.grossAmount)} − {fmt(jobExpenses)}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-50">
                      {job.expenses.length > 0 && (
                        <button
                          onClick={() => setExpandedJob(isExpanded ? null : job.id)}
                          className="text-xs text-stone-400 hover:text-stone-600 transition-colors"
                        >
                          {isExpanded ? "Hide" : `${job.expenses.length} expense${job.expenses.length > 1 ? "s" : ""}`}
                        </button>
                      )}
                      <div className="ml-auto flex gap-2">
                        <button onClick={() => openEdit(job)} className="btn-edit">Edit</button>
                        <button onClick={() => setDeleteId(job.id)} className="btn-danger">Delete</button>
                      </div>
                    </div>

                    {isExpanded && job.expenses.length > 0 && (
                      <ul className="mt-3 space-y-1 pl-2 border-l-2 border-stone-100">
                        {job.expenses.map((exp) => (
                          <li key={exp.id} className="flex justify-between text-sm text-stone-500">
                            <span>{exp.label}</span>
                            <span className="text-red-500">−{fmt(exp.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editJob ? "Edit Job" : "Log a Job"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Date</label>
              <input type="date" className="input" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
            </div>
            <div>
              <label className="label">Status</label>
              <select className="input" value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as Job["status"] }))}>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending</option>
                <option value="PARTIAL">Partial</option>
              </select>
            </div>
          </div>

          <div>
            <label className="label">Work type</label>
            <select className="input" value={form.workType} onChange={(e) => setForm((f) => ({ ...f, workType: e.target.value }))}>
              {WORK_TYPES.map((t) => <option key={t}>{t}</option>)}
            </select>
          </div>

          {form.workType === "Other" && (
            <div>
              <label className="label">Describe the work</label>
              <input className="input" value={form.customWorkType} onChange={(e) => setForm((f) => ({ ...f, customWorkType: e.target.value }))} placeholder="e.g. Wig installation" required />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Amount charged (USD)</label>
              <input type="number" min="0" step="0.01" className="input" value={form.grossAmount} onChange={(e) => setForm((f) => ({ ...f, grossAmount: e.target.value }))} placeholder="0.00" required />
            </div>
            <div>
              <label className="label">Client name (optional)</label>
              <input className="input" value={form.clientName} onChange={(e) => setForm((f) => ({ ...f, clientName: e.target.value }))} placeholder="e.g. Sandra" />
            </div>
          </div>

          <div>
            <label className="label">Notes (optional)</label>
            <input className="input" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} placeholder="Any additional notes" />
          </div>

          {/* Expenses — only shown for new jobs */}
          {!editJob && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="label mb-0">Material expenses</label>
                <button type="button" onClick={addExpenseRow} className="text-xs text-teal-700 hover:text-teal-900 font-medium">+ Add expense</button>
              </div>
              {form.expenses.length === 0 && (
                <p className="text-xs text-stone-400">No expenses — all income is net income.</p>
              )}
              {form.expenses.map((exp, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <input className="input flex-1" value={exp.label} onChange={(e) => updateExpense(i, "label", e.target.value)} placeholder="e.g. Hair dye" />
                  <input type="number" min="0" step="0.01" className="input w-24" value={exp.amount} onChange={(e) => updateExpense(i, "amount", e.target.value)} placeholder="0.00" />
                  <button type="button" onClick={() => removeExpense(i)} className="text-red-400 hover:text-red-600 px-2">✕</button>
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editJob ? "Save changes" : "Log job"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="This job and all its expenses will be permanently deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
