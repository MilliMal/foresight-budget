import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = parseInt(searchParams.get("month") ?? String(new Date().getMonth() + 1));
  const year = parseInt(searchParams.get("year") ?? String(new Date().getFullYear()));

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59);

  const users = await prisma.user.findMany({ select: { id: true, name: true } });

  const jobsByUser = await Promise.all(
    users.map(async (u) => {
      const jobs = await prisma.job.findMany({
        where: { userId: u.id, date: { gte: start, lte: end } },
        include: { expenses: true },
      });
      const gross = jobs.reduce((s, j) => s + j.grossAmount, 0);
      const expenses = jobs.reduce(
        (s, j) => s + j.expenses.reduce((es, e) => es + e.amount, 0),
        0
      );
      return { userId: u.id, name: u.name, gross, expenses, net: gross - expenses, jobCount: jobs.length };
    })
  );

  const personalByUser = await Promise.all(
    users.map(async (u) => {
      const items = await prisma.personalBudgetItem.findMany({
        where: { userId: u.id, month, year },
      });
      const total = items.reduce((s, i) => s + i.amount, 0);
      return { userId: u.id, name: u.name, total };
    })
  );

  const sharedItems = await prisma.sharedBudgetItem.findMany();

  const sharedBySection = {
    wedding: sharedItems
      .filter(i => ["WEDDING_TRADITIONAL", "WEDDING_CIVIL", "WEDDING_TRANSPORT"].includes(i.section))
      .reduce((s, i) => s + i.amount, 0),
    weddingOneTime: sharedItems
      .filter(i => ["WEDDING_TRADITIONAL", "WEDDING_CIVIL", "WEDDING_TRANSPORT"].includes(i.section) && i.type === "ONE_TIME")
      .reduce((s, i) => s + i.amount, 0),
    weddingMonthly: sharedItems
      .filter(i => ["WEDDING_TRADITIONAL", "WEDDING_CIVIL", "WEDDING_TRANSPORT"].includes(i.section) && i.type === "MONTHLY")
      .reduce((s, i) => s + i.amount, 0),
    son: sharedItems.filter(i => i.section === "SON").reduce((s, i) => s + i.amount, 0),
    sonOneTime: sharedItems.filter(i => i.section === "SON" && i.type === "ONE_TIME").reduce((s, i) => s + i.amount, 0),
    sonMonthly: sharedItems.filter(i => i.section === "SON" && i.type === "MONTHLY").reduce((s, i) => s + i.amount, 0),
    relocation: sharedItems.filter(i => i.section === "RELOCATION").reduce((s, i) => s + i.amount, 0),
    relocationOneTime: sharedItems.filter(i => i.section === "RELOCATION" && i.type === "ONE_TIME").reduce((s, i) => s + i.amount, 0),
    relocationMonthly: sharedItems.filter(i => i.section === "RELOCATION" && i.type === "MONTHLY").reduce((s, i) => s + i.amount, 0),
  };
  const sharedTotal = sharedBySection.wedding + sharedBySection.son + sharedBySection.relocation;

  const savingsGoals = await prisma.savingsGoal.findMany();

  // Debts — summary + required monthly repayments based on due dates
  const allDebts = await prisma.debt.findMany();
  const debtSummary = {
    totalOwed: allDebts.reduce((s, d) => s + d.totalAmount, 0),
    totalPaid: allDebts.reduce((s, d) => s + d.amountPaid, 0),
    count: allDebts.length,
    cleared: allDebts.filter(d => d.amountPaid >= d.totalAmount).length,
  };

  const now = new Date();

  function monthsUntilDate(date: Date): number {
    const months =
      (date.getFullYear() - now.getFullYear()) * 12 +
      (date.getMonth() - now.getMonth());
    return Math.max(1, months);
  }

  function requiredMonthlyRepayment(debt: { totalAmount: number; amountPaid: number; dueDate: Date | null }): number {
    const remaining = debt.totalAmount - debt.amountPaid;
    if (remaining <= 0) return 0;
    if (!debt.dueDate) return 0; // no due date = no scheduled repayment
    return remaining / monthsUntilDate(debt.dueDate);
  }

  const activeDebts = allDebts.filter(d => d.amountPaid < d.totalAmount);

  const debtPaymentsByUser = users.map(u => {
    const userDebts = activeDebts.filter(d => d.userId === u.id && !d.isShared);
    const monthlyRepayment = userDebts.reduce((s, d) => s + requiredMonthlyRepayment(d), 0);
    const debtLines = userDebts
      .filter(d => d.dueDate && (d.totalAmount - d.amountPaid) > 0)
      .map(d => ({
        id: d.id,
        label: d.label,
        remaining: d.totalAmount - d.amountPaid,
        monthlyAmount: requiredMonthlyRepayment(d),
        dueDate: d.dueDate,
      }));
    return { userId: u.id, name: u.name, debtPayments: monthlyRepayment, debtLines };
  });

  const sharedActiveDebts = activeDebts.filter(d => d.isShared);
  const sharedDebtPaymentsThisMonth = sharedActiveDebts.reduce(
    (s, d) => s + requiredMonthlyRepayment(d),
    0
  );
  const sharedDebtLines = sharedActiveDebts
    .filter(d => d.dueDate && (d.totalAmount - d.amountPaid) > 0)
    .map(d => ({
      id: d.id,
      label: d.label,
      remaining: d.totalAmount - d.amountPaid,
      monthlyAmount: requiredMonthlyRepayment(d),
      dueDate: d.dueDate,
    }));

  // Wedding goal specifically for income calculator
  const weddingGoal = savingsGoals.find(g => g.section === "wedding");

  return NextResponse.json({
    month,
    year,
    income: jobsByUser,
    personal: personalByUser,
    sharedTotal,
    sharedBySection,
    savingsGoals,
    debtSummary,
    debtPaymentsByUser,
    sharedDebtPaymentsThisMonth,
    sharedDebtLines,
    weddingGoal: weddingGoal ?? null,
  });
}
