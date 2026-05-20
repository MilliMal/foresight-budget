"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency, monthsUntil } from "@/lib/utils";
import { SharedBudgetSection, BudgetItem } from "@/components/ui/SharedBudgetSection";
import { PageSpinner } from "@/components/ui/Spinner";

const SECTIONS = [
  {
    key: "WEDDING_TRADITIONAL",
    title: "Traditional Wedding",
    suggestions: [
      { label: "Lobola / Bride price" },
      { label: "Traditional attire (his)" },
      { label: "Traditional attire (hers)" },
      { label: "Venue / tent hire" },
      { label: "Food and catering" },
      { label: "Decor" },
      { label: "Entertainment" },
    ],
  },
  {
    key: "WEDDING_CIVIL",
    title: "Civil / White Wedding",
    suggestions: [
      { label: "Venue hire" },
      { label: "Bridal dress" },
      { label: "Groom suit" },
      { label: "Flowers and decor" },
      { label: "Catering" },
      { label: "Photography / Videography" },
      { label: "Wedding cake" },
      { label: "Rings" },
      { label: "Officiant fee" },
      { label: "Invitations" },
    ],
  },
  {
    key: "WEDDING_TRANSPORT",
    title: "Transportation & Logistics",
    suggestions: [
      { label: "Guest flight tickets" },
      { label: "Guest accommodation" },
      { label: "Car hire on the day" },
    ],
  },
];

export default function WeddingPage() {
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [targetDate, setTargetDate] = useState("");

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      const [t, c, tr] = await Promise.all([
        fetch("/api/shared-budget?section=WEDDING_TRADITIONAL").then((r) => r.json()),
        fetch("/api/shared-budget?section=WEDDING_CIVIL").then((r) => r.json()),
        fetch("/api/shared-budget?section=WEDDING_TRANSPORT").then((r) => r.json()),
      ]);
      setItems([...t, ...c, ...tr]);
    } catch {
      toast.error("Could not load wedding budget");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  const grandTotal = items.reduce((s, i) => s + i.amount, 0);
  const monthlyRequired = targetDate
    ? (grandTotal / monthsUntil(new Date(targetDate))).toFixed(2)
    : null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="page-header">Wedding Budget</h1>
        <p className="page-subheader">Plan your traditional and civil wedding expenses together</p>
      </div>

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="space-y-4">
          {/* Grand total */}
          <div className="card bg-gradient-to-r from-teal-700 to-teal-800 text-white">
            <div className="flex flex-col sm:flex-row justify-between gap-4">
              <div>
                <p className="text-teal-200 text-sm">Grand total</p>
                <p className="text-3xl font-bold mt-0.5">{formatCurrency(grandTotal)}</p>
              </div>
              <div className="flex items-end gap-3">
                <div>
                  <p className="text-teal-200 text-xs mb-1">Target wedding date</p>
                  <input
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    className="bg-teal-800 border border-teal-600 text-white rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                {monthlyRequired && (
                  <div>
                    <p className="text-teal-200 text-xs">Monthly savings needed</p>
                    <p className="text-xl font-bold">{formatCurrency(parseFloat(monthlyRequired))}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {SECTIONS.map((sec) => (
            <SharedBudgetSection
              key={sec.key}
              title={sec.title}
              section={sec.key}
              items={items.filter((i) => i.section === sec.key)}
              suggestions={sec.suggestions}
              onRefresh={fetchItems}
            />
          ))}
        </div>
      )}
    </div>
  );
}
