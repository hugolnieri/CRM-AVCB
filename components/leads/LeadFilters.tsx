import { Group, Select } from "@mantine/core";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";
import { AVCB_STATUSES } from "@/lib/pipeline/avcbStatus";

export interface LeadFiltersValue {
  stage: string | null;
  avcbStatus: string | null;
  category: string | null;
}

interface Props {
  value: LeadFiltersValue;
  onChange: (value: LeadFiltersValue) => void;
  categoryOptions: string[];
}

export function LeadFilters({ value, onChange, categoryOptions }: Props) {
  return (
    <Group align="flex-end" grow={false} wrap="wrap">
      <Select
        label="Etapa"
        placeholder="Todas"
        clearable
        data={PIPELINE_STAGES.map((s) => ({ value: s.value, label: s.label }))}
        value={value.stage}
        onChange={(stage) => onChange({ ...value, stage })}
        style={{ flex: "1 1 180px" }}
      />
      <Select
        label="Status AVCB"
        placeholder="Todos"
        clearable
        data={AVCB_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        value={value.avcbStatus}
        onChange={(avcbStatus) => onChange({ ...value, avcbStatus })}
        style={{ flex: "1 1 180px" }}
      />
      <Select
        label="Categoria"
        placeholder="Todas"
        clearable
        searchable
        data={categoryOptions}
        value={value.category}
        onChange={(category) => onChange({ ...value, category })}
        style={{ flex: "1 1 180px" }}
      />
    </Group>
  );
}
