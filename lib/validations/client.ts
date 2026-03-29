import { z } from "zod";

export const clientSchema = z.object({
  companyName: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal("")),
  logoUrl: z.string().url().optional().or(z.literal("")),
});

export type ClientFormValues = z.infer<typeof clientSchema>;
