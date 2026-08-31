-- DropForeignKey
ALTER TABLE "PullRequestReview" DROP CONSTRAINT IF EXISTS "PullRequestReview_userId_fkey";
ALTER TABLE "PullRequestReview" DROP CONSTRAINT IF EXISTS "PullRequestReview_sessionId_fkey";
ALTER TABLE "ReviewPreference" DROP CONSTRAINT IF EXISTS "ReviewPreference_userId_fkey";
ALTER TABLE "ReviewComment" DROP CONSTRAINT IF EXISTS "ReviewComment_sessionId_fkey";

-- AlterTable
ALTER TABLE "User" DROP COLUMN IF EXISTS "canvasWaitlist";

-- DropTable
DROP TABLE IF EXISTS "PullRequestReview";
DROP TABLE IF EXISTS "ReviewPreference";
DROP TABLE IF EXISTS "ReviewComment";

-- DropEnum
DROP TYPE IF EXISTS "ReviewStatus";
DROP TYPE IF EXISTS "ReviewProvider";
DROP TYPE IF EXISTS "ReviewStrictness";
