"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { SharedBudgetSection, BudgetItem } from "@/components/ui/SharedBudgetSection";
import { PageSpinner } from "@/components/ui/Spinner";

const SUGGESTIONS = [
  { label: "House deposit + first month rent", type: "ONE_TIME" as const },
  { label: "Furniture and household items", type: "ONE_TIME" as const },
  { label: "Kitchen setup", type: "ONE_TIME" as const },
  { label: "Utilities setup fee", type: "ONE_TIME" as const },
  { label: "Emergency fund target", type: "ONE_TIME" as const },
  { label: "Monthly food / groceries", type: "MONTHLY" as const },
  { label: "Monthly clothing", type: "MONTHLY" as const },
  { label: "Monthly utilities", type: "MONTHLY" as const },
];

export default function RelocationPage() {
  const { fmt } = useCurrency();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shared-budget?section=RELOCATION");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("Could not load relocation budget");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const setupTotal = items.filter((i) => i.type === "ONE_TIME").reduce((s, i) => s + i.amount, 0);
  const monthlyTotal = items.filter((i) => i.type === "MONTHLY").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Relocation Budget</h1>
        <p className="page-subheader">Setting up your shared home together</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-stone-500 text-sm">Setup / one-time costs</p>
              <p className="text-2xl font-bold text-stone-900 mt-0.5">{fmt(setupTotal)}</p>
            </div>
            <div className="card">
              <p className="text-stone-500 text-sm">Monthly recurring</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{fmt(monthlyTotal)}/mo</p>
            </div>
          </div>

          <SharedBudgetSection
            title="New Home Costs"
            section="RELOCATION"
            items={items}
            suggestions={SUGGESTIONS}
            onRefresh={fetchItems}
          />
        </div>
      )}
    </div>
  );
}
