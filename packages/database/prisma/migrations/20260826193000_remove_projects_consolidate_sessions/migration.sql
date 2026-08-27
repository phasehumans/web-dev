-- DropForeignKey
ALTER TABLE "Session" DROP CONSTRAINT IF EXISTS "Session_projectId_fkey";
ALTER TABLE "Project" DROP CONSTRAINT IF EXISTS "Project_userId_fkey";

-- DropIndex
DROP INDEX IF EXISTS "Session_projectId_idx";
DROP INDEX IF EXISTS "Project_userId_updatedAt_idx";
DROP INDEX IF EXISTS "Project_isSharedAsTemplate_updatedAt_idx";
DROP INDEX IF EXISTS "Project_isSharedAsTemplate_isFeatured_updatedAt_idx";

-- AlterTable
ALTER TABLE "Session" DROP COLUMN IF EXISTS "projectId";

-- DropTable
DROP TABLE IF EXISTS "Project";
