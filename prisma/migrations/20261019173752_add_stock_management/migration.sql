-- CreateEnum
CREATE TYPE "StockIssueEventStatus" AS ENUM ('ISSUED', 'USED', 'UNUSED', 'RETURNED', 'DAMAGED', 'MISSING', 'UNDONE');

-- CreateTable
CREATE TABLE "StockPart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockDealer" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockDealer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockPurchase" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "date" TEXT NOT NULL,
    "billNo" TEXT NOT NULL DEFAULT '',
    "dealerId" TEXT,
    "dealerName" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "serials" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "consumedJobId" TEXT,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockPurchase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIssue" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "date" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "jobNo" TEXT NOT NULL DEFAULT '',
    "technician" TEXT NOT NULL,
    "partId" TEXT NOT NULL,
    "partName" TEXT NOT NULL,
    "qty" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "serials" JSONB,
    "notes" TEXT NOT NULL DEFAULT '',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockIssue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockIssueEvent" (
    "id" TEXT NOT NULL,
    "legacyId" TEXT,
    "issueId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "status" "StockIssueEventStatus" NOT NULL,
    "qty" INTEGER NOT NULL,
    "notes" TEXT NOT NULL DEFAULT '',
    "actorId" TEXT,
    "undoOfId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StockIssueEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StockPart_name_key" ON "StockPart"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StockDealer_name_key" ON "StockDealer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "StockPurchase_legacyId_key" ON "StockPurchase"("legacyId");

-- CreateIndex
CREATE INDEX "StockPurchase_date_idx" ON "StockPurchase"("date");

-- CreateIndex
CREATE INDEX "StockPurchase_partId_date_idx" ON "StockPurchase"("partId", "date");

-- CreateIndex
CREATE INDEX "StockPurchase_dealerName_idx" ON "StockPurchase"("dealerName");

-- CreateIndex
CREATE INDEX "StockPurchase_consumedJobId_idx" ON "StockPurchase"("consumedJobId");

-- CreateIndex
CREATE UNIQUE INDEX "StockIssue_legacyId_key" ON "StockIssue"("legacyId");

-- CreateIndex
CREATE INDEX "StockIssue_date_idx" ON "StockIssue"("date");

-- CreateIndex
CREATE INDEX "StockIssue_jobId_idx" ON "StockIssue"("jobId");

-- CreateIndex
CREATE INDEX "StockIssue_technician_idx" ON "StockIssue"("technician");

-- CreateIndex
CREATE INDEX "StockIssue_partId_date_idx" ON "StockIssue"("partId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "StockIssueEvent_legacyId_key" ON "StockIssueEvent"("legacyId");

-- CreateIndex
CREATE INDEX "StockIssueEvent_issueId_createdAt_idx" ON "StockIssueEvent"("issueId", "createdAt");

-- CreateIndex
CREATE INDEX "StockIssueEvent_status_date_idx" ON "StockIssueEvent"("status", "date");

-- CreateIndex
CREATE INDEX "StockIssueEvent_actorId_createdAt_idx" ON "StockIssueEvent"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "StockIssueEvent_undoOfId_idx" ON "StockIssueEvent"("undoOfId");

-- CreateIndex
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- AddForeignKey
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_dealerId_fkey" FOREIGN KEY ("dealerId") REFERENCES "StockDealer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockPurchase" ADD CONSTRAINT "StockPurchase_partId_fkey" FOREIGN KEY ("partId") REFERENCES "StockPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssue" ADD CONSTRAINT "StockIssue_partId_fkey" FOREIGN KEY ("partId") REFERENCES "StockPart"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockIssueEvent" ADD CONSTRAINT "StockIssueEvent_issueId_fkey" FOREIGN KEY ("issueId") REFERENCES "StockIssue"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
