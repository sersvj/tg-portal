import { createTheme, type MantineColorsTuple } from "@mantine/core";

// ── Brand orange — used ONLY for TG identity elements (logo, brand label) ────
const orange: MantineColorsTuple = [
  "#FFF7ED", "#FFEDD5", "#FED7AA", "#FDBA74", "#FB923C",
  "#F97316", "#EA580C", "#C2410C", "#9A3412", "#7C2D12",
];

// ── Primary action blue ───────────────────────────────────────────────────────
const blue: MantineColorsTuple = [
  "#EFF6FF", "#DBEAFE", "#BFDBFE", "#93C5FD", "#60A5FA",
  "#3B82F6", "#2563EB", "#1D4ED8", "#1E40AF", "#1E3A8A",
];

// ── Success green ─────────────────────────────────────────────────────────────
const green: MantineColorsTuple = [
  "#F0FDF4", "#DCFCE7", "#BBF7D0", "#86EFAC", "#4ADE80",
  "#22C55E", "#16A34A", "#15803D", "#166534", "#14532D",
];

// ── Danger red ────────────────────────────────────────────────────────────────
const red: MantineColorsTuple = [
  "#FFF1F2", "#FFE4E6", "#FECDD3", "#FDA4AF", "#FB7185",
  "#F43F5E", "#E11D48", "#BE123C", "#9F1239", "#881337",
];

// ── Special violet (milestone type badges, etc.) ──────────────────────────────
const violet: MantineColorsTuple = [
  "#F5F3FF", "#EDE9FE", "#DDD6FE", "#C4B5FD", "#A78BFA",
  "#8B5CF6", "#7C3AED", "#6D28D9", "#5B21B6", "#4C1D95",
];

// ── Neutral greys ─────────────────────────────────────────────────────────────
const gray: MantineColorsTuple = [
  "#F9FAFB", "#F3F4F6", "#E5E7EB", "#D1D5DB", "#9CA3AF",
  "#6B7280", "#4B5563", "#374151", "#1F2937", "#111827",
];

export const theme = createTheme({
  // ── Identity
  primaryColor: "blue",
  primaryShade: { light: 6 },

  // ── Palette
  colors: { orange, blue, green, red, violet, gray },

  // ── Typography
  fontFamily:
    "var(--font-inter), ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
  fontFamilyMonospace: 'ui-monospace, "Cascadia Code", "Fira Code", monospace',
  fontSmoothing: true,

  // ── Shape — clean & sharp
  defaultRadius: "sm",
  radius: { xs: "2px", sm: "4px", md: "6px", lg: "10px", xl: "16px" },

  // ── Spacing
  spacing: { xs: "6px", sm: "10px", md: "16px", lg: "24px", xl: "40px" },

  // ── Elevation
  shadows: {
    xs: "0 1px 2px rgba(0,0,0,0.05)",
    sm: "0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.04)",
    md: "0 4px 6px rgba(0,0,0,0.07), 0 2px 4px rgba(0,0,0,0.04)",
    lg: "0 10px 15px rgba(0,0,0,0.08), 0 4px 6px rgba(0,0,0,0.04)",
    xl: "0 20px 25px rgba(0,0,0,0.10), 0 8px 10px rgba(0,0,0,0.05)",
  },

  // ── Component-level defaults & overrides
  components: {
    // Buttons — always semibold, consistent height
    Button: {
      defaultProps: { radius: "sm" },
      styles: {
        root: { fontWeight: 600, letterSpacing: "-0.01em" },
      },
    },

    // Inputs — consistent border treatment
    TextInput: {
      defaultProps: { radius: "sm" },
      styles: { input: { fontWeight: 400 } },
    },
    PasswordInput: { defaultProps: { radius: "sm" } },
    Textarea: { defaultProps: { radius: "sm" } },
    Select: { defaultProps: { radius: "sm" } },
    NumberInput: { defaultProps: { radius: "sm" } },
    MultiSelect: { defaultProps: { radius: "sm" } },

    // Paper / Card — always has a border, minimal shadow
    Paper: {
      defaultProps: { radius: "sm", withBorder: true },
    },

    // AppShell — white main, white nav, white header — grey borders
    AppShell: {
      styles: {
        root: { backgroundColor: "var(--mantine-color-gray-0)" },
        main: { backgroundColor: "var(--mantine-color-gray-0)" },
        navbar: {
          backgroundColor: "var(--mantine-color-white)",
          borderRight: "1px solid var(--mantine-color-gray-2)",
        },
        header: {
          backgroundColor: "var(--mantine-color-white)",
          borderBottom: "1px solid var(--mantine-color-gray-2)",
        },
      },
    },

    // NavLink — used in sidebar
    NavLink: {
      defaultProps: { radius: "sm" },
      styles: {
        root: { fontWeight: 500 },
        label: { fontSize: "14px" },
      },
    },

    // Badges — use light variant by default
    Badge: {
      defaultProps: { radius: "sm", variant: "light" },
      styles: { root: { fontWeight: 600, letterSpacing: "0.02em" } },
    },

    // Table headers — uppercase, spaced labels
    Table: {
      styles: {
        th: {
          fontSize: "11px",
          fontWeight: 700,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "var(--mantine-color-gray-5)",
          paddingTop: "10px",
          paddingBottom: "10px",
        },
      },
    },

    // Notifications — top-right, rounded
    Notification: {
      defaultProps: { radius: "sm" },
    },

    // Modal — centered, shadow
    Modal: {
      defaultProps: { radius: "md", centered: true },
    },

    // Tabs — clean underline style
    Tabs: {
      defaultProps: { variant: "default" },
    },

    // Divider — standard grey
    Divider: {
      defaultProps: { color: "gray.2" },
    },

    // ActionIcon — consistent sizing
    ActionIcon: {
      defaultProps: { radius: "sm", variant: "subtle" },
    },

    // Anchor links
    Anchor: {
      defaultProps: { underline: "hover" },
    },
  },

  // ── Interactions
  cursorType: "pointer",
  focusRing: "auto",
  respectReducedMotion: true,
});

// ── Semantic color aliases for use in components ──────────────────────────────
// Import and use these instead of hard-coded hex values anywhere.
export const BRAND = {
  orange: "#EA580C",   // TG brand only — logo, "Powered by Tayloe/Gray"
} as const;

export const STATUS = {
  active:    "blue",
  completed: "green",
  locked:    "gray",
  error:     "red",
  special:   "violet",
} as const;

export const MILESTONE_TYPE_COLOR: Record<string, string> = {
  questionnaire:        "blue",
  brand_assets:         "violet",
  content_docs:         "gray",
  supporting_materials: "green",
};
