"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { PageSpinner } from "@/components/ui/Spinner";

interface DebtPayment { id: string; amount: number; date: string; note?: string; }
interface Debt {
  id: string; label: string; creditor?: string; totalAmount: number; amountPaid: number;
  dueDate?: string; notes?: string; isShared: boolean; userId?: string;
  user?: { name: string }; payments: DebtPayment[];
}

interface DebtForm { label: string; creditor: string; totalAmount: string; dueDate: string; notes: string; isShared: boolean; }
interface PaymentForm { amount: string; note: string; date: string; }

function emptyDebtForm(): DebtForm { return { label: "", creditor: "", totalAmount: "", dueDate: "", notes: "", isShared: false }; }
function emptyPaymentForm(): PaymentForm { return { amount: "", note: "", date: new Date().toISOString().slice(0, 10) }; }

const SNOWBALL_TIPS = [
  "List all debts smallest to largest. Pay minimums on all — throw every extra dollar at the smallest. Each payoff builds momentum.",
  "Sell something you don't need. One sale can wipe a small debt entirely and give you a huge psychological win.",
  "When a debt is cleared, roll its minimum payment into the next debt. Your 'debt payment' stays the same — it just gets more powerful.",
  "Don't take on new debt while clearing old ones. Every new debt resets your timeline.",
  "Celebrate each cleared debt. Print the list, cross it off, tell each other. Progress feels good — use that energy.",
];

