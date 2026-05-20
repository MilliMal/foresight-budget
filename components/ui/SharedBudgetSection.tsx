"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { formatCurrency } from "@/lib/utils";
import { Modal } from "./Modal";
import { ConfirmDialog } from "./ConfirmDialog";

export interface BudgetItem {
  id: string;
  section: string;
  label: string;
  amount: number;
  type: "ONE_TIME" | "MONTHLY";
  notes?: string;
}

interface SuggestionItem {
  label: string;
  type?: "ONE_TIME" | "MONTHLY";
}

interface Props {
  title: string;
  section: string;
  items: BudgetItem[];
  suggestions: SuggestionItem[];
  onRefresh: () => void;
  collapsed?: boolean;
}

interface FormState {
  label: string;
  amount: string;
  type: "ONE_TIME" | "MONTHLY";
  notes: string;
}

export function SharedBudgetSection({ title, section, items, suggestions, onRefresh, collapsed: initialCollapsed = false }: Props) {
  const [open, setOpen] = useState(!initialCollapsed);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState<FormState>({ label: "", amount: "", type: "ONE_TIME", notes: "" });

  const total = items.reduce((s, i) => s + i.amount, 0);

  function openAdd(suggestion?: SuggestionItem) {
    setEditItem(null);
    setForm({
      label: suggestion?.label ?? "",
      amount: "",
      type: suggestion?.type ?? "ONE_TIME",
      notes: "",
    });
    setModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditItem(item);
    setForm({ label: item.label, amount: String(item.amount), type: item.type, notes: item.notes ?? "" });
    setModalOpen(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const amount = parseFloat(form.amount);
    if (!form.label || isNaN(amount) || amount < 0) {
      toast.error("Please enter a valid label and amount");
      return;
    }
    setSaving(true);
    try {
      const url = "/api/shared-budget";
      const method = editItem ? "PUT" : "POST";
      const body = editItem
        ? { id: editItem.id, label: form.label, amount, type: form.type, notes: form.notes || null }
        : { section, label: form.label, amount, type: form.type, notes: form.notes || null };

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editItem ? "Updated" : "Added");
      setModalOpen(false);
      onRefresh();
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
      const res = await fetch(`/api/shared-budget?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      setDeleteId(null);
      onRefresh();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="card">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between group"
      >
        <h2 className="font-semibold text-stone-800 group-hover:text-teal-700 transition-colors">{title}</h2>
        <div className="flex items-center gap-3">
          <span className="font-bold text-teal-700">{formatCurrency(total)}</span>
          <span className="text-stone-400 text-sm">{open ? "▲" : "▼"}</span>
        </div>
      </button>

      {open && (
        <div className="mt-4">
          {items.length === 0 ? (
            <p className="text-stone-400 text-sm mb-3">No items yet.</p>
          ) : (
            <ul className="space-y-2 mb-4">
              {items.map((item) => (
                <li key={item.id} className="flex items-start justify-between text-sm gap-2">
                  <div className="flex-1 min-w-0">
                    <span className="text-stone-700">{item.label}</span>
                    {item.notes && <p className="text-xs text-stone-400 truncate">{item.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${item.type === "MONTHLY" ? "bg-amber-50 text-amber-700" : "bg-stone-100 text-stone-500"}`}>
                      {item.type === "MONTHLY" ? "Monthly" : "One-time"}
                    </span>
                    <span className="font-medium w-20 text-right">{formatCurrency(item.amount)}</span>
                    <button onClick={() => openEdit(item)} className="btn-edit">Edit</button>
                    <button onClick={() => setDeleteId(item.id)} className="btn-danger">Delete</button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {/* Suggestions */}
          {suggestions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-medium text-stone-400 mb-2 uppercase tracking-wide">Quick add</p>
              <div className="flex flex-wrap gap-2">
                {suggestions
                  .filter((s) => !items.find((i) => i.label === s.label))
                  .map((s) => (
                    <button
                      key={s.label}
                      onClick={() => openAdd(s)}
                      className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 px-3 py-1.5 rounded-full transition-colors border border-teal-100"
                    >
                      + {s.label}
                    </button>
                  ))}
              </div>
            </div>
          )}

          <button onClick={() => openAdd()} className="btn-secondary text-sm w-full">
            + Add custom item
          </button>
        </div>
      )}

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Edit Item" : `Add to ${title}`}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Label</label>
            <input
              className="input"
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="e.g. Venue deposit"
              required
            />
          </div>
          <div>
            <label className="label">Amount (USD)</label>
            <input
              type="number" min="0" step="0.01"
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div>
            <label className="label">Type</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as "ONE_TIME" | "MONTHLY" }))}
            >
              <option value="ONE_TIME">One-time cost</option>
              <option value="MONTHLY">Monthly recurring</option>
            </select>
          </div>
          <div>
            <label className="label">Notes (optional)</label>
            <input
              className="input"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="e.g. per person, includes setup"
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editItem ? "Save changes" : "Add item"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="This budget item will be permanently deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
