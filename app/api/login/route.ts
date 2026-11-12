
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { createSessionToken } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const username =
      typeof body.username === "string"
        ? body.username.trim().toLowerCase()
        : "";

    const password =
      typeof body.password === "string"
        ? body.password
        : "";

    if (
      !username ||
      !password ||
      username.length > 100 ||
      password.length > 200
    ) {
      return NextResponse.json(
        { success: false, message: "Username aur password bharein." },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        passwordHash: true,
        role: true,
        isActive: true,
      },
    });

    if (
      !user ||
      !user.isActive ||
      !(await bcrypt.compare(password, user.passwordHash))
    ) {
      return NextResponse.json(
        { success: false, message: "Username ya password galat hai." },
        { status: 401 }
      );
    }

    const token = createSessionToken(user.id);
    const cookieStore = await cookies();

    cookieStore.set("mti_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: 8 * 60 * 60,
    });

    return NextResponse.json({
      success: true,
      message: "Login successful.",
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("Login API error:", error);

    return NextResponse.json(
      { success: false, message: "Login nahi ho paya. Server settings check karein." },
      { status: 500 }
    );
  }
}
