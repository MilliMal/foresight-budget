import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const goals = await prisma.savingsGoal.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(goals);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { label, section, totalTarget, alreadySaved, targetDate } = body;

  if (!label || !section || totalTarget == null) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }
  if (totalTarget < 0 || (alreadySaved != null && alreadySaved < 0)) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.create({
    data: {
      label,
      section,
      totalTarget: parseFloat(totalTarget),
      alreadySaved: alreadySaved ? parseFloat(alreadySaved) : 0,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });

  return NextResponse.json(goal, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { id, label, section, totalTarget, alreadySaved, targetDate } = body;

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  if (totalTarget < 0 || (alreadySaved != null && alreadySaved < 0)) {
    return NextResponse.json({ error: "Amount cannot be negative" }, { status: 400 });
  }

  const goal = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.savingsGoal.update({
    where: { id },
    data: {
      label,
      section,
      totalTarget: parseFloat(totalTarget),
      alreadySaved: alreadySaved != null ? parseFloat(alreadySaved) : undefined,
      targetDate: targetDate ? new Date(targetDate) : null,
    },
  });

  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const goal = await prisma.savingsGoal.findUnique({ where: { id } });
  if (!goal) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.savingsGoal.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
