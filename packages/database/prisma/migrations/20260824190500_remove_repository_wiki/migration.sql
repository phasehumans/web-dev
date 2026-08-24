-- DropForeignKey
ALTER TABLE "RepositoryWiki" DROP CONSTRAINT IF EXISTS "RepositoryWiki_userId_fkey";
ALTER TABLE "WikiPage" DROP CONSTRAINT IF EXISTS "WikiPage_wikiId_fkey";

-- DropTable
DROP TABLE IF EXISTS "WikiPage";
DROP TABLE IF EXISTS "RepositoryWiki";

-- DropEnum
DROP TYPE IF EXISTS "WikiStatus";
