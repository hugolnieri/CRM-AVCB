import { createClient } from "@/lib/supabase/client";
import type { MaterialVenda } from "@/types/servico";

/** Bucket privado (ver supabase/migrations/0017_materiais_venda.sql). */
const BUCKET = "material-venda";

interface MaterialVendaRow {
  id: string;
  tipo_servico_id: string;
  nome: string;
  caminho: string;
  tamanho_bytes: number | null;
  mime: string | null;
  created_at: string;
}

function mapRowToMaterial(row: MaterialVendaRow): MaterialVenda {
  return {
    id: row.id,
    tipoServicoId: row.tipo_servico_id,
    nome: row.nome,
    caminho: row.caminho,
    tamanhoBytes: row.tamanho_bytes,
    mime: row.mime,
    createdAt: row.created_at,
  };
}

/**
 * Todos os arquivos de uma vez, e não por tipo: o Manual do Vendedor lista o
 * catálogo inteiro, então uma consulta por tipo viraria uma cascata de vinte e
 * sete. Agrupar por `tipoServicoId` na tela é mais barato que isso.
 */
export async function fetchMateriaisVenda(): Promise<MaterialVenda[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("materiais_venda")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data as MaterialVendaRow[]).map(mapRowToMaterial);
}

/**
 * Sobe o arquivo e registra a linha, **nesta ordem**.
 *
 * Não há transação entre storage e PostgREST. Falhar depois do upload deixa um
 * arquivo órfão no bucket: invisível na tela, some do caminho de ninguém, e o
 * admin simplesmente tenta de novo. A ordem inversa deixaria uma linha listada
 * apontando para arquivo que não existe — o vendedor clicaria e receberia erro,
 * que é o defeito que aparece na hora errada.
 */
export async function uploadMaterialVenda({
  tipoServicoId,
  arquivo,
}: {
  tipoServicoId: string;
  arquivo: File;
}): Promise<void> {
  const supabase = createClient();

  // Caminho gerado, nome original preservado na coluna: nome de arquivo real
  // vem com acento, espaço e barra, e nada disso é chave de storage confiável.
  const extensao = arquivo.name.split(".").pop()?.toLowerCase() ?? "bin";
  const caminho = `${tipoServicoId}/${crypto.randomUUID()}.${extensao}`;

  const { error: erroUpload } = await supabase.storage
    .from(BUCKET)
    .upload(caminho, arquivo, { contentType: arquivo.type || undefined });
  if (erroUpload) throw erroUpload;

  const { error } = await supabase.from("materiais_venda").insert({
    tipo_servico_id: tipoServicoId,
    nome: arquivo.name,
    caminho,
    tamanho_bytes: arquivo.size,
    mime: arquivo.type || null,
  });
  if (error) throw error;
}

/**
 * Apaga o binário e depois a linha.
 *
 * Se a segunda etapa falhar, sobra uma linha cujo arquivo não existe — visível
 * na lista e resolvida clicando em excluir de novo, porque a remoção do storage
 * é idempotente. A ordem inversa deixaria um arquivo órfão que ninguém mais
 * enxerga para apagar.
 */
export async function deleteMaterialVenda(material: MaterialVenda): Promise<void> {
  const supabase = createClient();

  const { error: erroStorage } = await supabase.storage.from(BUCKET).remove([material.caminho]);
  if (erroStorage) throw erroStorage;

  const { error } = await supabase.from("materiais_venda").delete().eq("id", material.id);
  if (error) throw error;
}

/**
 * URL de vida curta para baixar. O bucket é privado de propósito, então não há
 * link permanente: material interno não deve ficar acessível a quem só guardou
 * o endereço.
 *
 * `download` faz o navegador salvar com o nome original em vez de abrir o uuid
 * do caminho.
 */
export async function urlAssinadaMaterial(material: MaterialVenda): Promise<string> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(material.caminho, 60, { download: material.nome });

  if (error) throw error;
  return data.signedUrl;
}
