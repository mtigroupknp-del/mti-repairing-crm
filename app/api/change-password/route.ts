
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifySessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get("mti_session")?.value;

    if (!token) {
      return NextResponse.json(
        { success: false, message: "Pehle login karein." },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { success: false, message: "Session expire ho gaya. Dobara login karein." },
        { status: 401 }
      );
    }

    const body = await request.json();

    const currentPassword =
      typeof body.currentPassword === "string"
        ? body.currentPassword
        : "";

    const newPassword =
      typeof body.newPassword === "string"
        ? body.newPassword
        : "";

    if (!currentPassword || newPassword.length < 8 || newPassword.length > 72) {
      return NextResponse.json(
        {
          success: false,
          message: "Current password bharein aur naya password 8-72 characters ka rakhein.",
        },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        username: true,
        role: true,
        passwordHash: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { success: false, message: "Active account nahi mila." },
        { status: 401 }
      );
    }

    const validPassword = await bcrypt.compare(
      currentPassword,
      user.passwordHash
    );

    if (!validPassword) {
      return NextResponse.json(
        { success: false, message: "Current password galat hai." },
        { status: 401 }
      );
    }

    const samePassword = await bcrypt.compare(
      newPassword,
      user.passwordHash
    );

    if (samePassword) {
      return NextResponse.json(
        { success: false, message: "Naya password purane password se alag rakhein." },
        { status: 400 }
      );
    }

    const passwordHash = await bcrypt.hash(newPassword, 12);

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await tx.auditLog.create({
        data: {
          actorId: user.id,
          action: "PASSWORD_CHANGED",
          targetId: user.id,
          details: {
            username: user.username,
            role: user.role,
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Password successfully change ho gaya.",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return NextResponse.json(
      { success: false, message: "Password change nahi ho paya." },
      { status: 500 }
    );
  }
}
