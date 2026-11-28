-- Delete canceled issues (their comments, activity, notifications and blocker links cascade;
-- sub-issues are kept and lose their parent), then drop CANCELED from the enum.
DELETE FROM "Issue" WHERE "status" = 'CANCELED';

ALTER TYPE "IssueStatus" RENAME TO "IssueStatus_old";
CREATE TYPE "IssueStatus" AS ENUM ('TODO', 'IN_PROGRESS', 'DONE');
ALTER TABLE "Issue" ALTER COLUMN "status" TYPE "IssueStatus" USING ("status"::text::"IssueStatus");
DROP TYPE "IssueStatus_old";
