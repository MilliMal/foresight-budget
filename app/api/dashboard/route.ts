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
  const sharedTotal = sharedItems.reduce((s, i) => s + i.amount, 0);

  const savingsGoals = await prisma.savingsGoal.findMany();

  return NextResponse.json({
    month,
    year,
    income: jobsByUser,
    personal: personalByUser,
    sharedTotal,
    savingsGoals,
  });
}
