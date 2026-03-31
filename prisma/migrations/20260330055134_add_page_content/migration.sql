-- CreateEnum
CREATE TYPE "PageNodeType" AS ENUM ('PAGE', 'LABEL');

-- CreateTable
CREATE TABLE "PageNode" (
    "id" TEXT NOT NULL,
    "clientMilestoneId" TEXT NOT NULL,
    "parentId" TEXT,
    "type" "PageNodeType" NOT NULL DEFAULT 'PAGE',
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "isOptional" BOOLEAN NOT NULL DEFAULT false,
    "isNA" BOOLEAN NOT NULL DEFAULT false,
    "content" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PageNode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageFieldTemplate" (
    "id" TEXT NOT NULL,
    "pageNodeId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "fieldType" "FieldType" NOT NULL DEFAULT 'TEXT',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "order" INTEGER NOT NULL DEFAULT 0,
    "helpText" TEXT,

    CONSTRAINT "PageFieldTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PageFieldAnswer" (
    "id" TEXT NOT NULL,
    "pageNodeId" TEXT NOT NULL,
    "fieldTemplateId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "PageFieldAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PageFieldAnswer_pageNodeId_fieldTemplateId_key" ON "PageFieldAnswer"("pageNodeId", "fieldTemplateId");

-- AddForeignKey
ALTER TABLE "PageNode" ADD CONSTRAINT "PageNode_clientMilestoneId_fkey" FOREIGN KEY ("clientMilestoneId") REFERENCES "ClientMilestone"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageNode" ADD CONSTRAINT "PageNode_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "PageNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFieldTemplate" ADD CONSTRAINT "PageFieldTemplate_pageNodeId_fkey" FOREIGN KEY ("pageNodeId") REFERENCES "PageNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFieldAnswer" ADD CONSTRAINT "PageFieldAnswer_pageNodeId_fkey" FOREIGN KEY ("pageNodeId") REFERENCES "PageNode"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PageFieldAnswer" ADD CONSTRAINT "PageFieldAnswer_fieldTemplateId_fkey" FOREIGN KEY ("fieldTemplateId") REFERENCES "PageFieldTemplate"("id") ON DELETE CASCADE ON UPDATE CASCADE;
