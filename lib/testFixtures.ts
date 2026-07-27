import type { Cliente } from "@/types/cliente";
import type { Lead } from "@/types/lead";
import type { Servico } from "@/types/servico";
import type { TipoTreinamento, Treinamento } from "@/types/treinamento";

/**
 * Fixtures compartilhadas pelos testes de lógica pura. Ficam num módulo só
 * porque `Lead` (e as entidades que virão) tem campos demais para cada arquivo
 * de teste redeclarar — e porque assim adicionar um campo ao domínio quebra um
 * lugar, não seis.
 *
 * Não é um arquivo de teste: o padrão de include do Vitest é *.test.ts.
 */
export function makeLead(overrides: Partial<Lead> = {}): Lead {
  return {
    id: "lead-1",
    name: "Metalúrgica Ki Jóia",
    cnpj: "12345678000199",
    contatoNome: "João Pilon",
    phoneRaw: "(15) 3284-2586",
    phoneE164: "+551532842586",
    email: "contato@kijoia.com.br",
    address: "Av. Pref. Antônio Souto, 1148",
    cidade: "Cerquilho",
    uf: "SP",
    origem: "indicacao",
    interesse: "NR-35 e NR-33",
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
    leadId: null,
    responsavelId: null,
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTipoTreinamento(overrides: Partial<TipoTreinamento> = {}): TipoTreinamento {
  return {
    id: "tipo-1",
    nome: "Trabalho em Altura",
    sigla: "NR-35",
    validadeMeses: 24,
    cargaHoraria: 8,
    ativo: true,
    ordem: 10,
    createdAt: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

export function makeTreinamento(overrides: Partial<Treinamento> = {}): Treinamento {
  return {
    id: "treinamento-1",
    clienteId: "cliente-1",
    tipoTreinamentoId: "tipo-1",
    tipoNome: "Trabalho em Altura",
    dataRealizacao: "2026-01-15",
    dataVencimento: "2028-01-15",
    participantes: 12,
    instrutor: null,
    observacoes: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    ...overrides,
  };
}

export function makeServico(overrides: Partial<Servico> = {}): Servico {
  return {
    id: "servico-1",
    clienteId: "cliente-1",
    tipo: "Manutenção de extintores",
    data: "2026-01-15",
    dataProxima: "2027-01-15",
    responsavelId: null,
    observacoes: null,
    createdAt: "2026-01-15T00:00:00Z",
    updatedAt: "2026-01-15T00:00:00Z",
    ...overrides,
  };
}
