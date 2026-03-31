"use client";

import { useRef, useTransition } from "react";
import { createMilestoneDefinition } from "@/app/(admin)/admin/milestones/actions";
import { Group, TextInput, Select, Button } from "@mantine/core";
import { Plus } from "lucide-react";

const TYPE_OPTIONS = [
  { value: "questionnaire",        label: "Questionnaire" },
  { value: "brand_assets",         label: "Brand Assets" },
  { value: "content_docs",         label: "Content Assets" },
  { value: "supporting_materials", label: "Supporting Materials" },
  { value: "staff_profiles",       label: "Staff Profiles" },
  { value: "page_content",         label: "Page Content" },
];

export function MilestoneDefinitionForm() {
  const formRef    = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      await createMilestoneDefinition(formData);
      formRef.current?.reset();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Group gap="sm" align="flex-end" wrap="wrap">
        <TextInput
          name="name"
          label="Name"
          placeholder="e.g. Brand Questionnaire"
          required
          size="sm"
          style={{ flex: 2, minWidth: 160 }}
        />
        <Select
          name="type"
          label="Type"
          placeholder="Select type…"
          data={TYPE_OPTIONS}
          required
          size="sm"
          style={{ width: 200 }}
          allowDeselect={false}
        />
        <TextInput
          name="description"
          label="Description (optional)"
          placeholder="Short description shown to clients"
          size="sm"
          style={{ flex: 2, minWidth: 160 }}
        />
        <Button
          type="submit"
          size="sm"
          leftSection={<Plus size={14} />}
          loading={pending}
          style={{ marginBottom: 1 }}
        >
          Add
        </Button>
      </Group>
    </form>
  );
}
