import { z } from "zod";

export const questionnaireResponseSchema = z.object({
  clientMilestoneId: z.string().cuid(),
  answers: z.array(
    z.object({
      fieldId: z.string().cuid(),
      value: z.union([z.string(), z.array(z.string()), z.boolean()]),
    })
  ),
});

export type QuestionnaireResponseValues = z.infer<typeof questionnaireResponseSchema>;
