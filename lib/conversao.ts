import type { Cliente, ClienteInput } from "@/types/cliente";
import type { Lead } from "@/types/lead";

/**
 * Rascunho de cliente a partir de um lead ganho. Só transporta o que os dois
 * domínios têm em comum; o resto (razão social formal, cargo do contato, CEP) o
 * usuário completa no formulário antes de salvar.
 *
 * `lead.name` vai para razaoSocial porque é o único nome que temos, mesmo que na
 * prática costume ser o nome fantasia — é o que o usuário vai corrigir na tela.
 */
export function leadToClienteDraft(lead: Lead): Partial<ClienteInput> & { razaoSocial: string } {
  return {
    razaoSocial: lead.name,
    nomeFantasia: null,
    cnpj: lead.cnpj,
    telefone: lead.phoneRaw,
    telefoneE164: lead.phoneE164,
    email: lead.email,
    contatoNome: lead.contatoNome,
    contatoCargo: null,
    endereco: lead.address,
    cidade: lead.cidade,
    uf: lead.uf,
    cep: null,
    status: "ativo",
    observacoes: lead.interesse ? `Interesse original: ${lead.interesse}` : null,
    leadId: lead.id,
    responsavelId: lead.assignedUserId,
  };
}

/** O lead já virou cliente? Usado para trocar o botão por um link no detalhe. */
export function clienteDoLead(clientes: Cliente[], leadId: string): Cliente | undefined {
  return clientes.find((c) => c.leadId === leadId);
}
