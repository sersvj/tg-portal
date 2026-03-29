"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { FieldType } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { parseFieldOptions } from "@/lib/field-options";

async function requireAdmin() {
  const session = await auth();
  if (!session || session.user.role !== "ADMIN") throw new Error("Unauthorized");
  return session;
}

export async function createTemplateField(definitionId: string, formData: FormData) {
  await requireAdmin();
  const label = (formData.get("label") as string).trim();
  const fieldType = formData.get("fieldType") as FieldType;
  const required = formData.get("required") === "on";
  const helpText = (formData.get("helpText") as string | null)?.trim() || null;
  const options = parseFieldOptions(fieldType, formData);

  const last = await db.questionnaireField.findFirst({
    where: { milestoneDefinitionId: definitionId },
    orderBy: { order: "desc" },
    select: { order: true },
  });

  await db.questionnaireField.create({
    data: {
      label,
      fieldType,
      required,
      helpText,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      options: options as any ?? undefined,
      order: (last?.order ?? -1) + 1,
      milestoneDefinitionId: definitionId,
    },
  });

  revalidatePath(`/admin/milestones/${definitionId}`);
}

export async function updateTemplateField(fieldId: string, definitionId: string, formData: FormData) {
  await requireAdmin();
  const label = (formData.get("label") as string).trim();
  const fieldType = formData.get("fieldType") as FieldType;
  const required = formData.get("required") === "on";
  const helpText = (formData.get("helpText") as string | null)?.trim() || null;
  const options = parseFieldOptions(fieldType, formData);

  await db.questionnaireField.update({
    where: { id: fieldId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { label, fieldType, required, helpText, options: options as any ?? undefined },
  });

  revalidatePath(`/admin/milestones/${definitionId}`);
}

export async function deleteTemplateField(fieldId: string, definitionId: string) {
  await requireAdmin();
  await db.questionnaireField.delete({ where: { id: fieldId } });
  revalidatePath(`/admin/milestones/${definitionId}`);
}

export async function reorderTemplateFields(definitionId: string, orderedIds: string[]) {
  await requireAdmin();
  await db.$transaction(
    orderedIds.map((id, index) =>
      db.questionnaireField.update({ where: { id }, data: { order: index } })
    )
  );
  revalidatePath(`/admin/milestones/${definitionId}`);
}
