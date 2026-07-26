-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "ReviewProvider" AS ENUM ('GITHUB', 'GITLAB');

-- CreateEnum
CREATE TYPE "ReviewStrictness" AS ENUM ('LENIENT', 'STANDARD', 'STRICT');

-- AlterTable
ALTER TABLE "AuthSession" ADD COLUMN     "previousRefreshTokenHash" TEXT,
ADD COLUMN     "rotatedAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "RepositoryWiki" ADD COLUMN     "isPinned" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "PullRequestReview" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "sessionId" TEXT,
    "prUrl" TEXT NOT NULL,
    "prNumber" INTEGER NOT NULL,
    "repository" TEXT NOT NULL,
    "provider" "ReviewProvider" NOT NULL DEFAULT 'GITHUB',
    "title" TEXT NOT NULL,
    "author" TEXT NOT NULL,
    "authorAvatar" TEXT,
    "status" "ReviewStatus" NOT NULL DEFAULT 'PENDING',
    "isAutoReview" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "findings" JSONB NOT NULL DEFAULT '[]',
    "preferences" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PullRequestReview_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReviewPreference" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "autoReviewAgentPrs" BOOLEAN NOT NULL DEFAULT true,
    "defaultStrictness" "ReviewStrictness" NOT NULL DEFAULT 'STANDARD',
    "focusAreas" TEXT[] DEFAULT ARRAY['SECURITY', 'PERFORMANCE', 'CLEAN_CODE']::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReviewPreference_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PullRequestReview_userId_idx" ON "PullRequestReview"("userId");

-- CreateIndex
CREATE INDEX "PullRequestReview_sessionId_idx" ON "PullRequestReview"("sessionId");

-- CreateIndex
CREATE INDEX "PullRequestReview_repository_idx" ON "PullRequestReview"("repository");

-- CreateIndex
CREATE INDEX "PullRequestReview_status_idx" ON "PullRequestReview"("status");

-- CreateIndex
CREATE UNIQUE INDEX "ReviewPreference_userId_key" ON "ReviewPreference"("userId");

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PullRequestReview" ADD CONSTRAINT "PullRequestReview_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReviewPreference" ADD CONSTRAINT "ReviewPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
