import { AppShellNav } from "@/components/shared/AppShellNav";
import { AuthListener } from "@/components/shared/AuthListener";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <AuthListener />
      <AppShellNav>{children}</AppShellNav>
    </>
  );
}
