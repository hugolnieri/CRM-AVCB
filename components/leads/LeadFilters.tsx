import { Group, Select } from "@mantine/core";
import { PIPELINE_STAGES } from "@/lib/pipeline/stages";

export interface LeadFiltersValue {
  stage: string | null;
  origem: string | null;
  cidade: string | null;
}

interface Props {
  value: LeadFiltersValue;
  onChange: (value: LeadFiltersValue) => void;
  /** Origens e cidades presentes nos leads carregados, não uma lista fixa. */
  origemOptions: string[];
  cidadeOptions: string[];
}

export function LeadFilters({ value, onChange, origemOptions, cidadeOptions }: Props) {
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
        label="Origem"
        placeholder="Todas"
        clearable
        searchable
        data={origemOptions}
        value={value.origem}
        onChange={(origem) => onChange({ ...value, origem })}
        style={{ flex: "1 1 180px" }}
      />
      <Select
        label="Cidade"
        placeholder="Todas"
        clearable
        searchable
        data={cidadeOptions}
        value={value.cidade}
        onChange={(cidade) => onChange({ ...value, cidade })}
        style={{ flex: "1 1 180px" }}
      />
    </Group>
  );
}
