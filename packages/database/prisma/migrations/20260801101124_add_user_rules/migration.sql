-- AlterTable
ALTER TABLE "User" ADD COLUMN     "rules" TEXT,
ALTER COLUMN "notifyProductUpdates" SET DEFAULT true;
