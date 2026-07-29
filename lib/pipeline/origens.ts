/**
 * Origens sugeridas para um lead. Não é enum no banco (a coluna é text): a lista
 * muda conforme a empresa experimenta canais, e trocar isso não deve custar uma
 * migration. O Select do formulário aceita valor livre além destes.
 */
export const LEAD_ORIGENS = [
  "Indicação",
  "Site",
  "Telefone",
  "WhatsApp",
  "E-mail",
  "Visita/Prospecção",
  // Gravada por lib/importacao.ts. Manter o texto em sincronia com
  // ORIGEM_IMPORTACAO de la, senao o filtro da lista mostra duas origens.
  "Base da Receita",
  "Evento",
  "Cliente antigo",
  "Outro",
];
