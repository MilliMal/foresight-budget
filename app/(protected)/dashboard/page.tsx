"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonthYear, monthName } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

interface DashboardData {
  month: number;
  year: number;
  income: Array<{ userId: string; name: string; gross: number; expenses: number; net: number; jobCount: number }>;
  personal: Array<{ userId: string; name: string; total: number }>;
  sharedTotal: number;
  savingsGoals: Array<{ id: string; label: string; section: string; totalTarget: number; alreadySaved: number; targetDate: string | null }>;
}

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const { month, year } = getCurrentMonthYear();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/dashboard?month=${month}&year=${year}`);
      if (!res.ok) throw new Error("Failed to fetch");
      setData(await res.json());
    } catch {
      toast.error("Could not load dashboard");
    } finally {
      setLoading(false);
    }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const combinedNet = data?.income.reduce((s, u) => s + u.net, 0) ?? 0;
  const combinedPersonal = data?.personal.reduce((s, u) => s + u.total, 0) ?? 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Dashboard</h1>
          <p className="page-subheader">{monthName(month)} {year} overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/jobs")} className="btn-primary text-sm">
            + Log job
          </button>
          <button onClick={() => router.push("/personal")} className="btn-secondary text-sm">
            + Add expense
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Income summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.income.map((u) => (
              <div key={u.userId} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">
                    {u.name[0]}
                  </div>
                  <h2 className="font-semibold text-stone-800">{u.name}</h2>
                  {u.userId === session?.user?.id && (
                    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">You</span>
                  )}
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Jobs this month</dt>
                    <dd className="font-medium">{u.jobCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Gross income</dt>
                    <dd className="font-medium">{formatCurrency(u.gross)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-stone-500">Expenses</dt>
                    <dd className="font-medium text-red-600">−{formatCurrency(u.expenses)}</dd>
                  </div>
                  <div className="flex justify-between pt-1.5 border-t border-stone-100">
                    <dt className="font-semibold text-stone-800">Net income</dt>
                    <dd className={`font-bold text-base ${u.net >= 0 ? "text-teal-700" : "text-red-600"}`}>
                      {formatCurrency(u.net)}
                    </dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Combined summary */}
          <div className="card bg-gradient-to-r from-teal-700 to-teal-800 text-white">
            <h2 className="font-semibold text-teal-100 mb-4">Combined Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-teal-300 text-xs">Combined net income</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(combinedNet)}</p>
              </div>
              <div>
                <p className="text-teal-300 text-xs">Personal expenses</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(combinedPersonal)}</p>
              </div>
              <div>
                <p className="text-teal-300 text-xs">Shared budget total</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(data?.sharedTotal ?? 0)}</p>
              </div>
              <div>
                <p className="text-teal-300 text-xs">Balance after personal</p>
                <p className={`text-2xl font-bold mt-0.5 ${combinedNet - combinedPersonal >= 0 ? "text-white" : "text-red-300"}`}>
                  {formatCurrency(combinedNet - combinedPersonal)}
                </p>
              </div>
            </div>
          </div>

          {/* Personal totals side by side */}
          <div className="card">
            <h2 className="font-semibold text-stone-800 mb-3">Personal Budget Totals</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {data?.personal.map((u) => (
                <div key={u.userId} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center font-bold text-xs">
                      {u.name[0]}
                    </div>
                    <span className="text-sm font-medium text-stone-700">{u.name}</span>
                  </div>
                  <span className="font-semibold text-stone-900">{formatCurrency(u.total)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Savings progress */}
          <div className="card">
            <h2 className="font-semibold text-stone-800 mb-4">Savings Progress</h2>
            {data?.savingsGoals.length === 0 ? (
              <p className="text-stone-400 text-sm">No savings goals yet. Add one in the Savings Calculator.</p>
            ) : (
              <div className="space-y-5">
                {data?.savingsGoals.map((g) => (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-stone-700">{g.label}</span>
                      <span className="text-stone-500">
                        {formatCurrency(g.alreadySaved)} / {formatCurrency(g.totalTarget)}
                      </span>
                    </div>
                    <ProgressBar value={g.alreadySaved} max={g.totalTarget} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
