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

  // Debts summary + this month's payments
  const allDebts = await prisma.debt.findMany({ include: { payments: true } });
  const debtSummary = {
    totalOwed: allDebts.reduce((s, d) => s + d.totalAmount, 0),
    totalPaid: allDebts.reduce((s, d) => s + d.amountPaid, 0),
    count: allDebts.length,
    cleared: allDebts.filter(d => d.amountPaid >= d.totalAmount).length,
  };

  // Debt payments made this month, per user and shared
  const monthlyDebtPayments = await prisma.debtPayment.findMany({
    where: { date: { gte: start, lte: end } },
    include: { debt: true },
  });

  const debtPaymentsByUser = await Promise.all(
    users.map(async (u) => {
      const personal = monthlyDebtPayments
        .filter(p => p.debt.userId === u.id && !p.debt.isShared)
        .reduce((s, p) => s + p.amount, 0);
      return { userId: u.id, name: u.name, debtPayments: personal };
    })
  );
  const sharedDebtPaymentsThisMonth = monthlyDebtPayments
    .filter(p => p.debt.isShared)
    .reduce((s, p) => s + p.amount, 0);

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
    weddingGoal: weddingGoal ?? null,
  });
}
