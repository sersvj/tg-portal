-- AlterTable
ALTER TABLE "QuestionnaireField" ADD COLUMN     "milestoneDefinitionId" TEXT;

-- AddForeignKey
ALTER TABLE "QuestionnaireField" ADD CONSTRAINT "QuestionnaireField_milestoneDefinitionId_fkey" FOREIGN KEY ("milestoneDefinitionId") REFERENCES "MilestoneDefinition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
