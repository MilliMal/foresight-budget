"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonthYear, monthName } from "@/lib/utils";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { PageSpinner } from "@/components/ui/Spinner";

const FIXED_CATEGORIES = [
  { value: "food", label: "Food / Groceries" },
  { value: "clothing", label: "Clothing" },
  { value: "rent", label: "Rent / Housing" },
  { value: "transport", label: "Local Transport" },
  { value: "personal_care", label: "Personal Care" },
  { value: "entertainment", label: "Entertainment" },
  { value: "phone", label: "Phone / Data" },
];

interface BudgetItem {
  id: string;
  category: string;
  label: string;
  amount: number;
}

interface FormState {
  category: string;
  label: string;
  amount: string;
}

export default function PersonalPage() {
  const { data: session } = useSession();
  const { month, year } = getCurrentMonthYear();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editItem, setEditItem] = useState<BudgetItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>({ category: "food", label: "Food / Groceries", amount: "" });

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/personal-budget?month=${month}&year=${year}`);
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("Could not load budget items");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function openAdd() {
    setEditItem(null);
    setForm({ category: "food", label: "Food / Groceries", amount: "" });
    setModalOpen(true);
  }

  function openEdit(item: BudgetItem) {
    setEditItem(item);
    setForm({ category: item.category, label: item.label, amount: String(item.amount) });
    setModalOpen(true);
  }

  function handleCategoryChange(val: string) {
    const fixed = FIXED_CATEGORIES.find((c) => c.value === val);
    setForm((f) => ({ ...f, category: val, label: fixed ? fixed.label : f.label }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.label || !form.amount) return;
    const amount = parseFloat(form.amount);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid amount"); return; }

    setSaving(true);
    try {
      const url = "/api/personal-budget";
      const method = editItem ? "PUT" : "POST";
      const body = editItem
        ? { id: editItem.id, category: form.category, label: form.label, amount }
        : { category: form.category, label: form.label, amount, month, year };

      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(editItem ? "Item updated" : "Item added");
      setModalOpen(false);
      fetchItems();
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
      const res = await fetch(`/api/personal-budget?id=${deleteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Item deleted");
      setDeleteId(null);
      fetchItems();
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleting(false);
    }
  }

  const total = items.reduce((s, i) => s + i.amount, 0);
  const grouped = FIXED_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value),
  }));
  const otherItems = items.filter((i) => !FIXED_CATEGORIES.find((c) => c.value === i.category));

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Personal Budget</h1>
          <p className="page-subheader">{session?.user?.name} — {monthName(month)} {year}</p>
        </div>
        <button onClick={openAdd} className="btn-primary">+ Add expense</button>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* Summary card */}
          <div className="card bg-gradient-to-r from-teal-700 to-teal-800 text-white">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-teal-200 text-sm">Total personal expenses</p>
                <p className="text-3xl font-bold mt-0.5">{formatCurrency(total)}</p>
              </div>
              <p className="text-teal-300 text-sm">{items.length} item{items.length !== 1 ? "s" : ""}</p>
            </div>
          </div>

          {/* Category groups */}
          {grouped.map((cat) => (
            <div key={cat.value} className="card">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-stone-700">{cat.label}</h3>
                <span className="text-sm font-medium text-stone-500">
                  {formatCurrency(cat.items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              {cat.items.length === 0 ? (
                <p className="text-stone-300 text-sm">No entries yet</p>
              ) : (
                <ul className="space-y-2">
                  {cat.items.map((item) => (
                    <li key={item.id} className="flex items-center justify-between text-sm">
                      <span className="text-stone-600">{item.label}</span>
                      <div className="flex items-center gap-3">
                        <span className="font-medium">{formatCurrency(item.amount)}</span>
                        <button onClick={() => openEdit(item)} className="btn-edit">Edit</button>
                        <button onClick={() => setDeleteId(item.id)} className="btn-danger">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Other */}
          <div className="card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-stone-700">Other</h3>
              <span className="text-sm font-medium text-stone-500">
                {formatCurrency(otherItems.reduce((s, i) => s + i.amount, 0))}
              </span>
            </div>
            {otherItems.length === 0 ? (
              <p className="text-stone-300 text-sm">No other expenses</p>
            ) : (
              <ul className="space-y-2">
                {otherItems.map((item) => (
                  <li key={item.id} className="flex items-center justify-between text-sm">
                    <span className="text-stone-600">{item.label}</span>
                    <div className="flex items-center gap-3">
                      <span className="font-medium">{formatCurrency(item.amount)}</span>
                      <button onClick={() => openEdit(item)} className="btn-edit">Edit</button>
                      <button onClick={() => setDeleteId(item.id)} className="btn-danger">Delete</button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title={editItem ? "Edit Expense" : "Add Expense"}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="label">Category</label>
            <select
              className="input"
              value={form.category}
              onChange={(e) => handleCategoryChange(e.target.value)}
            >
              {FIXED_CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
              <option value="other">Other (custom)</option>
            </select>
          </div>
          {form.category === "other" && (
            <div>
              <label className="label">Custom label</label>
              <input
                className="input"
                value={form.label}
                onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="e.g. Gym membership"
                required
              />
            </div>
          )}
          <div>
            <label className="label">Amount (USD)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              className="input"
              value={form.amount}
              onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>
          <div className="flex gap-3 justify-end pt-2">
            <button type="button" onClick={() => setModalOpen(false)} className="btn-secondary">Cancel</button>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? "Saving…" : editItem ? "Save changes" : "Add expense"}
            </button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteId}
        message="This expense will be permanently deleted."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
        loading={deleting}
      />
    </div>
  );
}
