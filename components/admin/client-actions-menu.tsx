"use client";

import { Button, Menu, ActionIcon } from "@mantine/core";
import { Eye, Pencil, PowerOff, Power, MoreHorizontal } from "lucide-react";
import { useRouter } from "next/navigation";
import { enterPortalPreview } from "@/app/(portal)/portal/preview-actions";
import { toggleClientActive } from "@/app/(admin)/admin/clients/[id]/actions";

interface ClientActionsMenuProps {
  clientId: string;
  isActive: boolean;
  editHref: string;
}

export function ClientActionsMenu({ clientId, isActive, editHref }: ClientActionsMenuProps) {
  const router = useRouter();

  return (
    <Menu shadow="md" width={180} position="bottom-end">
      <Menu.Target>
        <ActionIcon
          variant="default"
          size="md"
          aria-label="Client actions"
          style={{ cursor: "pointer" }}
        >
          <MoreHorizontal size={16} />
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Item
          leftSection={<Eye size={14} />}
          onClick={async () => { await enterPortalPreview(clientId); }}
        >
          Preview Portal
        </Menu.Item>
        <Menu.Item
          leftSection={<Pencil size={14} />}
          onClick={() => router.push(editHref)}
        >
          Edit
        </Menu.Item>
        <Menu.Divider />
        <Menu.Item
          leftSection={isActive ? <PowerOff size={14} /> : <Power size={14} />}
          color={isActive ? "yellow" : "green"}
          onClick={async () => { await toggleClientActive(clientId, !isActive); }}
        >
          {isActive ? "Deactivate" : "Reactivate"}
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}
