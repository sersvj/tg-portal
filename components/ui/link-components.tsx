"use client";

/**
 * RSC-safe navigation wrappers.
 *
 * Mantine components like Button/ActionIcon/Anchor/Box accept a `component` prop
 * that lets them render as another element. Passing `component={Link}` from a
 * Server Component fails because Next.js can't serialize function references
 * across the RSC boundary.
 *
 * These thin client wrappers embed the Link binding internally so server
 * components only pass serializable props (strings, primitives) to them.
 */

import Link from "next/link";
import {
  Button,    type ButtonProps,
  ActionIcon, type ActionIconProps,
  Anchor,    type AnchorProps,
  Box,       type BoxProps,
} from "@mantine/core";
import type { ReactNode } from "react";

// ── LinkButton ────────────────────────────────────────────────────────────────

type LinkButtonProps = Omit<ButtonProps, "component" | "href"> & {
  href: string;
  children?: ReactNode;
};

export function LinkButton({ href, children, ...props }: LinkButtonProps) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  );
}

// ── LinkActionIcon ────────────────────────────────────────────────────────────

type LinkActionIconProps = Omit<ActionIconProps, "component" | "href"> & {
  href: string;
  children?: ReactNode;
};

export function LinkActionIcon({ href, children, ...props }: LinkActionIconProps) {
  return (
    <ActionIcon component={Link} href={href} {...props}>
      {children}
    </ActionIcon>
  );
}

// ── LinkAnchor ────────────────────────────────────────────────────────────────

type LinkAnchorProps = Omit<AnchorProps, "component" | "href"> & {
  href: string;
  children?: ReactNode;
};

export function LinkAnchor({ href, children, ...props }: LinkAnchorProps) {
  return (
    <Anchor component={Link} href={href} {...props}>
      {children}
    </Anchor>
  );
}

// ── LinkBox ───────────────────────────────────────────────────────────────────

type LinkBoxProps = Omit<BoxProps, "component" | "href"> & {
  href: string;
  style?: React.CSSProperties;
  children?: ReactNode;
};

export function LinkBox({ href, children, ...props }: LinkBoxProps) {
  return (
    <Box component={Link} href={href} {...props}>
      {children}
    </Box>
  );
}
