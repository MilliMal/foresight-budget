import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { debtId, amount, note, date } = body;

  if (!debtId || amount == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "Payment must be greater than 0" }, { status: 400 });
  }

  const debt = await prisma.debt.findUnique({ where: { id: debtId } });
  if (!debt) return NextResponse.json({ error: "Debt not found" }, { status: 404 });
  if (!debt.isShared && debt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const payment = await prisma.debtPayment.create({
    data: {
      debtId,
      amount: parseFloat(amount),
      note: note || null,
      date: date ? new Date(date) : new Date(),
    },
  });

  // Update amountPaid on the debt
  const allPayments = await prisma.debtPayment.findMany({ where: { debtId } });
  const totalPaid = allPayments.reduce((s, p) => s + p.amount, 0);
  await prisma.debt.update({
    where: { id: debtId },
    data: { amountPaid: Math.min(totalPaid, debt.totalAmount) },
  });

  return NextResponse.json(payment, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const payment = await prisma.debtPayment.findUnique({
    where: { id },
    include: { debt: true },
  });
  if (!payment) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!payment.debt.isShared && payment.debt.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.debtPayment.delete({ where: { id } });

  // Recalculate amountPaid
  const remaining = await prisma.debtPayment.findMany({ where: { debtId: payment.debtId } });
  const totalPaid = remaining.reduce((s, p) => s + p.amount, 0);
  await prisma.debt.update({
    where: { id: payment.debtId },
    data: { amountPaid: totalPaid },
  });

  return NextResponse.json({ success: true });
}
