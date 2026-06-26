import { Timeline, Text, Skeleton, Stack } from "@mantine/core";
import { IconNote, IconPhone, IconBrandWhatsapp, IconMapPin, IconArrowsExchange } from "@tabler/icons-react";
import dayjs from "dayjs";
import type { Activity, ActivityType } from "@/types/activity";

const ICONS: Record<ActivityType, React.ReactNode> = {
  note: <IconNote size={14} />,
  call: <IconPhone size={14} />,
  whatsapp: <IconBrandWhatsapp size={14} />,
  visit: <IconMapPin size={14} />,
  stage_change: <IconArrowsExchange size={14} />,
};

const TITLES: Record<ActivityType, string> = {
  note: "Nota",
  call: "Ligação",
  whatsapp: "WhatsApp",
  visit: "Visita",
  stage_change: "Mudança de etapa",
};

interface Props {
  activities: Activity[] | undefined;
  loading: boolean;
}

export function ActivityTimeline({ activities, loading }: Props) {
  if (loading) {
    return (
      <Stack>
        <Skeleton height={40} />
        <Skeleton height={40} />
      </Stack>
    );
  }

  if (!activities || activities.length === 0) {
    return <Text c="dimmed">Nenhuma atividade registrada ainda.</Text>;
  }

  return (
    <Timeline active={activities.length} bulletSize={22} lineWidth={2}>
      {activities.map((activity) => (
        <Timeline.Item key={activity.id} bullet={ICONS[activity.activityType]} title={TITLES[activity.activityType]}>
          {activity.body && <Text size="sm">{activity.body}</Text>}
          <Text size="xs" c="dimmed" mt={4}>
            {dayjs(activity.createdAt).format("DD/MM/YYYY HH:mm")}
          </Text>
        </Timeline.Item>
      ))}
    </Timeline>
  );
}
