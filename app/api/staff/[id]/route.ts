
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function readPercentage(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (value < 0 || value > 100) return null;
  return value;
}

export async function PATCH(
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

    const name =
      typeof body.name === "string" ? body.name.trim() : undefined;
    const designation =
      typeof body.designation === "string"
        ? body.designation.trim()
        : undefined;
    const phone =
      typeof body.phone === "string" ? body.phone.trim() : undefined;
    const status = body.status;

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Staff ID missing hai." },
        { status: 400 }
      );
    }

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Staff record nahi mila." },
        { status: 404 }
      );
    }

    if (name !== undefined && (!name || name.length > 100)) {
      return NextResponse.json(
        { success: false, message: "Staff name sahi bharein." },
        { status: 400 }
      );
    }

    if (
      designation !== undefined &&
      (!designation || designation.length > 100)
    ) {
      return NextResponse.json(
        { success: false, message: "Designation sahi bharein." },
        { status: 400 }
      );
    }

    if (phone !== undefined && phone.length > 30) {
      return NextResponse.json(
        { success: false, message: "Mobile number bahut lamba hai." },
        { status: 400 }
      );
    }

    if (
      status !== undefined &&
      status !== "Active" &&
      status !== "Inactive"
    ) {
      return NextResponse.json(
        { success: false, message: "Invalid staff status." },
        { status: 400 }
      );
    }

    const finalDesignation = designation ?? existing.designation;
    let defaultPercentage = existing.defaultPercentage;

    if (finalDesignation !== "Technician") {
      defaultPercentage = 0;
    } else if (body.defaultPercentage !== undefined) {
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

    const result = await prisma.$transaction(async (tx) => {
      const updatedStaff = await tx.staff.update({
        where: { id },
        data: {
          ...(name !== undefined ? { name } : {}),
          ...(designation !== undefined ? { designation } : {}),
          ...(phone !== undefined ? { phone } : {}),
          ...(status !== undefined ? { status } : {}),
          defaultPercentage,
        },
      });

      if (existing.user && status !== undefined) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            isActive: status === "Active",
          },
        });
      }

      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "STAFF_UPDATED",
          targetId: id,
          details: {
            name: updatedStaff.name,
            designation: updatedStaff.designation,
            status: updatedStaff.status,
            defaultPercentage: updatedStaff.defaultPercentage,
          },
        },
      });

      return updatedStaff;
    });

    return NextResponse.json({
      success: true,
      message: "Staff details update ho gayi hain.",
      staff: result,
    });
  } catch (error) {
    console.error("Staff PATCH error:", error);

    return NextResponse.json(
      { success: false, message: "Staff update nahi ho paya." },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
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

    if (!id) {
      return NextResponse.json(
        { success: false, message: "Staff ID missing hai." },
        { status: 400 }
      );
    }

    const existing = await prisma.staff.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, message: "Staff record nahi mila." },
        { status: 404 }
      );
    }

    await prisma.$transaction(async (tx) => {
      if (existing.user) {
        await tx.user.update({
          where: { id: existing.user.id },
          data: {
            isActive: false,
            staffId: null,
          },
        });
      }

      await tx.staff.delete({
        where: { id },
      });

      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "STAFF_DELETED",
          targetId: id,
          details: {
            staffName: existing.name,
            designation: existing.designation,
            username: existing.user?.username ?? null,
            loginDeactivated: Boolean(existing.user),
          },
        },
      });
    });

    return NextResponse.json({
      success: true,
      message:
        "Staff record delete ho gaya aur linked login deactivate kar diya gaya.",
    });
  } catch (error) {
    console.error("Staff DELETE error:", error);

    return NextResponse.json(
      {
        success: false,
        message:
          "Staff delete nahi ho paya. Ho sakta hai is Staff se related doosre records linked hon. Database details check karni hongi.",
      },
      { status: 500 }
    );
  }
}
