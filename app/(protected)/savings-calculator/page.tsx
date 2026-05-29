"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { monthsUntil } from "@/lib/utils";
import { useCurrency } from "@/context/CurrencyContext";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageSpinner } from "@/components/ui/Spinner";

interface SavingsGoal {
  id: string;
  label: string;
  section: string;
  totalTarget: number;
  alreadySaved: number;
  targetDate: string | null;
}

interface GoalForm {
  label: string;
  section: string;
  totalTarget: string;
  alreadySaved: string;
  targetDate: string;
}

function emptyForm(): GoalForm {
  return { label: "", section: "wedding", totalTarget: "", alreadySaved: "0", targetDate: "" };
}

const SECTION_LABELS: Record<string, string> = {
  wedding: "Wedding",
  son: "Son's Relocation",
  relocation: "New Home Setup",
  other: "Other",
};

export default function SavingsCalculatorPage() {
  const { fmt } = useCurrency();
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<SavingsGoal | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<GoalForm>(emptyForm());
  const [combinedNet, setCombinedNet] = useState<number | null>(null);

  const fetchGoals = useCallback(async () => {
    setLoading(true);
    try {
      const [goalsRes, dashRes] = await Promise.all([
        fetch("/api/savings-goals"),
        fetch("/api/dashboard"),
      ]);
      if (!goalsRes.ok) throw new Error();
      setGoals(await goalsRes.json());
      if (dashRes.ok) {
        const dash = await dashRes.json();
        setCombinedNet(dash.income.reduce((s: number, u: { net: number }) => s + u.net, 0));
      }
    } catch {
      toast.error("Could not load savings goals");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchGoals(); }, [fetchGoals]);

  function openAdd() {
    setEditGoal(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditGoal(goal);
    setForm({
      label: goal.label,
      section: goal.section,
      totalTarget: String(goal.totalTarget),
      alreadySaved: String(goal.alreadySaved),
      targetDate: goal.targetDate ? goal.targetDate.slice(0, 10) : "",
    });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const total = parseFloat(form.totalTarget);
    const saved = parseFloat(form.alreadySaved);
    if (isNaN(total) || total < 0 || isNaN(saved) || saved < 0) {
      toast.error("Enter valid amounts");
      return;
    }
    setSaving(true);
    try {
      const url = "/api/savings-goals";
      const method = editGoal ? "PUT" : "POST";
      const body = {
        ...(editGoal && { id: editGoal.id }),
        label: form.label,
        section: form.section,
        totalTarget: total,
        alreadySaved: saved,
        targetDate: form.targetDate || null,
      };
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editGoal ? "Goal updated" : "Goal added");
      setModalOpen(false);
      fetchGoals();
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
      const res = await fetch(`/api/savings-goals?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Goal deleted");
      setDeleteId(null);
      fetchGoals();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  function monthlyRequired(goal: SavingsGoal): number | null {
    if (!goal.targetDate) return null;
    const remaining = goal.totalTarget - goal.alreadySaved;
    if (remaining <= 0) return 0;
    return remaining / monthsUntil(new Date(goal.targetDate));
  }

  const totalMonthlyRequired = goals.reduce((s, g) => {
    const m = monthlyRequired(g);
    return s + (m ?? 0);
  }, 0);

  const surplus = combinedNet !== null ? combinedNet - totalMonthlyRequired : null;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Savings Calculator</h1>
          <p className="page-subheader">Track goals and see how much to save each month</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add goal</button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* Combined summary */}
          {totalMonthlyRequired > 0 && (
            <div className={`card ${surplus !== null && surplus >= 0 ? "bg-gradient-to-r from-teal-700 to-teal-800" : "bg-gradient-to-r from-red-700 to-red-800"} text-white`}>
              <h2 className="text-sm font-medium opacity-80 mb-3">Combined Monthly Savings Target</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <p className="text-xs opacity-70">Total monthly savings needed</p>
                  <p className="text-2xl font-bold mt-0.5">{fmt(totalMonthlyRequired)}</p>
                </div>
                {combinedNet !== null && (
                  <>
                    <div>
                      <p className="text-xs opacity-70">Combined net income (this month)</p>
                      <p className="text-2xl font-bold mt-0.5">{fmt(combinedNet)}</p>
                    </div>
                    <div>
                      <p className="text-xs opacity-70">{surplus !== null && surplus >= 0 ? "Monthly surplus" : "Shortfall"}</p>
                      <p className="text-2xl font-bold mt-0.5">
                        {surplus !== null ? fmt(Math.abs(surplus)) : "—"}
                      </p>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Goal cards */}
          {goals.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-stone-400 mb-3">No savings goals yet</p>
              <button onClick={openAdd} className="btn-primary">Create your first goal</button>
            </div>
          ) : (
            goals.map((goal) => {
              const monthly = monthlyRequired(goal);
              const pct = goal.totalTarget > 0 ? Math.min(100, (goal.alreadySaved / goal.totalTarget) * 100) : 0;
              const remaining = goal.totalTarget - goal.alreadySaved;
              return (
                <div key={goal.id} className="card">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h3 className="font-semibold text-stone-800">{goal.label}</h3>
                      <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                        {SECTION_LABELS[goal.section] ?? goal.section}
                      </span>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => openEdit(goal)} className="btn-edit">Edit</button>
                      <button onClick={() => setDeleteId(goal.id)} className="btn-danger">Delete</button>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-stone-500">Progress</span>
                      <span className="text-stone-600">{fmt(goal.alreadySaved)} / {fmt(goal.totalTarget)}</span>
                    </div>
                    <ProgressBar value={goal.alreadySaved} max={goal.totalTarget} />
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div className="bg-stone-50 rounded-lg p-2.5">
                      <p className="text-stone-400 text-xs">Remaining</p>
                      <p className="font-semibold text-stone-800 mt-0.5">{fmt(Math.max(0, remaining))}</p>
                    </div>
                    <div className="bg-stone-50 rounded-lg p-2.5">
                      <p className="text-stone-400 text-xs">Saved so far</p>
                      <p className="font-semibold text-teal-700 mt-0.5">{pct.toFixed(0)}%</p>
                    </div>
                    {goal.targetDate && (
                      <div className="bg-stone-50 rounded-lg p-2.5">
                        <p className="text-stone-400 text-xs">Target date</p>
                        <p className="font-semibold text-stone-800 mt-0.5">
                          {new Date(goal.targetDate).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                        </p>
                      </div>
                    )}
                    {monthly !== null && (
                      <div className={`rounded-lg p-2.5 ${monthly === 0 ? "bg-teal-50" : "bg-amber-50"}`}>
                        <p className={`text-xs ${monthly === 0 ? "text-teal-600" : "text-amber-600"}`}>Monthly needed</p>
                        <p className={`font-semibold mt-0.5 ${monthly === 0 ? "text-teal-700" : "text-amber-700"}`}>
                          {monthly === 0 ? "Goal reached! 🎉" : fmt(monthly)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editGoal ? "Edit Savings Goal" : "New Savings Goal"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Goal name</label>
            <input className="input" value={form.label} onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))} placeholder="e.g. Wedding fund" required />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))}>
              <option value="wedding">Wedding</option>
              <option value="son">Son&apos;s Relocation</option>
              <option value="relocation">New Home Setup</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Total target (USD)</label>
              <input type="number" min="0" step="0.01" className="input" value={form.totalTarget} onChange={(e) => setForm((f) => ({ ...f, totalTarget: e.target.value }))} placeholder="15000" required />
            </div>
            <div>
              <label className="label">Already saved (USD)</label>
              <input type="number" min="0" step="0.01" className="input" value={form.alreadySaved} onChange={(e) => setForm((f) => ({ ...f, alreadySaved: e.target.value }))} placeholder="0" />
            </div>
          </div>
          <div>
            <label className="label">Target date (optional)</label>
            <input type="date" className="input" value={form.targetDate} onChange={(e) => setForm((f) => ({ ...f, targetDate: e.target.value }))} />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editGoal ? "Save changes" : "Add goal"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="This savings goal will be permanently deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
