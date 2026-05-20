import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const count = await prisma.user.count();
  return NextResponse.json({ setupRequired: count === 0 });
}

export async function POST(req: NextRequest) {
  const count = await prisma.user.count();
  if (count > 0) {
    return NextResponse.json({ error: "Setup already completed" }, { status: 400 });
  }

  const body = await req.json();
  const { users } = body as {
    users: Array<{ name: string; email: string; pin: string }>;
  };

  if (!users || users.length !== 2) {
    return NextResponse.json({ error: "Exactly 2 users required" }, { status: 400 });
  }

  for (const u of users) {
    if (!u.name || !u.email || !u.pin) {
      return NextResponse.json({ error: "All fields required for each user" }, { status: 400 });
    }
    if (!/^\d{4}$/.test(u.pin)) {
      return NextResponse.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
    }
  }

  const createdUsers = await Promise.all(
    users.map(async (u) => {
      const hashedPin = await bcrypt.hash(u.pin, 12);
      return prisma.user.create({
        data: { name: u.name, email: u.email, hashedPin },
      });
    })
  );

  const defaultGoals = [
    { label: "Wedding Fund", section: "wedding", totalTarget: 15000, alreadySaved: 0 },
    { label: "Son's Relocation", section: "son", totalTarget: 5000, alreadySaved: 0 },
    { label: "New Home Setup", section: "relocation", totalTarget: 10000, alreadySaved: 0 },
  ];

  await prisma.savingsGoal.createMany({ data: defaultGoals });

  return NextResponse.json(
    { success: true, users: createdUsers.map((u) => ({ id: u.id, name: u.name, email: u.email })) },
    { status: 201 }
  );
}