export default function DebtsPage() {
  const { data: session } = useSession();
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [debtModalOpen, setDebtModalOpen] = useState(false);
  const [paymentModalDebt, setPaymentModalDebt] = useState<Debt | null>(null);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deletePaymentId, setDeletePaymentId] = useState<string | null>(null);
  const [expandedDebt, setExpandedDebt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [debtForm, setDebtForm] = useState<DebtForm>(emptyDebtForm());
  const [paymentForm, setPaymentForm] = useState<PaymentForm>(emptyPaymentForm());
  const [tab, setTab] = useState<"all" | "mine" | "shared">("all");

  const fetchDebts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/debts?scope=${tab}`);
      if (!res.ok) throw new Error();
      setDebts(await res.json());
    } catch { toast.error("Could not load debts"); }
    finally { setLoading(false); }
  }, [tab]);

  useEffect(() => { fetchDebts(); }, [fetchDebts]);

  function openAddDebt() { setEditDebt(null); setDebtForm(emptyDebtForm()); setDebtModalOpen(true); }
  function openEditDebt(d: Debt) {
    setEditDebt(d);
    setDebtForm({ label: d.label, creditor: d.creditor ?? "", totalAmount: String(d.totalAmount), dueDate: d.dueDate ? d.dueDate.slice(0, 10) : "", notes: d.notes ?? "", isShared: d.isShared });
    setDebtModalOpen(true);
  }

  async function handleSaveDebt(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(debtForm.totalAmount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    try {
      const method = editDebt ? "PUT" : "POST";
      const body = { ...(editDebt && { id: editDebt.id }), label: debtForm.label, creditor: debtForm.creditor || null, totalAmount: amt, dueDate: debtForm.dueDate || null, notes: debtForm.notes || null, isShared: debtForm.isShared };
      const res = await fetch("/api/debts", { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editDebt ? "Debt updated" : "Debt added");
      setDebtModalOpen(false);
      fetchDebts();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Save failed"); }
    finally { setSaving(false); }
  }

  async function handleDeleteDebt() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/debts?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Debt deleted");
      setDeleteId(null);
      fetchDebts();
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  }

  async function handleLogPayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentModalDebt) return;
    const amt = parseFloat(paymentForm.amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter a valid amount"); return; }
    const remaining = paymentModalDebt.totalAmount - paymentModalDebt.amountPaid;
    if (amt > remaining + 0.01) { toast.error(`Payment exceeds remaining balance of ${formatCurrency(remaining)}`); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/debt-payments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ debtId: paymentModalDebt.id, amount: amt, note: paymentForm.note || null, date: paymentForm.date }) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success("Payment logged!");
      setPaymentModalDebt(null);
      setPaymentForm(emptyPaymentForm());
      fetchDebts();
    } catch (err: unknown) { toast.error(err instanceof Error ? err.message : "Failed"); }
    finally { setSaving(false); }
  }

  async function handleDeletePayment() {
    if (!deletePaymentId) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/debt-payments?id=${deletePaymentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Payment removed");
      setDeletePaymentId(null);
      fetchDebts();
    } catch { toast.error("Delete failed"); }
    finally { setDeleting(false); }
  }

  const totalOwed = debts.reduce((s, d) => s + d.totalAmount, 0);
  const totalPaid = debts.reduce((s, d) => s + d.amountPaid, 0);
  const totalRemaining = totalOwed - totalPaid;
  const clearedCount = debts.filter(d => d.amountPaid >= d.totalAmount).length;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Debt Tracker</h1>
          <p className="page-subheader">Track, manage, and clear every debt — together</p>
        </div>
        <button onClick={openAddDebt} className="btn-primary">+ Add debt</button>
      </div>

      {/* Snowball tip */}
      <div className="card bg-amber-50 border border-amber-100 mb-5">
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-1">Debt Snowball Wisdom</p>
        <p className="text-sm text-amber-800">{SNOWBALL_TIPS[Math.floor(Date.now() / 86400000) % SNOWBALL_TIPS.length]}</p>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        <div className="card"><p className="text-stone-500 text-xs">Total debts</p><p className="text-2xl font-bold mt-0.5">{debts.length}</p></div>
        <div className="card"><p className="text-stone-500 text-xs">Total owed</p><p className="text-2xl font-bold text-red-600 mt-0.5">{formatCurrency(totalOwed)}</p></div>
        <div className="card"><p className="text-stone-500 text-xs">Paid so far</p><p className="text-2xl font-bold text-teal-700 mt-0.5">{formatCurrency(totalPaid)}</p></div>
        <div className="card"><p className="text-stone-500 text-xs">Remaining</p><p className="text-2xl font-bold text-stone-900 mt-0.5">{formatCurrency(totalRemaining)}</p></div>
      </div>

      {clearedCount > 0 && (
        <div className="card bg-teal-50 border border-teal-100 mb-4 flex items-center gap-3">
          <span className="text-2xl">🎉</span>
          <p className="text-teal-800 text-sm font-medium">{clearedCount} debt{clearedCount > 1 ? "s" : ""} fully cleared! Keep going — you're doing it.</p>
        </div>
      )}

      {/* Tab filter */}
      <div className="flex gap-2 mb-4">
        {(["all", "mine", "shared"] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${tab === t ? "bg-teal-700 text-white" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
            {t === "mine" ? `${session?.user?.name?.split(" ")[0] ?? "Mine"}` : t === "all" ? "All debts" : "Shared"}
          </button>
        ))}
      </div>

      {loading ? <PageSpinner /> : (
        <div className="space-y-3">
          {debts.length === 0 ? (
            <div className="card text-center py-10">
              <p className="text-stone-400 mb-1 text-2xl">🙌</p>
              <p className="text-stone-500 font-medium">No debts here</p>
              <p className="text-stone-400 text-sm mt-1">Add one to start tracking</p>
            </div>
          ) : (
            // Sort: active first (ascending remaining), then cleared
            [...debts].sort((a, b) => {
              const aClear = a.amountPaid >= a.totalAmount;
              const bClear = b.amountPaid >= b.totalAmount;
              if (aClear !== bClear) return aClear ? 1 : -1;
              return (a.totalAmount - a.amountPaid) - (b.totalAmount - b.amountPaid);
            }).map(debt => {
              const remaining = debt.totalAmount - debt.amountPaid;
              const isCleared = remaining <= 0;
              const isExpanded = expandedDebt === debt.id;
              const canEdit = debt.isShared || debt.userId === session?.user?.id;

              return (
                <div key={debt.id} className={`card ${isCleared ? "opacity-70 bg-stone-50" : ""}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`font-semibold ${isCleared ? "line-through text-stone-400" : "text-stone-800"}`}>{debt.label}</span>
                        {isCleared && <span className="text-xs bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">✓ Cleared</span>}
                        {debt.isShared && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">Shared</span>}
                        {!debt.isShared && <span className="text-xs bg-stone-100 text-stone-500 px-2 py-0.5 rounded-full">{debt.user?.name ?? "Personal"}</span>}
                      </div>
                      {debt.creditor && <p className="text-sm text-stone-500 mt-0.5">Owed to: {debt.creditor}</p>}
                      {debt.dueDate && <p className="text-xs text-stone-400 mt-0.5">Due: {new Date(debt.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>}
                      {debt.notes && <p className="text-xs text-stone-400 mt-0.5 italic">{debt.notes}</p>}
                    </div>
                    <div className="text-right shrink-0">
                      <p className={`font-bold text-lg ${isCleared ? "text-teal-600" : "text-red-600"}`}>{formatCurrency(remaining > 0 ? remaining : 0)}</p>
                      <p className="text-xs text-stone-400">of {formatCurrency(debt.totalAmount)}</p>
                    </div>
                  </div>

                  {!isCleared && (
                    <div className="mt-3">
                      <ProgressBar value={debt.amountPaid} max={debt.totalAmount} />
                    </div>
                  )}

                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-stone-50 flex-wrap">
                    {!isCleared && canEdit && (
                      <button onClick={() => { setPaymentModalDebt(debt); setPaymentForm(emptyPaymentForm()); }} className="text-sm bg-teal-700 hover:bg-teal-800 text-white px-3 py-1.5 rounded-lg font-medium transition-colors">
                        Log payment
                      </button>
                    )}
                    {debt.payments.length > 0 && (
                      <button onClick={() => setExpandedDebt(isExpanded ? null : debt.id)} className="text-xs text-stone-400 hover:text-stone-600 transition-colors">
                        {isExpanded ? "Hide" : `${debt.payments.length} payment${debt.payments.length > 1 ? "s" : ""}`}
                      </button>
                    )}
                    <div className="ml-auto flex gap-2">
                      {canEdit && <button onClick={() => openEditDebt(debt)} className="btn-edit">Edit</button>}
                      {canEdit && <button onClick={() => setDeleteId(debt.id)} className="btn-danger">Delete</button>}
                    </div>
                  </div>

                  {isExpanded && debt.payments.length > 0 && (
                    <ul className="mt-3 space-y-1.5 pl-2 border-l-2 border-stone-100">
                      {debt.payments.map(p => (
                        <li key={p.id} className="flex justify-between text-sm text-stone-500">
                          <div>
                            <span>{new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                            {p.note && <span className="text-stone-400 ml-2">— {p.note}</span>}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-teal-600 font-medium">+{formatCurrency(p.amount)}</span>
                            {canEdit && <button onClick={() => setDeletePaymentId(p.id)} className="text-red-400 hover:text-red-600 text-xs transition-colors">✕</button>}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Add/Edit Debt Modal */}
      <Modal open={debtModalOpen} onClose={() => setDebtModalOpen(false)} title={editDebt ? "Edit Debt" : "Add a Debt"}>
        <form onSubmit={handleSaveDebt} className="space-y-4">
          <div>
            <label className="label">What is this debt? <span className="text-red-500">*</span></label>
            <input className="input" value={debtForm.label} onChange={e => setDebtForm(f => ({ ...f, label: e.target.value }))} placeholder="e.g. Car loan, Family loan" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Creditor (who you owe)</label>
              <input className="input" value={debtForm.creditor} onChange={e => setDebtForm(f => ({ ...f, creditor: e.target.value }))} placeholder="e.g. Mom, Bank" />
            </div>
            <div>
              <label className="label">Total amount owed <span className="text-red-500">*</span></label>
              <input type="number" min="0.01" step="0.01" className="input" value={debtForm.totalAmount} onChange={e => setDebtForm(f => ({ ...f, totalAmount: e.target.value }))} placeholder="0.00" required />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Due date (optional)</label>
              <input type="date" className="input" value={debtForm.dueDate} onChange={e => setDebtForm(f => ({ ...f, dueDate: e.target.value }))} />
            </div>
            <div className="flex items-end pb-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={debtForm.isShared} onChange={e => setDebtForm(f => ({ ...f, isShared: e.target.checked }))} className="w-4 h-4 accent-teal-700" />
                <span className="text-sm font-medium text-stone-700">Shared debt (both partners)</span>
              </label>
            </div>
          </div>
          <div>
            <label className="label">Notes</label>
            <input className="input" value={debtForm.notes} onChange={e => setDebtForm(f => ({ ...f, notes: e.target.value }))} placeholder="Any context about this debt" />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setDebtModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">{saving ? "Saving…" : editDebt ? "Save changes" : "Add debt"}</button>
          </div>
        </form>
      </Modal>

      {/* Log Payment Modal */}
      <Modal open={!!paymentModalDebt} onClose={() => setPaymentModalDebt(null)} title={`Log payment — ${paymentModalDebt?.label}`}>
        {paymentModalDebt && (
          <form onSubmit={handleLogPayment} className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-lg text-sm">
              <div className="flex justify-between">
                <span className="text-stone-500">Remaining balance</span>
                <span className="font-semibold text-red-600">{formatCurrency(paymentModalDebt.totalAmount - paymentModalDebt.amountPaid)}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Payment amount <span className="text-red-500">*</span></label>
                <input type="number" min="0.01" step="0.01" className="input" value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))} placeholder="0.00" required />
              </div>
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={paymentForm.date} onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="label">Note (optional)</label>
              <input className="input" value={paymentForm.note} onChange={e => setPaymentForm(f => ({ ...f, note: e.target.value }))} placeholder="e.g. Monthly instalment" />
            </div>
            <div className="flex gap-3 justify-end pt-2">
              <button type="button" onClick={() => setPaymentModalDebt(null)} className="btn-secondary">Cancel</button>
              <button type="submit" disabled={saving} className="btn-primary">{saving ? "Logging…" : "Log payment"}</button>
            </div>
          </form>
        )}
      </Modal>

      <ConfirmDialog open={!!deleteId} message="This debt and all its payment history will be permanently deleted." onConfirm={handleDeleteDebt} onCancel={() => setDeleteId(null)} loading={deleting} />
      <ConfirmDialog open={!!deletePaymentId} message="Remove this payment entry? The debt balance will be recalculated." onConfirm={handleDeletePayment} onCancel={() => setDeletePaymentId(null)} loading={deleting} />
    </div>
  );
}
