
import "server-only";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySessionToken } from "@/lib/auth";

export async function requireAdmin() {
  const cookieStore = await cookies();
  const token = cookieStore.get("mti_session")?.value;

  if (!token) {
    return {
      ok: false as const,
      status: 401,
      message: "Login required.",
    };
  }

  const session = verifySessionToken(token);

  if (!session) {
    return {
      ok: false as const,
      status: 401,
      message: "Session invalid or expired. Please login again.",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      username: true,
      role: true,
      isActive: true,
    },
  });

  if (!user || !user.isActive) {
    return {
      ok: false as const,
      status: 401,
      message: "Active user account required.",
    };
  }

  if (user.role !== "ADMIN") {
    return {
      ok: false as const,
      status: 403,
      message: "Admin permission required.",
    };
  }

  return {
    ok: true as const,
    user,
  };
}
