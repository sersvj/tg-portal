"use server";

import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { notifyMilestoneComplete } from "@/lib/notifications";
import { redirect } from "next/navigation";
import { logActivity, resolveClientActorName } from "@/lib/activity-log";

const NON_ANSWERABLE = ["PAGE_BREAK", "CONTENT"] as const;

export async function saveQuestionnaireDraft(milestoneId: string, answers: Record<string, unknown>) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      status: "ACTIVE",
      client: { clientUsers: { some: { userId: session.user.id } } },
    },
    include: {
      milestoneDefinition: { select: { name: true } },
      client: { select: { id: true } },
    },
  });

  if (!milestone) throw new Error("Milestone not found or not accessible");

  await db.clientMilestone.update({
    where: { id: milestoneId },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: { draftAnswers: answers as any },
  });

  const draftActorEmail = session.user.email ?? "";
  const draftActorName = await resolveClientActorName(draftActorEmail, milestone.client.id, session.user.name ?? (draftActorEmail || session.user.id));
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName: draftActorName,
    actorEmail: draftActorEmail,
    action: "QUESTIONNAIRE_DRAFT_SAVED",
    clientId: milestone.client.id,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
  });
}

export async function submitQuestionnaire(milestoneId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");

  const milestone = await db.clientMilestone.findFirst({
    where: {
      id: milestoneId,
      status: "ACTIVE",
      milestoneDefinition: { type: "questionnaire" },
      client: { clientUsers: { some: { userId: session.user.id } } },
    },
    include: {
      questionnaireFields: {
        where: { isActive: true },
        orderBy: { order: "asc" },
      },
      client: {
        select: {
          companyName: true,
          primaryAdmin: { select: { email: true } },
        },
      },
      milestoneDefinition: { select: { name: true, type: true } },
    },
  });

  if (!milestone) throw new Error("Milestone not found or not accessible");

  const answerableFields = milestone.questionnaireFields.filter(
    (f) => !(NON_ANSWERABLE as readonly string[]).includes(f.fieldType)
  );

  // Server-side required validation
  for (const field of answerableFields) {
    if (!field.required) continue;
    const val =
      field.fieldType === "MULTISELECT"
        ? formData.getAll(field.id)
        : formData.get(field.id);
    if (!val || (Array.isArray(val) && val.length === 0) || val === "") {
      throw new Error(`"${field.label}" is required`);
    }
  }

  await db.$transaction(async (tx) => {
    const response = await tx.questionnaireResponse.create({
      data: {
        clientMilestoneId: milestoneId,
        submittedByUserId: session.user.id,
      },
    });

    for (const field of answerableFields) {
      let value: unknown;
      if (field.fieldType === "MULTISELECT") {
        value = formData.getAll(field.id);
      } else if (field.fieldType === "BOOLEAN") {
        value = formData.get(field.id) === "on";
      } else if (field.fieldType === "LIKERT") {
        try {
          value = JSON.parse(formData.get(field.id) as string ?? "{}");
        } catch {
          value = {};
        }
      } else {
        value = formData.get(field.id) ?? "";
      }

      await tx.questionnaireAnswer.create({
        data: {
          responseId: response.id,
          fieldId: field.id,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          value: value as any,
        },
      });
    }

    await tx.clientMilestone.update({
      where: { id: milestoneId },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  });

  // Notify primary admin — never throws
  await notifyMilestoneComplete({
    to: milestone.client.primaryAdmin.email,
    clientId: milestone.clientId,
    clientName: milestone.client.companyName,
    milestoneName: milestone.milestoneDefinition.name,
    milestoneType: milestone.milestoneDefinition.type,
  });

  const submitActorEmail = session.user.email ?? "";
  const submitActorName = await resolveClientActorName(submitActorEmail, milestone.clientId, session.user.name ?? (submitActorEmail || session.user.id));
  await logActivity({
    actorType: "CLIENT",
    actorId: session.user.id,
    actorName: submitActorName,
    actorEmail: submitActorEmail,
    action: "QUESTIONNAIRE_SUBMITTED",
    clientId: milestone.clientId,
    subject: { type: "MILESTONE", id: milestoneId, name: milestone.milestoneDefinition.name },
  });

  redirect("/portal");
}
