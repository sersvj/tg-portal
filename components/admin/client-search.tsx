"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition, useRef } from "react";
import { TextInput, ActionIcon, Button } from "@mantine/core";
import { Search, X, EyeOff, Eye } from "lucide-react";

export function ClientSearch({ showInactive = false }: { showInactive?: boolean }) {
  const router       = useRouter();
  const pathname     = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const query = searchParams.get("q") ?? "";

  function navigate(params: URLSearchParams) {
    startTransition(() => { router.replace(`${pathname}?${params.toString()}`); });
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    const params = new URLSearchParams(searchParams.toString());
    val ? params.set("q", val) : params.delete("q");
    navigate(params);
  }

  function handleClear() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("q");
    navigate(params);
    inputRef.current?.focus();
  }

  function toggleInactive() {
    const params = new URLSearchParams(searchParams.toString());
    showInactive ? params.delete("inactive") : params.set("inactive", "1");
    navigate(params);
  }

  return (
    <>
      <TextInput
        ref={inputRef}
        placeholder="Search clients…"
        defaultValue={query}
        onChange={handleChange}
        leftSection={<Search size={14} />}
        rightSection={
          query ? (
            <ActionIcon variant="subtle" color="gray" size="sm" onClick={handleClear}>
              <X size={13} />
            </ActionIcon>
          ) : null
        }
        size="sm"
        w={260}
        opacity={isPending ? 0.6 : 1}
        style={{ transition: "opacity 0.15s" }}
      />
      <Button
        size="sm"
        variant={showInactive ? "light" : "subtle"}
        color={showInactive ? "yellow" : "gray"}
        leftSection={showInactive ? <Eye size={14} /> : <EyeOff size={14} />}
        onClick={toggleInactive}
        opacity={isPending ? 0.6 : 1}
        style={{ transition: "opacity 0.15s" }}
      >
        {showInactive ? "Hide Inactive" : "Show Inactive"}
      </Button>
    </>
  );
}
