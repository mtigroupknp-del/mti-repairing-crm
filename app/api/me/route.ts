
import { NextResponse, connection } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/require-user";

export async function GET() {
  await connection();

  try {
    const auth = await requireUser();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: auth.user.id },
      select: {
        username: true,
        role: true,
        staff: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, message: "User nahi mila." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        username: user.username,
        role: user.role,
        displayName: user.staff?.name || user.username,
      },
    });
  } catch (error) {
    console.error("Current user API error:", error);

    return NextResponse.json(
      { success: false, message: "User details load nahi hui." },
      { status: 500 }
    );
  }
}
