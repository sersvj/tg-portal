-- AlterTable
ALTER TABLE "ClientMilestone" ADD COLUMN     "dropboxFolderPath" TEXT,
ADD COLUMN     "instructions" TEXT;

-- CreateTable
CREATE TABLE "MilestoneFile" (
    "id" TEXT NOT NULL,
    "milestoneId" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "dropboxPath" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MilestoneFile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "MilestoneFile" ADD CONSTRAINT "MilestoneFile_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "ClientMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
