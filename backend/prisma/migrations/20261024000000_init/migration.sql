-- CreateEnum
CREATE TYPE "SummaryStatus" AS ENUM ('NONE', 'PENDING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "Competitor" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Competitor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Snapshot" (
    "id" UUID NOT NULL,
    "competitorId" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "title" TEXT NOT NULL,
    "tagline" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "changed" BOOLEAN NOT NULL,
    "summary" TEXT,
    "summaryStatus" "SummaryStatus" NOT NULL DEFAULT 'NONE',

    CONSTRAINT "Snapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Snapshot_competitorId_fetchedAt_idx" ON "Snapshot"("competitorId", "fetchedAt" DESC);

-- AddForeignKey
ALTER TABLE "Snapshot" ADD CONSTRAINT "Snapshot_competitorId_fkey" FOREIGN KEY ("competitorId") REFERENCES "Competitor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

