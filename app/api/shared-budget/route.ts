import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { SharedBudgetSection, BudgetItemType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const section = searchParams.get("section") as SharedBudgetSection | null;

  const items = await prisma.sharedBudgetItem.findMany({
    where: section ? { section } : undefined,
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { section, label, amount, type, notes } = body;

  if (!section || !label || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (amount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const item = await prisma.sharedBudgetItem.create({
    data: {
      section: section as SharedBudgetSection,
      label,
      amount: parseFloat(amount),
      type: (type as BudgetItemType) ?? "ONE_TIME",
      notes,
    },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, label, amount, type, notes } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (amount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const item = await prisma.sharedBudgetItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.sharedBudgetItem.update({
    where: { id },
    data: { label, amount: parseFloat(amount), type, notes },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const item = await prisma.sharedBudgetItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.sharedBudgetItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
