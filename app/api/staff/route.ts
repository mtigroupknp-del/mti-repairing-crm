
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

const usernamePattern = /^[a-z0-9._-]{4,30}$/;

function readPercentage(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

export async function GET() {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const staff = await prisma.staff.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            isActive: true,
            role: true,
          },
        },
      },
    });

    return NextResponse.json({ success: true, staff });
  } catch (error) {
    console.error("Staff GET error:", error);
    return NextResponse.json(
      { success: false, message: "Staff list load nahi ho payi." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { success: false, message: auth.message },
        { status: auth.status }
      );
    }

    const body = await request.json();

    const name = typeof body.name === "string" ? body.name.trim() : "";
    const designation =
      typeof body.designation === "string" ? body.designation.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : "";
    const status = body.status === "Inactive" ? "Inactive" : "Active";

    const createLogin = body.createLogin === true;
    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";
    const password =
      typeof body.password === "string" ? body.password : "";

    let defaultPercentage = 0;

    if (designation === "Technician" && body.defaultPercentage !== undefined) {
      const parsed = readPercentage(body.defaultPercentage);

      if (parsed === null) {
        return NextResponse.json(
          {
            success: false,
            message: "Technician percentage 0 se 100 ke beech hona chahiye.",
          },
          { status: 400 }
        );
      }

      defaultPercentage = parsed;
    }

    if (!name || !designation || name.length > 100 || designation.length > 100) {
      return NextResponse.json(
        { success: false, message: "Staff name aur designation sahi bharein." },
        { status: 400 }
      );
    }

    if (phone.length > 30) {
      return NextResponse.json(
        { success: false, message: "Mobile number bahut lamba hai." },
        { status: 400 }
      );
    }

    if (createLogin) {
      if (!usernamePattern.test(username)) {
        return NextResponse.json(
          {
            success: false,
            message:
              "Username 4-30 characters ka ho aur usmein lowercase letters, numbers, dot, underscore ya hyphen hi hon.",
          },
          { status: 400 }
        );
      }

      if (password.length < 8 || password.length > 72) {
        return NextResponse.json(
          { success: false, message: "Password 8-72 characters ka hona chahiye." },
          { status: 400 }
        );
      }
    }

    if (!createLogin && (username || password)) {
      return NextResponse.json(
        {
          success: false,
          message: "Login account banane ke liye Create Login select karein.",
        },
        { status: 400 }
      );
    }

    if (createLogin) {
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
    }

    const passwordHash = createLogin
      ? await bcrypt.hash(password, 12)
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const staff = await tx.staff.create({
        data: {
          name,
          designation,
          phone,
          status,
          defaultPercentage,
        },
      });

      let user = null;

      if (createLogin && passwordHash) {
        user = await tx.user.create({
          data: {
            username,
            passwordHash,
            role: "STAFF",
            isActive: status === "Active",
            staffId: staff.id,
          },
          select: {
            id: true,
            username: true,
            role: true,
            isActive: true,
          },
        });

        await tx.auditLog.create({
          data: {
            actorId: auth.user.id,
            action: "STAFF_LOGIN_CREATED",
            targetId: user.id,
            details: { staffName: name, username },
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "STAFF_CREATED",
          targetId: staff.id,
          details: {
            name,
            designation,
            status,
            defaultPercentage,
          },
        },
      });

      return { staff, user };
    });

    return NextResponse.json(
      {
        success: true,
        message: "Staff successfully save ho gaya.",
        ...result,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Staff POST error:", error);
    return NextResponse.json(
      { success: false, message: "Staff save nahi ho paya." },
      { status: 500 }
    );
  }
}
