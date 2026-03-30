-- CreateTable
CREATE TABLE "StaffProfile" (
    "id" TEXT NOT NULL,
    "clientMilestoneId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "headshotFilename" TEXT,
    "noHeadshot" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StaffProfile_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "StaffProfile" ADD CONSTRAINT "StaffProfile_clientMilestoneId_fkey" FOREIGN KEY ("clientMilestoneId") REFERENCES "ClientMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;
