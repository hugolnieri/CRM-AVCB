"use client";

import {
  AppShell,
  NavLink,
  Group,
  Title,
  Button,
  Burger,
  ActionIcon,
  Divider,
  useMantineColorScheme,
  useComputedColorScheme,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconLayoutDashboard,
  IconLayoutKanban,
  IconList,
  IconUsers,
  IconReportAnalytics,
  IconCalendarClock,
  IconAlertTriangle,
  IconCertificate,
  IconTool,
  IconSettings,
  IconLogout,
  IconSun,
  IconMoon,
} from "@tabler/icons-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useCurrentMember } from "@/hooks/useCurrentMember";

/**
 * Os grupos existem porque a lista passou de 10 itens e virou uma parede.
 * `adminOnly` esconde o item; a barreira real é a RLS (ver
 * supabase/migrations/0002_auth_rls.sql), não este campo.
 */
const NAV_GROUPS: {
  label: string;
  items: { href: string; label: string; icon: typeof IconList; adminOnly?: boolean }[];
}[] = [
  {
    label: "Operação",
    items: [
      { href: "/dashboard", label: "Painel", icon: IconLayoutDashboard },
      { href: "/vencimentos", label: "Vencimentos", icon: IconAlertTriangle },
      { href: "/agenda", label: "Agenda", icon: IconCalendarClock },
    ],
  },
  {
    label: "Cadastros",
    items: [
      { href: "/clientes", label: "Clientes", icon: IconUsers },
      { href: "/treinamentos", label: "Treinamentos", icon: IconCertificate },
      { href: "/servicos", label: "Serviços", icon: IconTool },
    ],
  },
  {
    label: "Comercial",
    items: [
      { href: "/leads", label: "Leads", icon: IconList },
      { href: "/kanban", label: "Pipeline", icon: IconLayoutKanban },
      { href: "/relatorios", label: "Relatórios", icon: IconReportAnalytics },
    ],
  },
  {
    label: "",
    items: [{ href: "/admin", label: "Administração", icon: IconSettings, adminOnly: true }],
  },
];

export function AppShellNav({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpened, { toggle: toggleMobile, close: closeMobile }] = useDisclosure(false);
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme("light", { getInitialValueInEffect: true });
  const { data: member } = useCurrentMember();
  const isAdmin = member?.role === "admin";

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
        {NAV_GROUPS.map((group) => {
          const items = group.items.filter((item) => !item.adminOnly || isAdmin);
          if (items.length === 0) return null;

          return (
            <div key={group.label || "sem-grupo"}>
              <Divider
                label={group.label || undefined}
                labelPosition="left"
                my="xs"
                styles={{ label: { fontSize: 11, textTransform: "uppercase" } }}
              />
              {items.map((item) => (
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
            </div>
          );
        })}
      </AppShell.Navbar>

      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
