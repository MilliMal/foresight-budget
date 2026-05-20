import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { JobStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month");
  const year = searchParams.get("year");

  let dateFilter = {};
  if (month && year) {
    const start = new Date(parseInt(year), parseInt(month) - 1, 1);
    const end = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
    dateFilter = { date: { gte: start, lte: end } };
  }

  const jobs = await prisma.job.findMany({
    where: { userId: session.user.id, ...dateFilter },
    include: { expenses: true },
    orderBy: { date: "desc" },
  });

  return NextResponse.json(jobs);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { date, clientName, workType, grossAmount, status, notes, expenses } = body;

  if (!date || !workType || grossAmount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (grossAmount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const job = await prisma.job.create({
    data: {
      userId: session.user.id,
      date: new Date(date),
      clientName,
      workType,
      grossAmount: parseFloat(grossAmount),
      status: (status as JobStatus) ?? "PENDING",
      notes,
      expenses: expenses?.length
        ? {
            create: expenses.map((e: { label: string; amount: number }) => ({
              label: e.label,
              amount: parseFloat(String(e.amount)),
            })),
          }
        : undefined,
    },
    include: { expenses: true },
  });

  return NextResponse.json(job, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, date, clientName, workType, grossAmount, status, notes } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (grossAmount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const updated = await prisma.job.update({
    where: { id },
    data: {
      date: date ? new Date(date) : undefined,
      clientName,
      workType,
      grossAmount: parseFloat(grossAmount),
      status: status as JobStatus,
      notes,
    },
    include: { expenses: true },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
