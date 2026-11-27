-- AlterEnum
ALTER TYPE "NotificationType" ADD VALUE 'MENTIONED';

-- AlterTable
ALTER TABLE "Issue" ADD COLUMN "parentId" TEXT;

-- CreateTable
CREATE TABLE "IssueBlock" (
    "blockerId" TEXT NOT NULL,
    "blockedId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IssueBlock_pkey" PRIMARY KEY ("blockerId","blockedId")
);

-- CreateIndex
CREATE INDEX "Issue_parentId_idx" ON "Issue"("parentId");

-- CreateIndex
CREATE INDEX "IssueBlock_blockedId_idx" ON "IssueBlock"("blockedId");

-- AddForeignKey
ALTER TABLE "Issue" ADD CONSTRAINT "Issue_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Issue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueBlock" ADD CONSTRAINT "IssueBlock_blockerId_fkey" FOREIGN KEY ("blockerId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IssueBlock" ADD CONSTRAINT "IssueBlock_blockedId_fkey" FOREIGN KEY ("blockedId") REFERENCES "Issue"("id") ON DELETE CASCADE ON UPDATE CASCADE;
