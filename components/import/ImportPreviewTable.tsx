import { Badge, Table } from "@mantine/core";
import type { ParsedLead } from "@/types/lead";

interface Props {
  leads: ParsedLead[];
  existingKeys: Set<string>;
}

export function ImportPreviewTable({ leads, existingKeys }: Props) {
  return (
    <Table.ScrollContainer minWidth={600}>
    <Table striped highlightOnHover withTableBorder>
      <Table.Thead>
        <Table.Tr>
          <Table.Th>Status</Table.Th>
          <Table.Th>Nome</Table.Th>
          <Table.Th>Categoria</Table.Th>
          <Table.Th>Endereço</Table.Th>
          <Table.Th>Telefone</Table.Th>
        </Table.Tr>
      </Table.Thead>
      <Table.Tbody>
        {leads.map((lead) => {
          const isExisting = existingKeys.has(lead.placeId ?? lead.mapsUrl);
          return (
            <Table.Tr key={lead.placeId ?? lead.mapsUrl}>
              <Table.Td>
                {isExisting ? (
                  <Badge color="gray">Já existe</Badge>
                ) : (
                  <Badge color="green">Novo</Badge>
                )}
              </Table.Td>
              <Table.Td>{lead.name}</Table.Td>
              <Table.Td>{lead.category ?? "—"}</Table.Td>
              <Table.Td>{lead.address ?? "—"}</Table.Td>
              <Table.Td>{lead.phoneRaw ?? "—"}</Table.Td>
            </Table.Tr>
          );
        })}
      </Table.Tbody>
    </Table>
    </Table.ScrollContainer>
  );
}
