"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { updateClient } from "@/app/(admin)/admin/clients/[id]/actions";
import {
  Stack, Group, SimpleGrid, TextInput, Select, Button, Text,
  Alert, ActionIcon, Badge, Box, Divider,
} from "@mantine/core";
import { SectionCard } from "@/components/ui/section-card";
import { Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import { formatPhoneUS } from "@/lib/phone";

type Admin = { id: string; name: string | null; email: string };

type Contact = {
  tempId: string;
  name: string;
  title: string;
  phone: string;
  email: string;
};

type DefaultValues = {
  id: string;
  companyName: string;
  industry: string | null;
  website: string | null;
  logoUrl: string | null;
  primaryAdminId: string;
  contacts: { name: string; title: string | null; phone: string | null; email: string }[];
};

function newContact(): Contact {
  return { tempId: crypto.randomUUID(), name: "", title: "", phone: "", email: "" };
}

export function EditClientForm({
  admins,
  defaultValues,
}: {
  admins: Admin[];
  defaultValues: DefaultValues;
}) {
  const router  = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState("");

  const [logoPreview, setLogoPreview] = useState<string | null>(defaultValues.logoUrl);
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [removeLogo, setRemoveLogo]   = useState(false);

  const [contacts, setContacts] = useState<Contact[]>(
    defaultValues.contacts.length > 0
      ? defaultValues.contacts.map((c) => ({
          tempId: crypto.randomUUID(),
          name:  c.name,
          title: c.title  ?? "",
          phone: c.phone  ?? "",
          email: c.email,
        }))
      : [newContact()]
  );

  const [primaryAdminId, setPrimaryAdminId] = useState(defaultValues.primaryAdminId);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
    setRemoveLogo(false);
  }

  function handleRemoveLogo() {
    setLogoFile(null);
    setLogoPreview(null);
    setRemoveLogo(true);
  }

  function updateContactField(tempId: string, field: keyof Contact, value: string) {
    setContacts((prev) => prev.map((c) => (c.tempId === tempId ? { ...c, [field]: value } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const fd = new FormData(formRef.current!);
      if (logoFile) fd.set("logo", logoFile);
      fd.set("removeLogo", removeLogo ? "true" : "false");
      fd.set("contacts", JSON.stringify(contacts));
      fd.set("primaryAdminId", primaryAdminId);
      await updateClient(defaultValues.id, fd);
      router.push(`/admin/clients/${defaultValues.id}`);
      router.refresh();
    } catch (err: unknown) {
      setPending(false);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    }
  }

  const adminOptions = admins.map((a) => ({ value: a.id, label: a.name ?? a.email }));

  return (
    <form ref={formRef} onSubmit={handleSubmit}>
      <Stack gap="lg">

        {/* Company info */}
        <SectionCard title="Company Information">
          <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
            <TextInput
              name="companyName"
              label="Company Name"
              placeholder="Acme Corp"
              defaultValue={defaultValues.companyName}
              required
              style={{ gridColumn: "1 / -1" }}
            />
            <TextInput
              name="industry"
              label="Industry"
              placeholder="e.g. Healthcare"
              defaultValue={defaultValues.industry ?? ""}
            />
            <TextInput
              name="website"
              label="Website"
              type="url"
              placeholder="https://acme.com"
              defaultValue={defaultValues.website ?? ""}
            />
          </SimpleGrid>
        </SectionCard>

        {/* Logo */}
        <SectionCard
          title="Company Logo"
          description="PNG or SVG recommended. Shown in the client portal."
        >
          {logoPreview ? (
            <Group gap="md" align="center">
              <Box
                style={{
                  width: 64, height: 64,
                  border: "1px solid var(--mantine-color-gray-2)",
                  borderRadius: 4,
                  overflow: "hidden",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: "var(--mantine-color-gray-0)",
                }}
              >
                <Image src={logoPreview} alt="Logo preview" width={64} height={64} style={{ objectFit: "contain" }} />
              </Box>
              <Stack gap={6}>
                <Button
                  component="label"
                  variant="default"
                  size="xs"
                  leftSection={<Upload size={12} />}
                  style={{ cursor: "pointer" }}
                >
                  Replace
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
                </Button>
                <Button
                  variant="subtle"
                  color="red"
                  size="xs"
                  leftSection={<X size={12} />}
                  onClick={handleRemoveLogo}
                >
                  Remove
                </Button>
              </Stack>
            </Group>
          ) : (
            <Box
              component="label"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                height: 96,
                border: "2px dashed var(--mantine-color-gray-3)",
                borderRadius: 4,
                cursor: "pointer",
                transition: "background 0.15s",
              }}
            >
              <Upload size={16} style={{ color: "var(--mantine-color-gray-5)", marginBottom: 6 }} />
              <Text size="xs" fw={500} c="gray.6">Click to upload</Text>
              <Text size="xs" c="gray.4">PNG, JPG, SVG up to 2MB</Text>
              <input type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoChange} />
            </Box>
          )}
        </SectionCard>

        {/* Primary admin */}
        <SectionCard
          title="Primary Admin"
          description="Receives notifications when the client completes milestones."
        >
          <Select
            label="Assign Admin"
            data={adminOptions}
            value={primaryAdminId}
            onChange={(v) => setPrimaryAdminId(v ?? "")}
            required
            allowDeselect={false}
            style={{ maxWidth: 320 }}
          />
        </SectionCard>

        {/* Contacts */}
        <SectionCard
          title="Contacts"
          description="The first contact is marked as primary."
          actions={
            <Button
              type="button"
              variant="default"
              size="xs"
              leftSection={<Plus size={12} />}
              onClick={() => setContacts((prev) => [...prev, newContact()])}
            >
              Add contact
            </Button>
          }
          noPadding={false}
        >
          <Stack gap={0}>
            {contacts.map((contact, i) => (
              <Box key={contact.tempId}>
                {i > 0 && <Divider mb="md" />}
                <Box style={{ position: "relative" }}>
                  {i === 0 && (
                    <Badge
                      color="blue"
                      variant="light"
                      size="xs"
                      style={{ position: "absolute", top: 0, right: 0 }}
                    >
                      Primary
                    </Badge>
                  )}
                  <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="sm">
                    <TextInput
                      label="Name"
                      placeholder="Jane Smith"
                      value={contact.name}
                      onChange={(e) => updateContactField(contact.tempId, "name", e.target.value)}
                      required
                    />
                    <TextInput
                      label="Title"
                      placeholder="Marketing Director"
                      value={contact.title}
                      onChange={(e) => updateContactField(contact.tempId, "title", e.target.value)}
                    />
                    <TextInput
                      label="Email"
                      type="email"
                      placeholder="jane@acme.com"
                      value={contact.email}
                      onChange={(e) => updateContactField(contact.tempId, "email", e.target.value)}
                      required
                    />
                    <TextInput
                      label="Phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={contact.phone}
                      onChange={(e) => updateContactField(contact.tempId, "phone", formatPhoneUS(e.target.value))}
                    />
                  </SimpleGrid>
                  {contacts.length > 1 && (
                    <Button
                      type="button"
                      variant="subtle"
                      color="red"
                      size="xs"
                      leftSection={<Trash2 size={12} />}
                      mt="sm"
                      onClick={() => setContacts((prev) => prev.filter((c) => c.tempId !== contact.tempId))}
                    >
                      Remove contact
                    </Button>
                  )}
                </Box>
              </Box>
            ))}
          </Stack>
        </SectionCard>

        {error && (
          <Alert icon={<AlertCircle size={14} />} color="red">
            {error}
          </Alert>
        )}

        <Group justify="flex-end" gap="sm" pb="xl">
          <Button
            type="button"
            variant="default"
            onClick={() => router.push(`/admin/clients/${defaultValues.id}`)}
          >
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Save changes
          </Button>
        </Group>

      </Stack>
    </form>
  );
}
