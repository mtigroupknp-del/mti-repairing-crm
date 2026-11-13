
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(
  request: NextRequest,
  context: RouteContext
) {
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

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Staff ID missing hai." },
        { status: 400 }
      );
    }

    if (password.length < 8 || password.length > 72) {
      return NextResponse.json(
        {
          success: false,
          message: "Naya password 8 se 72 characters ka hona chahiye.",
        },
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

    if (!staff.user || staff.user.role !== "STAFF") {
      return NextResponse.json(
        {
          success: false,
          message: "Is Staff ka Login Account abhi bana hua nahi hai.",
        },
        { status: 404 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: staff.user!.id },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "STAFF_PASSWORD_RESET",
          targetId: staff.user!.id,
          details: {
            staffId: staff.id,
            staffName: staff.name,
            resetBy: auth.user.username,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Staff ka password successfully reset ho gaya.",
    });
  } catch (error) {
    console.error("Staff password reset error:", error);

    return NextResponse.json(
      {
        success: false,
        message: "Password reset nahi ho paya.",
      },
      { status: 500 }
    );
  }
}
