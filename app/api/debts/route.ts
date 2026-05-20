import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const scope = searchParams.get("scope"); // "mine" | "shared" | "all"

  const debts = await prisma.debt.findMany({
    where:
      scope === "shared"
        ? { isShared: true }
        : scope === "mine"
        ? { userId: session.user.id, isShared: false }
        : {
            OR: [{ isShared: true }, { userId: session.user.id }],
          },
    include: { payments: { orderBy: { date: "desc" } }, user: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(debts);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, creditor, totalAmount, dueDate, notes, isShared } = body;

  if (!label || totalAmount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (totalAmount <= 0) {
    return NextResponse.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }

  const debt = await prisma.debt.create({
    data: {
      userId: isShared ? null : session.user.id,
      label,
      creditor: creditor || null,
      totalAmount: parseFloat(totalAmount),
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
      isShared: !!isShared,
    },
    include: { payments: true, user: { select: { name: true } } },
  });

  return NextResponse.json(debt, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, label, creditor, totalAmount, dueDate, notes } = body;
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const debt = await prisma.debt.findUnique({ where: { id } });
  if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!debt.isShared && debt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const updated = await prisma.debt.update({
    where: { id },
    data: {
      label,
      creditor: creditor || null,
      totalAmount: parseFloat(totalAmount),
      dueDate: dueDate ? new Date(dueDate) : null,
      notes: notes || null,
    },
    include: { payments: true, user: { select: { name: true } } },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const debt = await prisma.debt.findUnique({ where: { id } });
  if (!debt) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!debt.isShared && debt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.debt.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
