
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


const repairStatusOptions = ["OK", "NR", "In Process"];
const deliveryStatusOptions = ["Not Delivered", "Delivered"];

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  return (
    !Number.isNaN(date.getTime()) &&
    date.toISOString().slice(0, 10) === value
  );
}

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

// GET: Database se repairing jobs ki list
export async function GET() {
  try {
    const jobs = await prisma.repairJob.findMany({
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error("GET repair jobs error:", error);

    return errorResponse("Repairing jobs load nahi ho sake.", 500);
  }
}

// POST: Database mein naya repairing job banana
export async function POST(request: Request) {
  try {
    const body = await request.json();

    const requiredFields = [
      "jobNo",
      "date",
      "customer",
      "phone",
      "model",
      "problem",
    ];

    for (const field of requiredFields) {
      if (
        typeof body[field] !== "string" ||
        !body[field].trim()
      ) {
        return errorResponse(`${field} required hai.`);
      }
    }

    if (!isValidDate(body.date)) {
      return errorResponse("Valid Job Date YYYY-MM-DD format mein dein.");
    }

    const repairStatus = body.repairStatus ?? "OK";
    const deliveryStatus = body.deliveryStatus ?? "Not Delivered";

    if (!repairStatusOptions.includes(repairStatus)) {
      return errorResponse("Invalid Repair Status.");
    }

    if (!deliveryStatusOptions.includes(deliveryStatus)) {
      return errorResponse("Invalid Delivery Status.");
    }

    const estimate = Number(body.estimate ?? 0);
    const finalAmount = Number(body.finalAmount ?? 0);
    const received = Number(body.received ?? 0);

    if (
      !Number.isFinite(estimate) ||
      !Number.isFinite(finalAmount) ||
      !Number.isFinite(received) ||
      estimate < 0 ||
      finalAmount < 0 ||
      received < 0
    ) {
      return errorResponse("Amount valid aur zero se kam nahi hona chahiye.");
    }

    const delivery = body.delivery ?? "";

    if (
      typeof delivery !== "string" ||
      (delivery !== "" && !isValidDate(delivery))
    ) {
      return errorResponse("Valid Delivery Date YYYY-MM-DD format mein dein.");
    }

    const job = await prisma.repairJob.create({
      data: {
        jobNo: body.jobNo.trim(),
        date: body.date,
        customer: body.customer.trim(),
        phone: body.phone.trim(),
        model: body.model.trim(),
        imei: typeof body.imei === "string" ? body.imei : "",
        problem: body.problem,
        estimate,
        finalAmount,
        repairStatus,
        deliveryStatus,
        delivery,
        technician:
          typeof body.technician === "string" ? body.technician : "",
        received,
        parts: typeof body.parts === "string" ? body.parts : "",
      },
    });

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    console.error("POST repair job error:", error);

    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "P2002"
    ) {
      return errorResponse("Yeh Job Number pehle se maujood hai.", 409);
    }

    return errorResponse("Naya repairing job save nahi ho saka.", 500);
  }
}

// PATCH: Repair Status, Delivery Status aur Delivery Date update karna
export async function PATCH(request: Request) {
  try {
    const body = await request.json();

    if (
      typeof body.jobNo !== "string" ||
      !body.jobNo.trim()
    ) {
      return errorResponse("Job Number required hai.");
    }

    const data: {
      repairStatus?: string;
      deliveryStatus?: string;
      delivery?: string;
    } = {};

    if (body.repairStatus !== undefined) {
      if (
        typeof body.repairStatus !== "string" ||
        !repairStatusOptions.includes(body.repairStatus)
      ) {
        return errorResponse(
          "Repair Status OK, NR ya In Process hona chahiye."
        );
      }

      data.repairStatus = body.repairStatus;
    }

    if (body.deliveryStatus !== undefined) {
      if (
        typeof body.deliveryStatus !== "string" ||
        !deliveryStatusOptions.includes(body.deliveryStatus)
      ) {
        return errorResponse(
          "Delivery Status Not Delivered ya Delivered hona chahiye."
        );
      }

      data.deliveryStatus = body.deliveryStatus;
    }

    if (body.delivery !== undefined) {
      if (
        typeof body.delivery !== "string" ||
        (body.delivery !== "" && !isValidDate(body.delivery))
      ) {
        return errorResponse(
          "Valid Delivery Date YYYY-MM-DD format mein dein."
        );
      }

      data.delivery = body.delivery;
    }

    if (Object.keys(data).length === 0) {
      return errorResponse("Update karne ke liye koi valid field nahi mili.");
    }

    const existingJob = await prisma.repairJob.findUnique({
      where: { jobNo: body.jobNo.trim() },
    });

    if (!existingJob) {
      return errorResponse(
        "Job database mein nahi mila. Pehle job ko database mein save/import karein.",
        404
      );
    }

    const job = await prisma.repairJob.update({
      where: { jobNo: body.jobNo.trim() },
      data,
    });

    return NextResponse.json({
      success: true,
      message: "Repairing job successfully update ho gaya.",
      job,
    });
  } catch (error) {
    console.error("PATCH repair job error:", error);

    return errorResponse("Repairing job update nahi ho saka.", 500);
  }
}
