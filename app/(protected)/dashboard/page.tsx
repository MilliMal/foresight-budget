"use client";

import { useEffect, useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { formatCurrency, getCurrentMonthYear, monthName, monthsUntil } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/ProgressBar";
import { SkeletonCard } from "@/components/ui/SkeletonCard";

const JARS = [
  { key: "tithe",    label: "Tithe",    pct: 10, color: "bg-purple-500",  desc: "Give back to God / church" },
  { key: "giving",   label: "Giving",   pct: 10, color: "bg-pink-500",    desc: "Help others, bless people" },
  { key: "saving",   label: "Saving",   pct: 10, color: "bg-teal-500",    desc: "Emergency fund & short-term" },
  { key: "invest",   label: "Investing",pct: 20, color: "bg-amber-500",   desc: "Wedding & future goals" },
  { key: "spending", label: "Spending", pct: 50, color: "bg-stone-400",   desc: "Living expenses" },
];

interface SavingsGoal { id: string; label: string; section: string; totalTarget: number; alreadySaved: number; targetDate: string | null; }
interface SharedBySection {
  wedding: number; weddingOneTime: number; weddingMonthly: number;
  son: number; sonOneTime: number; sonMonthly: number;
  relocation: number; relocationOneTime: number; relocationMonthly: number;
}
interface DashboardData {
  month: number; year: number;
  income: Array<{ userId: string; name: string; gross: number; expenses: number; net: number; jobCount: number }>;
  personal: Array<{ userId: string; name: string; total: number }>;
  sharedTotal: number;
  sharedBySection: SharedBySection;
  savingsGoals: SavingsGoal[];
  debtSummary: { totalOwed: number; totalPaid: number; count: number; cleared: number };
  debtPaymentsByUser: Array<{
    userId: string; name: string; debtPayments: number;
    debtLines: Array<{ id: string; label: string; remaining: number; monthlyAmount: number; dueDate: string }>;
  }>;
  sharedDebtPaymentsThisMonth: number;
  sharedDebtLines: Array<{ id: string; label: string; remaining: number; monthlyAmount: number; dueDate: string }>;
  weddingGoal: SavingsGoal | null;
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
    } catch { toast.error("Could not load dashboard"); }
    finally { setLoading(false); }
  }, [month, year]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const combinedNet = data?.income.reduce((s, u) => s + u.net, 0) ?? 0;
  const combinedPersonal = data?.personal.reduce((s, u) => s + u.total, 0) ?? 0;
  const combinedDebtPayments = (data?.debtPaymentsByUser.reduce((s, u) => s + u.debtPayments, 0) ?? 0) + (data?.sharedDebtPaymentsThisMonth ?? 0);
  const totalMonthlyExpenses = combinedPersonal + combinedDebtPayments;

  // Wedding income calculator
  const wg = data?.weddingGoal;
  const weddingRemaining = wg ? Math.max(0, wg.totalTarget - wg.alreadySaved) : 0;
  const weddingMonths = wg?.targetDate ? monthsUntil(new Date(wg.targetDate)) : null;
  const weddingMonthlyNeeded = weddingMonths && weddingRemaining > 0 ? weddingRemaining / weddingMonths : null;
  // 10% saving + 20% investing = 30% of income goes to wedding
  const requiredMonthlyIncome = weddingMonthlyNeeded ? weddingMonthlyNeeded / 0.30 : null;
  const incomeSurplus = requiredMonthlyIncome ? combinedNet - requiredMonthlyIncome : null;

  return (
    <div>
      {/* Anchor scripture */}
      <div className="mb-6 rounded-2xl bg-gradient-to-br from-teal-900 via-teal-800 to-teal-700 p-5 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-5 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMzAiIGN5PSIzMCIgcj0iMjgiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS13aWR0aD0iMSIvPjwvc3ZnPg==')]" />
        <div className="relative">
          <p className="text-sm font-medium text-teal-300 mb-1 uppercase tracking-widest">Our Anchor</p>
          <blockquote className="text-lg md:text-xl font-semibold text-white leading-snug mb-2">
            &ldquo;Now to him who is able to do immeasurably more than all we ask or imagine, according to his power that is at work within us&rdquo;
          </blockquote>
          <p className="text-teal-300 font-medium">— Ephesians 3:20</p>
        </div>
      </div>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="page-header">Dashboard</h1>
          <p className="page-subheader">{monthName(month)} {year} overview</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => router.push("/jobs")} className="btn-primary text-sm">+ Log job</button>
          <button onClick={() => router.push("/personal")} className="btn-secondary text-sm">+ Expense</button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : (
        <div className="space-y-5">

          {/* Income by partner */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data?.income.map(u => (
              <div key={u.userId} className="card">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center font-bold text-sm">{u.name[0]}</div>
                  <h2 className="font-semibold text-stone-800">{u.name}</h2>
                  {u.userId === session?.user?.id && <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">You</span>}
                </div>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between"><dt className="text-stone-500">Jobs</dt><dd className="font-medium">{u.jobCount}</dd></div>
                  <div className="flex justify-between"><dt className="text-stone-500">Gross income</dt><dd className="font-medium">{formatCurrency(u.gross)}</dd></div>
                  <div className="flex justify-between"><dt className="text-stone-500">Expenses</dt><dd className="font-medium text-red-600">−{formatCurrency(u.expenses)}</dd></div>
                  <div className="flex justify-between pt-1.5 border-t border-stone-100">
                    <dt className="font-semibold text-stone-800">Net income</dt>
                    <dd className={`font-bold text-base ${u.net >= 0 ? "text-teal-700" : "text-red-600"}`}>{formatCurrency(u.net)}</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>

          {/* Combined income vs costs overview */}
          <div className="card bg-gradient-to-r from-teal-700 to-teal-800 text-white">
            <h2 className="font-semibold text-teal-100 mb-4">Combined Summary — {monthName(month)}</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div>
                <p className="text-teal-300 text-xs">Combined net income</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(combinedNet)}</p>
              </div>
              <div>
                <p className="text-teal-300 text-xs">Monthly expenses</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(totalMonthlyExpenses)}</p>
                <div className="mt-1 space-y-0.5">
                  <p className="text-teal-400 text-xs">Personal: {formatCurrency(combinedPersonal)}</p>
                  {combinedDebtPayments > 0 && (
                    <p className="text-teal-400 text-xs">Debt payments: {formatCurrency(combinedDebtPayments)}</p>
                  )}
                </div>
              </div>
              <div>
                <p className="text-teal-300 text-xs">All shared costs</p>
                <p className="text-2xl font-bold mt-0.5">{formatCurrency(data?.sharedTotal ?? 0)}</p>
              </div>
              <div>
                <p className="text-teal-300 text-xs">Left after expenses</p>
                <p className={`text-2xl font-bold mt-0.5 ${combinedNet - totalMonthlyExpenses >= 0 ? "text-white" : "text-red-300"}`}>
                  {formatCurrency(combinedNet - totalMonthlyExpenses)}
                </p>
              </div>
            </div>
          </div>

          {/* Costs breakdown by page/section */}
          {data?.sharedBySection && (
            <div className="card">
              <h2 className="font-semibold text-stone-800 mb-4">Costs by Category</h2>
              <div className="space-y-3">

                {/* Monthly expenses = personal spending + scheduled debt repayments */}
                <div className="rounded-xl border border-stone-100 overflow-hidden">
                  <div className="flex items-center justify-between px-4 py-3 bg-stone-50">
                    <div className="flex items-center gap-2">
                      <span className="text-base">👤</span>
                      <span className="font-medium text-stone-700">Monthly expenses</span>
                      <span className="text-xs text-stone-400">{monthName(month)}</span>
                    </div>
                    <span className="font-bold text-stone-900">{formatCurrency(totalMonthlyExpenses)}</span>
                  </div>

                  {(data.personal ?? []).map(u => {
                    const debtRow = data.debtPaymentsByUser?.find(d => d.userId === u.userId);
                    const debtAmt = debtRow?.debtPayments ?? 0;
                    const userTotal = u.total + debtAmt;
                    return (
                      <div key={u.userId} className="border-t border-stone-100">
                        {/* Per-person header */}
                        <div className="flex justify-between items-center px-4 pt-3 pb-1 text-sm">
                          <span className="font-semibold text-stone-700">{u.name}</span>
                          <span className="font-bold text-stone-900">{formatCurrency(userTotal)}</span>
                        </div>
                        {/* Personal spending line */}
                        <div className="flex justify-between items-center px-4 py-1 text-sm">
                          <button onClick={() => router.push("/personal")} className="flex items-center gap-2 text-stone-500 hover:text-teal-700 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-stone-300 inline-block" />
                            Personal spending
                          </button>
                          <span className="text-stone-600">{formatCurrency(u.total)}</span>
                        </div>
                        {/* One line per debt */}
                        {(debtRow?.debtLines ?? []).map(dl => (
                          <div key={dl.id} className="flex justify-between items-center px-4 py-1 text-sm">
                            <button onClick={() => router.push("/debts")} className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors">
                              <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />
                              {dl.label}
                              <span className="text-xs text-stone-400">/ {Math.round((new Date(dl.dueDate).getFullYear() - new Date().getFullYear()) * 12 + (new Date(dl.dueDate).getMonth() - new Date().getMonth()))}mo</span>
                            </button>
                            <span className="text-red-600 font-medium">{formatCurrency(dl.monthlyAmount)}</span>
                          </div>
                        ))}
                        <div className="pb-2" />
                      </div>
                    );
                  })}

                  {/* Shared debt repayments */}
                  {data.sharedDebtPaymentsThisMonth > 0 && (
                    <div className="border-t border-stone-100 pt-2 pb-2">
                      <div className="flex justify-between items-center px-4 py-1 text-sm font-semibold text-stone-700">
                        <span>Shared</span>
                        <span className="text-stone-900">{formatCurrency(data.sharedDebtPaymentsThisMonth)}</span>
                      </div>
                      {(data.sharedDebtLines ?? []).map(dl => (
                        <div key={dl.id} className="flex justify-between items-center px-4 py-1 text-sm">
                          <button onClick={() => router.push("/debts")} className="flex items-center gap-2 text-red-500 hover:text-red-700 transition-colors">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block" />
                            {dl.label}
                            <span className="text-xs text-stone-400">/ {Math.round((new Date(dl.dueDate).getFullYear() - new Date().getFullYear()) * 12 + (new Date(dl.dueDate).getMonth() - new Date().getMonth()))}mo</span>
                          </button>
                          <span className="text-red-600 font-medium">{formatCurrency(dl.monthlyAmount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Wedding */}
                <div className="rounded-xl border border-stone-100 overflow-hidden">
                  <button onClick={() => router.push("/wedding")} className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base">💍</span>
                      <span className="font-medium text-stone-700">Wedding budget</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-stone-900">{formatCurrency(data.sharedBySection.wedding)}</span>
                      <span className="text-stone-400 text-xs">→</span>
                    </div>
                  </button>
                  {data.sharedBySection.wedding > 0 && (
                    <div className="grid grid-cols-2 divide-x divide-stone-50 border-t border-stone-50">
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">One-time costs</span>
                        <span className="font-medium text-stone-700">{formatCurrency(data.sharedBySection.weddingOneTime)}</span>
                      </div>
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">Monthly recurring</span>
                        <span className="font-medium text-amber-600">{formatCurrency(data.sharedBySection.weddingMonthly)}/mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Son */}
                <div className="rounded-xl border border-stone-100 overflow-hidden">
                  <button onClick={() => router.push("/son")} className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base">✈️</span>
                      <span className="font-medium text-stone-700">Son&apos;s relocation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-stone-900">{formatCurrency(data.sharedBySection.son)}</span>
                      <span className="text-stone-400 text-xs">→</span>
                    </div>
                  </button>
                  {data.sharedBySection.son > 0 && (
                    <div className="grid grid-cols-2 divide-x divide-stone-50 border-t border-stone-50">
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">One-time costs</span>
                        <span className="font-medium text-stone-700">{formatCurrency(data.sharedBySection.sonOneTime)}</span>
                      </div>
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">Monthly recurring</span>
                        <span className="font-medium text-amber-600">{formatCurrency(data.sharedBySection.sonMonthly)}/mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Relocation */}
                <div className="rounded-xl border border-stone-100 overflow-hidden">
                  <button onClick={() => router.push("/relocation")} className="w-full flex items-center justify-between px-4 py-3 bg-stone-50 hover:bg-stone-100 transition-colors text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-base">🏡</span>
                      <span className="font-medium text-stone-700">New home / relocation</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-bold text-stone-900">{formatCurrency(data.sharedBySection.relocation)}</span>
                      <span className="text-stone-400 text-xs">→</span>
                    </div>
                  </button>
                  {data.sharedBySection.relocation > 0 && (
                    <div className="grid grid-cols-2 divide-x divide-stone-50 border-t border-stone-50">
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">Setup / one-time</span>
                        <span className="font-medium text-stone-700">{formatCurrency(data.sharedBySection.relocationOneTime)}</span>
                      </div>
                      <div className="px-4 py-2 text-sm">
                        <span className="text-stone-400 text-xs block">Monthly recurring</span>
                        <span className="font-medium text-amber-600">{formatCurrency(data.sharedBySection.relocationMonthly)}/mo</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Grand total row */}
                <div className="flex items-center justify-between px-4 py-3 bg-stone-900 rounded-xl text-white">
                  <span className="font-semibold text-sm">Total costs tracked</span>
                  <span className="font-bold text-lg">{formatCurrency(combinedPersonal + (data?.sharedTotal ?? 0))}</span>
                </div>
              </div>
            </div>
          )}

          {/* 5 Jars allocation */}
          {combinedNet > 0 && (
            <div className="card">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">🫙</span>
                <h2 className="font-semibold text-stone-800">5 Jars Allocation</h2>
              </div>
              <p className="text-xs text-stone-400 mb-4">How your {formatCurrency(combinedNet)} combined net income should be divided this month</p>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
                {JARS.map(jar => {
                  const amount = (combinedNet * jar.pct) / 100;
                  return (
                    <div key={jar.key} className="text-center p-3 bg-stone-50 rounded-xl border border-stone-100">
                      <div className={`w-10 h-10 rounded-full ${jar.color} mx-auto mb-2 flex items-center justify-center text-white font-bold text-sm`}>{jar.pct}%</div>
                      <p className="font-semibold text-stone-800 text-sm">{jar.label}</p>
                      <p className="text-teal-700 font-bold mt-0.5">{formatCurrency(amount)}</p>
                      <p className="text-xs text-stone-400 mt-1 leading-tight">{jar.desc}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <p className="text-xs text-amber-800">
                  <strong>Wedding strategy:</strong> Your Saving (10%) + Investing (20%) jars = <strong>{formatCurrency(combinedNet * 0.30)}/month</strong> toward your wedding. That&apos;s 30% of every dollar you earn working toward your big day.
                </p>
              </div>
            </div>
          )}

          {/* Required monthly income calculator */}
          {weddingMonthlyNeeded && (
            <div className={`card border-2 ${incomeSurplus !== null && incomeSurplus >= 0 ? "border-teal-200 bg-teal-50" : "border-amber-200 bg-amber-50"}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">💍</span>
                <h2 className="font-semibold text-stone-800">Wedding Income Target</h2>
                {wg?.targetDate && (
                  <span className="text-xs text-stone-500 ml-auto">{weddingMonths} month{weddingMonths !== 1 ? "s" : ""} to go</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
                <div className="bg-white rounded-lg p-3">
                  <p className="text-stone-400 text-xs">Wedding remaining</p>
                  <p className="font-bold text-stone-900 text-lg mt-0.5">{formatCurrency(weddingRemaining)}</p>
                </div>
                <div className="bg-white rounded-lg p-3">
                  <p className="text-stone-400 text-xs">Monthly savings needed</p>
                  <p className="font-bold text-amber-600 text-lg mt-0.5">{formatCurrency(weddingMonthlyNeeded)}</p>
                  <p className="text-xs text-stone-400">(30% of required income)</p>
                </div>
                <div className={`rounded-lg p-3 ${incomeSurplus !== null && incomeSurplus >= 0 ? "bg-teal-100" : "bg-red-50"}`}>
                  <p className="text-stone-400 text-xs">Required combined income</p>
                  <p className={`font-bold text-lg mt-0.5 ${incomeSurplus !== null && incomeSurplus >= 0 ? "text-teal-800" : "text-red-600"}`}>{formatCurrency(requiredMonthlyIncome!)}</p>
                  {incomeSurplus !== null && (
                    <p className={`text-xs mt-0.5 font-medium ${incomeSurplus >= 0 ? "text-teal-700" : "text-red-600"}`}>
                      {incomeSurplus >= 0 ? `✓ You're ${formatCurrency(incomeSurplus)} above target` : `↑ ${formatCurrency(Math.abs(incomeSurplus))} gap to close`}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Savings progress */}
          <div className="card">
            <h2 className="font-semibold text-stone-800 mb-4">Savings Progress</h2>
            {!data?.savingsGoals.length ? (
              <p className="text-stone-400 text-sm">No savings goals yet.</p>
            ) : (
              <div className="space-y-4">
                {data.savingsGoals.map(g => (
                  <div key={g.id}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-stone-700">{g.label}</span>
                      <span className="text-stone-500">{formatCurrency(g.alreadySaved)} / {formatCurrency(g.totalTarget)}</span>
                    </div>
                    <ProgressBar value={g.alreadySaved} max={g.totalTarget} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Debt snapshot */}
          {data?.debtSummary && data.debtSummary.count > 0 && (
            <div className="card cursor-pointer hover:border-stone-200 transition-colors border border-stone-100" onClick={() => router.push("/debts")}>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-stone-800">Debt Snapshot</h2>
                <span className="text-xs text-teal-700 font-medium">View all →</span>
              </div>
              <div className="grid grid-cols-3 gap-3 text-sm">
                <div><p className="text-stone-400 text-xs">Total owed</p><p className="font-bold text-red-600">{formatCurrency(data.debtSummary.totalOwed)}</p></div>
                <div><p className="text-stone-400 text-xs">Paid off</p><p className="font-bold text-teal-700">{formatCurrency(data.debtSummary.totalPaid)}</p></div>
                <div><p className="text-stone-400 text-xs">Cleared</p><p className="font-bold text-stone-900">{data.debtSummary.cleared}/{data.debtSummary.count}</p></div>
              </div>
              <div className="mt-3">
                <ProgressBar value={data.debtSummary.totalPaid} max={data.debtSummary.totalOwed} />
              </div>
            </div>
          )}


        </div>
      )}
    </div>
  );
}
