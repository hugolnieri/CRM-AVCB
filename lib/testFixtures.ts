import type { Cliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";
import type { Servico, TipoServico } from "@/types/servico";

/**
 * Fixtures compartilhadas pelos testes de lógica pura. Ficam num módulo só
 * porque as entidades têm campos demais para cada arquivo de teste redeclarar —
 * e porque assim adicionar um campo ao domínio quebra um lugar, não seis.
 *
 * Não é um arquivo de teste: o padrão de include do Vitest é *.test.ts.
 */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Metalúrgica Ki Jóia",
    cnpj: "12345678000199",
    cnae: null,
    cnaeDescricao: null,
    contatoNome: "João Pilon",
    phoneRaw: "(15) 3284-2586",
    phoneE164: "+551532842586",
    email: "contato@kijoia.com.br",
    address: "Av. Pref. Antônio Souto, 1148",
    cidade: "Cerquilho",
    uf: "SP",
    origem: "indicacao",
    interesse: "NR-35 e NR-33",
    possiveisServicos: null,
    valorEstimado: null,
    pipelineStage: "novo_lead",
    followUpAt: null,
    followUpNote: null,
    position: 0,
    assignedUserId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeCliente(overrides: Partial<Cliente> = {}): Cliente {
  return {
    id: "cliente-1",
    razaoSocial: "Metalúrgica Ki Jóia Ltda",
    nomeFantasia: "Ki Jóia",
    cnpj: "12345678000199",
    cnae: null,
    cnaeDescricao: null,
    telefone: "(15) 3284-2586",
    telefoneE164: "+551532842586",
    email: "contato@kijoia.com.br",
    contatoNome: "João Pilon",
    contatoCargo: "Gerente de SST",
    endereco: "Av. Pref. Antônio Souto, 1148",
    cidade: "Cerquilho",
    uf: "SP",
    cep: "18520-000",
    status: "ativo",
    observacoes: null,
    possiveisServicos: null,
    leadId: null,
    responsavelId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTipoServico(overrides: Partial<TipoServico> = {}): TipoServico {
  return {
    id: "tipo-1",
    nome: "Trabalho em Altura",
    sigla: "NR-35",
    categoria: "treinamento",
    cnaes: null,
    validadeMeses: 24,
    cargaHoraria: 8,
    ativo: true,
    ordem: 10,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

/** Por padrão um serviço já realizado, que é o caso mais comum nos testes. */
export function makeServico(overrides: Partial<Servico> = {}): Servico {
  return {
    id: "servico-1",
    clienteId: "cliente-1",
    tipoServicoId: "tipo-1",
    tipoNome: "Trabalho em Altura",
    status: "realizado",
    dataAgendada: null,
    dataRealizacao: "2026-01-15",
    dataVencimento: "2028-01-15",
    participantes: 12,
    instrutor: null,
    responsavelId: null,
    observacoes: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    ...overrides,
  };
}
