"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SegmentedControl } from "@mantine/core";

interface Tab {
  value: string;
  label: string;
}

export function PageTabBar({ tabs, defaultTab }: { tabs: Tab[]; defaultTab: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = searchParams.get("tab") ?? defaultTab;

  return (
    <SegmentedControl
      size="xs"
      value={active}
      onChange={(value) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value === defaultTab) params.delete("tab");
        else params.set("tab", value);
        const qs = params.toString();
        router.push(qs ? `${pathname}?${qs}` : pathname);
      }}
      data={tabs}
    />
  );
}
