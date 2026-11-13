import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type RouteContext = { params: Promise<{ id: string }> };
const usernamePattern = /^[a-z0-9._-]{4,30}$/;

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const auth = await requireAdmin();
    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const { id } = await context.params;
    const body = await request.json();
    const username =
      typeof body.username === "string" ? body.username.trim().toLowerCase() : "";
    const password = typeof body.password === "string" ? body.password : "";

    if (!usernamePattern.test(username)) {
      return NextResponse.json(
        { success: false, message: "Username 4-30 characters ka ho: lowercase letters, numbers, dot, underscore ya hyphen." },
        { status: 400 }
      );
    }
    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        { success: false, message: "Password 8 se 72 characters ka hona chahiye." },
        { status: 400 }
      );
    }

    const staff = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!staff) {
      return NextResponse.json(
        { success: false, message: "Staff record nahi mila." },
        { status: 404 }
      );
    }
    if (staff.user) {
      return NextResponse.json(
        { success: false, message: "Is Staff ka login pehle se bana hua hai. Password reset karein." },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (existingUser) {
      return NextResponse.json(
        { success: false, message: "Ye username pehle se use ho raha hai." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: "STAFF",
          isActive: staff.status === "Active",
          staffId: staff.id,
        },
        select: { id: true, username: true, role: true, isActive: true },
      });
      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "STAFF_LOGIN_CREATED",
          targetId: created.id,
          details: { staffId: staff.id, staffName: staff.name, username },
        },
      });
      return created;
    });

    return NextResponse.json({
      success: true,
      message: "Staff login account create ho gaya.",
      user,
    }, { status: 201 });
  } catch (error) {
    console.error("Staff create login error:", error);
    return NextResponse.json(
      { success: false, message: "Staff login account create nahi ho paya." },
      { status: 500 }
    );
  }
}
