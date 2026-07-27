"use client";

import { TextInput } from "@mantine/core";
import { IconSearch } from "@tabler/icons-react";

export function SearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}) {
  return (
    <TextInput
      placeholder={placeholder}
      leftSection={<IconSearch size={16} />}
      value={value}
      onChange={(e) => onChange(e.currentTarget.value)}
    />
  );
}
