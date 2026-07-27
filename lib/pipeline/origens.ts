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
  "Evento",
  "Cliente antigo",
  "Outro",
];
