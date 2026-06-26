import { Button } from "@mantine/core";
import { IconBrandWhatsapp } from "@tabler/icons-react";

export function WhatsAppButton({ phoneE164 }: { phoneE164: string | null }) {
  if (!phoneE164) return null;

  const href = `https://wa.me/${phoneE164.replace("+", "")}`;

  return (
    <Button
      component="a"
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      color="green"
      leftSection={<IconBrandWhatsapp size={18} />}
      onClick={(e) => e.stopPropagation()}
    >
      WhatsApp
    </Button>
  );
}
