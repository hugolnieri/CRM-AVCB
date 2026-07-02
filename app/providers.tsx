"use client";

import { useState } from "react";
import { MantineProvider } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import { Notifications } from "@mantine/notifications";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "dayjs/locale/pt-br";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>
        <DatesProvider settings={{ locale: "pt-br", firstDayOfWeek: 0 }}>
          <Notifications />
          {children}
        </DatesProvider>
      </MantineProvider>
    </QueryClientProvider>
  );
}
