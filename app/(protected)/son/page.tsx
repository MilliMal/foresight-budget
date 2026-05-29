"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { useCurrency } from "@/context/CurrencyContext";
import { SharedBudgetSection, BudgetItem } from "@/components/ui/SharedBudgetSection";
import { PageSpinner } from "@/components/ui/Spinner";

const SUGGESTIONS = [
  { label: "Flight ticket (one-way)", type: "ONE_TIME" as const },
  { label: "Flight ticket (return)", type: "ONE_TIME" as const },
  { label: "School fees (termly)", type: "ONE_TIME" as const },
  { label: "School fees (annual)", type: "ONE_TIME" as const },
  { label: "School supplies / uniform", type: "ONE_TIME" as const },
  { label: "Monthly allowance", type: "MONTHLY" as const },
  { label: "Medical / health insurance", type: "MONTHLY" as const },
  { label: "Visa / travel documents", type: "ONE_TIME" as const },
];

export default function SonPage() {
  const { fmt } = useCurrency();
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/shared-budget?section=SON");
      if (!res.ok) throw new Error();
      setItems(await res.json());
    } catch {
      toast.error("Could not load son budget");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const oneTimeTotal = items.filter((i) => i.type === "ONE_TIME").reduce((s, i) => s + i.amount, 0);
  const monthlyTotal = items.filter((i) => i.type === "MONTHLY").reduce((s, i) => s + i.amount, 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Son&apos;s Relocation</h1>
        <p className="page-subheader">Flight to Rwanda, school fees, and ongoing support</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="card">
              <p className="text-stone-500 text-sm">One-time costs</p>
              <p className="text-2xl font-bold text-stone-900 mt-0.5">{fmt(oneTimeTotal)}</p>
            </div>
            <div className="card">
              <p className="text-stone-500 text-sm">Monthly recurring</p>
              <p className="text-2xl font-bold text-amber-600 mt-0.5">{fmt(monthlyTotal)}/mo</p>
            </div>
          </div>

          <SharedBudgetSection
            title="Son's Relocation Costs"
            section="SON"
            items={items}
            suggestions={SUGGESTIONS}
            onRefresh={fetchItems}
          />
        </div>
      )}
    </div>
  );
}
