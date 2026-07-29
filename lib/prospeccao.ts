import { normalizePhoneToE164 } from "@/lib/phone";
import type { LeadInput } from "@/types/lead";
import { nomeDeExibicao, type Prospeccao } from "@/types/prospeccao";

/** Origem fixa, para a carteira levantada pelo robô ser filtrável e reversível. */
export const ORIGEM_PROSPECCAO = "Base da Receita";

/**
 * A empresa da base vira um lead.
 *
 * `contatoNome` fica null de propósito: a Receita não traz quem atende, e
 * inventar "Responsável" seria pior que deixar vazio — o campo é obrigatório no
 * cadastro manual justamente para forçar alguém a descobrir o nome.
 */
export function prospeccaoParaLead(
  p: Prospeccao,
  servicosSugeridos: string[],
  responsavelId: string | null,
): Partial<LeadInput> & { name: string } {
  return {
    name: nomeDeExibicao(p),
    cnpj: p.cnpj,
    cnae: p.cnae,
    cnaeDescricao: p.cnaeDescricao,
    contatoNome: null,
    phoneRaw: p.telefone,
    phoneE164: normalizePhoneToE164(p.telefone),
    email: p.email,
    address: [p.endereco, p.bairro].filter(Boolean).join(" - ") || null,
    cidade: p.cidade,
    uf: p.uf,
    origem: ORIGEM_PROSPECCAO,
    interesse: null,
    // Vazio vira null e não `[]`: coluna nula significa "ninguém decidiu ainda",
    // e um array vazio significaria "decidimos que não há nada a oferecer".
    possiveisServicos: servicosSugeridos.length > 0 ? servicosSugeridos : null,
    assignedUserId: responsavelId,
    valorEstimado: null,
    pipelineStage: "novo_lead",
  };
}
