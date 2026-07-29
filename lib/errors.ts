/**
 * Constraints do banco cujo texto cru chegaria ao usuário. O Postgres devolve
 * coisas como
 *   duplicate key value violates unique constraint "clientes_cnpj_key"
 * e o PostgREST repassa isso intacto — numa interface em português, é ruído.
 *
 * Só as que um uso normal do sistema consegue disparar entram aqui; as demais
 * são bug e devem aparecer cruas mesmo, para não serem mascaradas.
 * Ver supabase/migrations/0001_schema.sql.
 */
const CONSTRAINT_MESSAGES: Record<string, string> = {
  clientes_cnpj_key: "Já existe um cliente cadastrado com este CNPJ.",
  clientes_lead_id_key: "Este lead já foi convertido em cliente.",
  tipos_treinamento_nome_key: "Já existe um tipo de treinamento com este nome.",
  treinamentos_vencimento_apos_realizacao:
    "A data de vencimento não pode ser anterior à data de realização.",
  servicos_proxima_apos_data: "A próxima data não pode ser anterior à data do serviço.",
  activities_one_owner: "A nota precisa estar vinculada a um lead ou a um cliente.",
  treinamentos_tipo_treinamento_id_fkey:
    "Este tipo de treinamento está em uso e não pode ser excluído. Desative-o.",
  tipos_servico_nome_key: "Já existe um tipo com este nome no catálogo.",
  // on delete restrict em servicos.tipo_servico_id: o registro do serviço
  // lastreia certificado emitido, então o tipo que o originou não some do
  // catálogo. Desativar tira das listas e mantém o histórico legível.
  servicos_tipo_servico_id_fkey:
    "Este tipo já foi usado em serviços registrados e não pode ser excluído. Desative-o para tirá-lo das listas.",
};

/**
 * Supabase/PostgREST errors are plain objects with a `message` property, not
 * `Error` instances — `err instanceof Error` silently misses them and falls
 * through to a generic fallback. Check for a `message` property generically.
 */
export function getErrorMessage(err: unknown, fallback = "Algo deu errado."): string {
  const raw = rawMessage(err);
  if (raw === null) return fallback;

  for (const [constraint, friendly] of Object.entries(CONSTRAINT_MESSAGES)) {
    if (raw.includes(constraint)) return friendly;
  }
  return raw;
}

function rawMessage(err: unknown): string | null {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    const message = (err as { message: unknown }).message;
    if (typeof message === "string" && message.trim() !== "") return message;
  }
  return null;
}
