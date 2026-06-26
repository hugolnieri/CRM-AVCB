import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/notifications/styles.css";
import "./globals.css";

import type { Metadata } from "next";
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "CRM AVCB",
  description: "CRM de prospecção e renovação de AVCB",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
