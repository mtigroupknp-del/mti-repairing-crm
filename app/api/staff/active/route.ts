
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function GET(request: Request) {
  // Keep this outside try/catch so Next.js can handle
  // the dynamic prerendering signal correctly.
  const cookieHeader = request.headers.get("cookie") || "";

  const token = cookieHeader
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith("mti_session="))
    ?.slice("mti_session=".length);

  try {
    if (!token) {
      return NextResponse.json(
        { message: "Login required." },
        { status: 401 }
      );
    }

    const session = verifySessionToken(token);

    if (!session) {
      return NextResponse.json(
        { message: "Session invalid or expired. Please login again." },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return NextResponse.json(
        { message: "Active user account required." },
        { status: 401 }
      );
    }

    const staff = await prisma.staff.findMany({
      where: { status: "Active" },
      select: {
        id: true,
        name: true,
        designation: true,
        phone: true,
        status: true,
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Active staff API error:", error);

    return NextResponse.json(
      { message: "Active staff list load nahi ho saki." },
      { status: 500 }
    );
  }
}
