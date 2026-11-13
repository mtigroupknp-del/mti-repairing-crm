
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/require-admin";

type ImportedJob = {
  id?: number;
  jobNo?: string;
  date?: string;
  customer?: string;
  phone?: string;
  model?: string;
  imei?: string;
  problem?: string;
  estimate?: number;
  finalAmount?: number;
  repairStatus?: string;
  deliveryStatus?: string;
  delivery?: string;
  technician?: string;
  received?: number;
  parts?: string;
};

function asText(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function asAmount(value: unknown): number {
  const number = Number(value ?? 0);

  if (!Number.isFinite(number) || number < 0) {
    throw new Error("Amount invalid hai. Backup records check karein.");
  }

  return number;
}

export async function POST(request: NextRequest) {
  try {
    // Sirf Admin Login ko permission.
    const auth = await requireAdmin();

    if (!auth.ok) {
      return NextResponse.json(
        { error: auth.message },
        { status: auth.status }
      );
    }

    // Existing import secret bhi verify hoga.
    const expectedKey = process.env.CRM_IMPORT_KEY;
    const suppliedKey = request.headers.get("x-import-key");

    if (!expectedKey || !suppliedKey || suppliedKey !== expectedKey) {
      return NextResponse.json(
        { error: "Import authorization failed." },
        { status: 401 }
      );
    }

    const payload: unknown = await request.json();

    if (!payload || typeof payload !== "object") {
      return NextResponse.json(
        { error: "Invalid JSON backup file." },
        { status: 400 }
      );
    }

    const root = payload as {
      app?: unknown;
      data?: Record<string, unknown>;
    };

    if (root.app !== "MTI Repairing CRM" || !root.data) {
      return NextResponse.json(
        { error: "Yeh supported MTI CRM backup file nahi hai." },
        { status: 400 }
      );
    }

    const rawJobs = root.data["mti-repair-jobs"];

    if (typeof rawJobs !== "string") {
      return NextResponse.json(
        { error: "Backup mein repairing job records nahi mile." },
        { status: 400 }
      );
    }

    let parsed: unknown;

    try {
      parsed = JSON.parse(rawJobs);
    } catch {
      return NextResponse.json(
        { error: "Repairing job data valid JSON nahi hai." },
        { status: 400 }
      );
    }

    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "Repairing job data list format mein honi chahiye." },
        { status: 400 }
      );
    }

    if (parsed.length > 5000) {
      return NextResponse.json(
        { error: "Ek baar mein maximum 5000 jobs import kar sakte hain." },
        { status: 400 }
      );
    }

    const jobs = parsed as ImportedJob[];

    const data = jobs.map((job, index) => {
      if (!job || typeof job !== "object") {
        throw new Error(`Record ${index + 1} invalid hai.`);
      }

      const jobNo = asText(job.jobNo).trim();
      const customer = asText(job.customer).trim();

      if (!jobNo || !customer) {
        throw new Error(
          `Record ${index + 1} mein Job Number ya Customer Name missing hai.`
        );
      }

      const estimate = asAmount(job.estimate);

      const finalAmount =
        job.finalAmount === undefined || job.finalAmount === null
          ? estimate
          : asAmount(job.finalAmount);

      const received = asAmount(job.received);

      return {
        jobNo,
        date: asText(job.date),
        customer,
        phone: asText(job.phone),
        model: asText(job.model),
        imei: asText(job.imei),
        problem: asText(job.problem),
        estimate,
        finalAmount,
        repairStatus: job.repairStatus === "NR" ? "NR" : "OK",
        deliveryStatus:
          job.deliveryStatus === "Delivered"
            ? "Delivered"
            : "Not Delivered",
        delivery: asText(job.delivery),
        technician: asText(job.technician),
        received,
        parts: asText(job.parts),
      };
    });

    const jobNumbers = data.map((job) => job.jobNo);

    if (new Set(jobNumbers).size !== jobNumbers.length) {
      return NextResponse.json(
        {
          error:
            "Backup mein duplicate Job Numbers hain. Koi record import nahi hua.",
        },
        { status: 400 }
      );
    }

    // Import aur AuditLog ek transaction mein save honge.
    const result = await prisma.$transaction(async (tx) => {
      const importResult = await tx.repairJob.createMany({
        data,
        skipDuplicates: true,
      });

      await tx.auditLog.create({
        data: {
          actorId: auth.user.id,
          action: "REPAIR_JOBS_IMPORTED",
          details: {
            receivedRecords: data.length,
            importedRecords: importResult.count,
            skippedRecords: data.length - importResult.count,
            source: "JSON_BACKUP_IMPORT",
            importedBy: auth.user.username,
          },
        },
      });

      return importResult;
    });

    return NextResponse.json({
      success: true,
      received: data.length,
      imported: result.count,
      skipped: data.length - result.count,
      message:
        "Import complete. Existing records overwrite nahi kiye gaye.",
    });
  } catch (error) {
    console.error("Repair job import failed:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Import fail hua. VS Code terminal check karein.",
      },
      { status: 400 }
    );
  }
}
