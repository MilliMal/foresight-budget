"use client";

import { useEffect, useState, useCallback } from "react";
import toast from "react-hot-toast";
import { formatCurrency, monthsUntil } from "@/lib/utils";
import { SharedBudgetSection, BudgetItem } from "@/components/ui/SharedBudgetSection";
import { PageSpinner } from "@/components/ui/Spinner";

const SIX_MONTH_PLAN = [
  { month: "Month 1", title: "Lock your non-negotiables", color: "bg-purple-100 text-purple-800 border-purple-200", tips: ["Set a hard budget ceiling before booking anything", "Pick one date — don't leave it open, it delays every other decision", "Use your Saving (10%) + Investing (20%) jars = 30% of income goes here every month, no exceptions"] },
  { month: "Month 2", title: "Book venue & officiant", color: "bg-teal-100 text-teal-800 border-teal-200", tips: ["Venues and officiants book out fast — do these first", "Pay deposits only, keep receipts for everything", "Start the shared budget in this app so both of you see the same numbers in real time"] },
  { month: "Month 3", title: "Outfits, rings & catering", color: "bg-amber-100 text-amber-800 border-amber-200", tips: ["Order the dress now — alterations take 6–8 weeks minimum", "Get 3 catering quotes and lock one in with a written agreement", "Buy rings together — it's symbolic and keeps the budget honest"] },
  { month: "Month 4", title: "Photography, decor & transport", color: "bg-pink-100 text-pink-800 border-pink-200", tips: ["Book a photographer whose work you've seen — don't gamble on this", "DIY decor saves significantly; decide which elements are worth paying for", "Coordinate guest transport now to avoid last-minute chaos"] },
  { month: "Month 5", title: "Invitations & final confirmations", color: "bg-blue-100 text-blue-800 border-blue-200", tips: ["Send invitations and get RSVPs — final headcount drives final catering cost", "Confirm all vendors with written confirmations and payment schedules", "Do a budget review: are you on track? Adjust the guest list if needed, not the savings"] },
  { month: "Month 6", title: "Final payments & enjoy", color: "bg-green-100 text-green-800 border-green-200", tips: ["Clear all outstanding vendor balances in the first two weeks", "Give your wedding party their final briefing", "Trust your preparation. Ephesians 3:20 — He does more than you can imagine."] },
];

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
  const [showWisdom, setShowWisdom] = useState(false);

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

          {/* 6-Month Wisdom Plan */}
          <div className="card">
            <button
              onClick={() => setShowWisdom(w => !w)}
              className="w-full flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">💡</span>
                <div className="text-left">
                  <h2 className="font-semibold text-stone-800 group-hover:text-teal-700 transition-colors">6-Month Wedding Plan</h2>
                  <p className="text-xs text-stone-400">Practical wisdom for couples planning fast</p>
                </div>
              </div>
              <span className="text-stone-400 text-sm">{showWisdom ? "▲" : "▼"}</span>
            </button>

            {showWisdom && (
              <div className="mt-5 space-y-4">
                <div className="p-4 bg-teal-50 rounded-xl border border-teal-100">
                  <p className="text-sm text-teal-800 font-medium mb-1">The 30% rule for a 6-month wedding</p>
                  <p className="text-sm text-teal-700">
                    Using the 5 Jars system: put your <strong>Saving jar (10%) + Investing jar (20%) = 30%</strong> of combined income toward the wedding every month — automatically, before spending anything else. In 6 months at that discipline, every dollar you earn is working for your day.
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {SIX_MONTH_PLAN.map(step => (
                    <div key={step.month} className={`rounded-xl border p-4 ${step.color}`}>
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs font-bold uppercase tracking-wide opacity-70">{step.month}</span>
                        <span className="font-semibold text-sm">{step.title}</span>
                      </div>
                      <ul className="space-y-1">
                        {step.tips.map((tip, i) => (
                          <li key={i} className="text-xs flex gap-1.5">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{tip}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 text-sm text-amber-800">
                  <strong>Remember:</strong> A wedding is one day. A marriage is a lifetime. Keep the budget honest with each other — financial stress before a wedding is common, but secrecy makes it worse. This app keeps you both looking at the same numbers. Use it.
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
