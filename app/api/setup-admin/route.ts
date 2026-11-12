
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../../generated/prisma/client";
import bcrypt from "bcryptjs";


const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

const pool =
  globalForPrisma.pool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
  });

const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter: new PrismaPg(pool),
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.pool = pool;
  globalForPrisma.prisma = prisma;
}

function isValidSetupKey(provided: string, expected: string): boolean {
  const providedBuffer = Buffer.from(provided);
  const expectedBuffer = Buffer.from(expected);

  return (
    providedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(providedBuffer, expectedBuffer)
  );
}

export async function POST(request: Request) {
  try {
    const expectedKey = process.env.ADMIN_SETUP_KEY;

    if (
      !expectedKey ||
      expectedKey === "Apna-Random-Secret-Key-2026!"
    ) {
      return NextResponse.json(
        { error: "Please configure a private ADMIN_SETUP_KEY in .env." },
        { status: 500 }
      );
    }

    let body: {
      setupKey?: string;
      username?: string;
      password?: string;
    };

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body." },
        { status: 400 }
      );
    }

    if (
      typeof body.setupKey !== "string" ||
      !isValidSetupKey(body.setupKey, expectedKey)
    ) {
      return NextResponse.json(
        { error: "Invalid setup key." },
        { status: 401 }
      );
    }

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string" ? body.password : "";

    if (!/^[a-z0-9._-]{4,30}$/.test(username)) {
      return NextResponse.json(
        {
          error:
            "Username must be 4-30 characters and contain only lowercase letters, numbers, dots, underscores or hyphens.",
        },
        { status: 400 }
      );
    }

    if (password.length < 12 || password.length > 72) {
      return NextResponse.json(
        { error: "Password must be 12-72 characters long." },
        { status: 400 }
      );
    }

    // Setup is allowed only when no Admin exists.
    const existingAdmin = await prisma.user.findFirst({
      where: { role: "ADMIN" },
      select: { id: true },
    });

    if (existingAdmin) {
      return NextResponse.json(
        { error: "An Admin already exists. Setup is closed." },
        { status: 409 }
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "This username is already in use." },
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const admin = await prisma.$transaction(async (tx) => {
      const createdAdmin = await tx.user.create({
        data: {
          username,
          passwordHash,
          role: "ADMIN",
          isActive: true,
        },
        select: {
          id: true,
          username: true,
          role: true,
        },
      });

      await tx.auditLog.create({
        data: {
          actorId: createdAdmin.id,
          action: "INITIAL_ADMIN_CREATED",
          targetId: createdAdmin.id,
          details: {
            username: createdAdmin.username,
          },
        },
      });

      return createdAdmin;
    });

    return NextResponse.json(
      {
        message: "Admin account created successfully.",
        admin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Admin setup error:", error);

    return NextResponse.json(
      {
        error:
          "Admin setup failed. Check the terminal for the database or schema error.",
      },
      { status: 500 }
    );
  }
}
