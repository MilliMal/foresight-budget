import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Called daily by Vercel Cron — keeps the Supabase free-tier project awake
// so it never auto-pauses from inactivity.
export async function GET(req: NextRequest) {
  // Verify this is called by Vercel Cron, not a random visitor
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userCount = await prisma.user.count();
    return NextResponse.json({
      ok: true,
      ts: new Date().toISOString(),
      users: userCount,
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    );
  }
}
