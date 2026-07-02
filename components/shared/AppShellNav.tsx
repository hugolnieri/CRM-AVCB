"use client";

import {
  AppShell,
  NavLink,
  Group,
  Title,
  Button,
  Burger,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconLayoutDashboard,
  IconUpload,
  IconLayoutKanban,
  IconList,
  IconUsers,
  IconReportAnalytics,
  IconCalendarClock,
  IconLogout,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: IconLayoutDashboard },
  { href: "/agenda", label: "Agenda", icon: IconCalendarClock },
  { href: "/import", label: "Importar", icon: IconUpload },
  { href: "/leads", label: "Leads", icon: IconList },
  { href: "/kanban", label: "Pipeline", icon: IconLayoutKanban },
  { href: "/clientes", label: "Clientes", icon: IconUsers },
  { href: "/relatorios", label: "Relatórios", icon: IconReportAnalytics },
];

export function AppShellNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });

  function toggleColorScheme() {
    setColorScheme(computedColorScheme === "dark" ? "light" : "dark");
  }

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 220,
        breakpoint: "sm",
        collapsed: { mobile: !mobileOpened },
      }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={mobileOpened} onClick={toggleMobile} hiddenFrom="sm" size="sm" />
            <Title order={4}>SEICO</Title>
          </Group>
          <Group gap="xs">
            <ActionIcon
              variant="subtle"
              color="gray"
              size="lg"
              onClick={toggleColorScheme}
              aria-label="Alternar modo claro/escuro"
            >
              {computedColorScheme === "dark" ? <IconSun size={18} /> : <IconMoon size={18} />}
            </ActionIcon>
            <Button
              variant="subtle"
              color="gray"
              leftSection={<IconLogout size={16} />}
              onClick={handleLogout}
            >
              Sair
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="md">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.href}
            component={Link}
            href={item.href}
            label={item.label}
            leftSection={<item.icon size={18} />}
            active={pathname.startsWith(item.href)}
            onClick={closeMobile}
          />
        ))}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
