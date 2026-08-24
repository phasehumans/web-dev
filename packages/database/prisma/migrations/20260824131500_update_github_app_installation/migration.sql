-- AlterTable
ALTER TABLE "GithubAppInstallation" ADD COLUMN "accountLogin" TEXT,
ADD COLUMN "accountType" TEXT,
ADD COLUMN "targetType" TEXT,
ADD COLUMN "permissions" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "User_githubId_key" ON "User"("githubId");
