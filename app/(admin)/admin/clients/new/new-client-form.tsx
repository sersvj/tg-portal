"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { createClient } from "./actions";
import {
  Stack, Group, SimpleGrid, TextInput, Select, Button, Text,
  Alert, Badge, Box, Divider,
} from "@mantine/core";
import { SectionCard } from "@/components/ui/section-card";
import { Plus, Trash2, Upload, X, AlertCircle } from "lucide-react";
import { formatPhoneUS } from "@/lib/phone";

type Admin = { id: string; name: string | null; email: string };

type Contact = {
  id: string;
  name: string;
  title: string;
  phone: string;
  email: string;
};

function newContact(): Contact {
  return { id: crypto.randomUUID(), name: "", title: "", phone: "", email: "" };
}

export function NewClientForm({ admins }: { admins: Admin[] }) {
  const router  = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, setPending] = useState(false);
  const [error, setError]     = useState("");

  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile]       = useState<File | null>(null);
  const [contacts, setContacts]       = useState<Contact[]>([newContact()]);
  const [primaryAdminId, setPrimaryAdminId] = useState(admins[0]?.id ?? "");

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  function updateContact(id: string, field: keyof Contact, value: string) {
    setContacts((prev) => prev.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPending(true);
    try {
      const fd = new FormData(formRef.current!);
      if (logoFile) fd.set("logo", logoFile);
      fd.set("contacts", JSON.stringify(contacts));
      fd.set("primaryAdminId", primaryAdminId);
      await createClient(fd);
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
              required
              style={{ gridColumn: "1 / -1" }}
            />
            <TextInput
              name="industry"
              label="Industry"
              placeholder="e.g. Healthcare"
            />
            <TextInput
              name="website"
              label="Website"
              type="url"
              placeholder="https://acme.com"
            />
          </SimpleGrid>
        </SectionCard>

        {/* Logo upload */}
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
              <Button
                type="button"
                variant="subtle"
                color="red"
                size="xs"
                leftSection={<X size={12} />}
                onClick={() => { setLogoFile(null); setLogoPreview(null); }}
              >
                Remove
              </Button>
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
        >
          <Stack gap={0}>
            {contacts.map((contact, i) => (
              <Box key={contact.id}>
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
                      onChange={(e) => updateContact(contact.id, "name", e.target.value)}
                      required
                    />
                    <TextInput
                      label="Title"
                      placeholder="Marketing Director"
                      value={contact.title}
                      onChange={(e) => updateContact(contact.id, "title", e.target.value)}
                    />
                    <TextInput
                      label="Email"
                      type="email"
                      placeholder="jane@acme.com"
                      value={contact.email}
                      onChange={(e) => updateContact(contact.id, "email", e.target.value)}
                      required
                    />
                    <TextInput
                      label="Phone"
                      type="tel"
                      placeholder="(555) 000-0000"
                      value={contact.phone}
                      onChange={(e) => updateContact(contact.id, "phone", formatPhoneUS(e.target.value))}
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
                      onClick={() => setContacts((prev) => prev.filter((c) => c.id !== contact.id))}
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
            onClick={() => router.push("/admin/clients")}
          >
            Cancel
          </Button>
          <Button type="submit" loading={pending}>
            Create client
          </Button>
        </Group>

      </Stack>
    </form>
  );
}
