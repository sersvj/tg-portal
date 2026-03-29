import { Paintbrush, Globe, Layers, Presentation, ExternalLink } from "lucide-react";
import { Text, Box, Stack } from "@mantine/core";
import { BRAND } from "@/lib/theme";

type ClientLink = {
  id: string;
  type: string;
  title: string;
  url: string;
  description: string | null;
};

const TYPE_CONFIG: Record<string, {
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>;
  color: string;
}> = {
  WEBSITE_DESIGN:   { icon: Paintbrush,   color: "var(--mantine-color-violet-6)" },
  STAGING_WEBSITE:  { icon: Globe,        color: "var(--mantine-color-blue-6)"   },
  DESIGN_MATERIALS: { icon: Layers,       color: "var(--mantine-color-grape-6)"  },
  PRESENTATION:     { icon: Presentation, color: "var(--mantine-color-teal-6)"   },
};

function LinkCard({ link }: { link: ClientLink }) {
  const config = TYPE_CONFIG[link.type] ?? TYPE_CONFIG.WEBSITE_DESIGN;
  const Icon = config.icon;

  return (
    <a
      href={link.url}
      target="_blank"
      rel="noopener noreferrer"
      className="portal-resource-btn"
    >
      <Box
        style={{
          background: "var(--mantine-color-gray-1)",
          borderRadius: 4,
          padding: "14px 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
          cursor: "pointer",
        }}
      >
        {/* Type icon */}
        <Box style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <Icon size={22} style={{ color: config.color }} />
        </Box>

        {/* Text */}
        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" fw={600} c="gray.9" lh={1.3}>
            {link.title}
          </Text>
          {link.description && (
            <Text size="xs" lh={1.4} mt={3} c="gray.6">
              {link.description}
            </Text>
          )}
        </Box>

        {/* External link indicator */}
        <Box style={{ flexShrink: 0, display: "flex", alignItems: "center" }}>
          <ExternalLink size={14} style={{ color: "var(--mantine-color-gray-4)" }} />
        </Box>
      </Box>
    </a>
  );
}

export function ClientLinks({ links }: { links: ClientLink[] }) {
  if (links.length === 0) return null;

  return (
    <Stack gap={0}>
      <Text
        size="xs"
        fw={700}
        tt="uppercase"
        lts="0.1em"
        c="gray.9"
        mb="sm"
      >
        From Tayloe
        <Text component="span" style={{ color: BRAND.orange }}> / </Text>
        Gray
      </Text>
      <Stack gap="xs">
        {links.map((link) => (
          <LinkCard key={link.id} link={link} />
        ))}
      </Stack>
    </Stack>
  );
}
