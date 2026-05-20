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

  const items = await prisma.personalBudgetItem.findMany({
    where: { userId: session.user.id, month, year },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(items);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { category, label, amount, month, year } = body;

  if (!category || !label || amount == null || !month || !year) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (amount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const item = await prisma.personalBudgetItem.create({
    data: { userId: session.user.id, category, label, amount: parseFloat(amount), month, year },
  });

  return NextResponse.json(item, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, category, label, amount } = body;

  const item = await prisma.personalBudgetItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (amount < 0) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const updated = await prisma.personalBudgetItem.update({
    where: { id },
    data: { category, label, amount: parseFloat(amount) },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const item = await prisma.personalBudgetItem.findUnique({ where: { id } });
  if (!item || item.userId !== session.user.id) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.personalBudgetItem.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
