-- Move any backlog issues to Todo, then drop BACKLOG from the enum.
UPDATE "Issue" SET "status" = 'TODO' WHERE "status" = 'BACKLOG';

ALTER TYPE "IssueStatus" RENAME TO "IssueStatus_old";
CREATE TYPE "IssueStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE', 'CANCELED');
ALTER TABLE "Issue" ALTER COLUMN "status" TYPE "IssueStatus" USING ("status"::text::"IssueStatus");
DROP TYPE "IssueStatus_old";
