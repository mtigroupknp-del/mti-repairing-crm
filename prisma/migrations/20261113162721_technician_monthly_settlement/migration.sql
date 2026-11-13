-- CreateEnum
CREATE TYPE "TechnicianSettlementStatus" AS ENUM ('DRAFT', 'FINALIZED');

-- AlterTable
ALTER TABLE "Staff" ADD COLUMN     "defaultPercentage" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "StockIssue" ADD COLUMN     "staffId" TEXT;

-- CreateTable
CREATE TABLE "JobTechnician" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "assignedAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobTechnician_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "paymentDate" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT NOT NULL DEFAULT 'Cash',
    "reference" TEXT NOT NULL DEFAULT '',
    "notes" TEXT NOT NULL DEFAULT '',
    "receivedBy" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentAllocation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "jobTechnicianId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentAllocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TechnicianMonthlySettlement" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "year" INTEGER NOT NULL,
    "month" INTEGER NOT NULL,
    "collectionAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "partsCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "netProfit" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "percentage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "payableAmount" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "status" "TechnicianSettlementStatus" NOT NULL DEFAULT 'DRAFT',
    "finalizedAt" TIMESTAMP(3),
    "finalizedById" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TechnicianMonthlySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "JobTechnician_staffId_idx" ON "JobTechnician"("staffId");

-- CreateIndex
CREATE INDEX "JobTechnician_jobId_idx" ON "JobTechnician"("jobId");

-- CreateIndex
CREATE UNIQUE INDEX "JobTechnician_jobId_staffId_key" ON "JobTechnician"("jobId", "staffId");

-- CreateIndex
CREATE INDEX "Payment_jobId_paymentDate_idx" ON "Payment"("jobId", "paymentDate");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "PaymentAllocation_jobTechnicianId_idx" ON "PaymentAllocation"("jobTechnicianId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentAllocation_paymentId_jobTechnicianId_key" ON "PaymentAllocation"("paymentId", "jobTechnicianId");

-- CreateIndex
CREATE INDEX "TechnicianMonthlySettlement_year_month_idx" ON "TechnicianMonthlySettlement"("year", "month");

-- CreateIndex
CREATE INDEX "TechnicianMonthlySettlement_staffId_year_month_idx" ON "TechnicianMonthlySettlement"("staffId", "year", "month");

-- CreateIndex
CREATE INDEX "TechnicianMonthlySettlement_status_idx" ON "TechnicianMonthlySettlement"("status");

-- CreateIndex
CREATE UNIQUE INDEX "TechnicianMonthlySettlement_staffId_year_month_key" ON "TechnicianMonthlySettlement"("staffId", "year", "month");

-- AddForeignKey
ALTER TABLE "JobTechnician" ADD CONSTRAINT "JobTechnician_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RepairJob"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobTechnician" ADD CONSTRAINT "JobTechnician_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "RepairJob"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentAllocation" ADD CONSTRAINT "PaymentAllocation_jobTechnicianId_fkey" FOREIGN KEY ("jobTechnicianId") REFERENCES "JobTechnician"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TechnicianMonthlySettlement" ADD CONSTRAINT "TechnicianMonthlySettlement_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "Staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
