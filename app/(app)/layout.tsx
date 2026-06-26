import { AppShellNav } from "@/components/shared/AppShellNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return <AppShellNav>{children}</AppShellNav>;
}
