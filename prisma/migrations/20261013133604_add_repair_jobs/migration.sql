-- CreateTable
CREATE TABLE "RepairJob" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "jobNo" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "customer" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "imei" TEXT NOT NULL DEFAULT '',
    "problem" TEXT NOT NULL,
    "estimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "repairStatus" TEXT NOT NULL DEFAULT 'OK',
    "deliveryStatus" TEXT NOT NULL DEFAULT 'Not Delivered',
    "delivery" TEXT NOT NULL DEFAULT '',
    "technician" TEXT NOT NULL DEFAULT '',
    "received" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "parts" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RepairJob_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_legacyId_key" ON "RepairJob"("legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "RepairJob_jobNo_key" ON "RepairJob"("jobNo");

-- CreateIndex
CREATE INDEX "RepairJob_date_idx" ON "RepairJob"("date");

-- CreateIndex
CREATE INDEX "RepairJob_customer_idx" ON "RepairJob"("customer");

-- CreateIndex
CREATE INDEX "RepairJob_phone_idx" ON "RepairJob"("phone");

-- CreateIndex
CREATE INDEX "RepairJob_technician_idx" ON "RepairJob"("technician");
