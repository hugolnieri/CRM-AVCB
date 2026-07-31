import dayjs from "dayjs";
import { PIPELINE_STAGE_LABELS } from "@/lib/pipeline/stages";
import { SERVICO_STATUS_LABELS } from "@/types/servico";
import { CLIENTE_STATUS_LABELS } from "@/types/cliente";
import { METRICA_LABELS, PERIODO_LABELS } from "@/types/meta";
import type { AuditAcao, AuditEntry } from "@/types/auditoria";

/**
 * Traduz o log cru do banco para português.
 *
 * O gatilho grava nomes de coluna e valores de enum — `pipeline_stage`,
 * `fechado_ganho`. Ler isso é trabalho de quem escreveu o schema, não de quem
 * administra a empresa, então a tradução mora aqui, em módulo puro e testado, e
 * não espalhada pela tela.
 */

export const TABELA_LABELS: Record<string, { singular: string; artigo: "o" | "a" }> = {
  leads: { singular: "lead", artigo: "o" },
  clientes: { singular: "cliente", artigo: "o" },
  servicos: { singular: "serviço", artigo: "o" },
  tipos_servico: { singular: "tipo de serviço", artigo: "o" },
  metas: { singular: "meta", artigo: "a" },
  team_members: { singular: "membro da equipe", artigo: "o" },
  registros_diarios: { singular: "jornada", artigo: "a" },
  tarefas: { singular: "tarefa", artigo: "a" },
};

export const ACAO_LABELS: Record<AuditAcao, { verbo: string; label: string; color: string }> = {
  insert: { verbo: "Criou", label: "Criação", color: "green" },
  update: { verbo: "Alterou", label: "Alteração", color: "blue" },
  delete: { verbo: "Excluiu", label: "Exclusão", color: "red" },
};

export const CAMPO_LABELS: Record<string, string> = {
  name: "Empresa",
  razao_social: "Razão social",
  nome_fantasia: "Nome fantasia",
  nome: "Nome",
  titulo: "Título",
  full_name: "Nome",
  role: "Perfil",
  cnpj: "CNPJ",
  contato_nome: "Contato",
  contato_cargo: "Cargo do contato",
  phone_raw: "Telefone",
  phone_e164: "Telefone (E.164)",
  telefone: "Telefone",
  telefone_e164: "Telefone (E.164)",
  email: "E-mail",
  address: "Endereço",
  endereco: "Endereço",
  cidade: "Cidade",
  uf: "UF",
  cep: "CEP",
  origem: "Origem",
  interesse: "Interesse",
  possiveis_servicos: "Possíveis serviços",
  valor_estimado: "Valor estimado",
  pipeline_stage: "Etapa",
  follow_up_at: "Retorno",
  follow_up_note: "Nota do retorno",
  assigned_user_id: "Responsável",
  responsavel_id: "Responsável",
  status: "Status",
  observacoes: "Observações",
  tipo_nome: "Tipo",
  tipo_servico_id: "Tipo do catálogo",
  data_agendada: "Data agendada",
  data_realizacao: "Data de realização",
  data_vencimento: "Vencimento",
  participantes: "Participantes",
  instrutor: "Instrutor",
  categoria: "Categoria",
  validade_meses: "Validade (meses)",
  carga_horaria: "Carga horária",
  material_venda: "Material de venda",
  ativo: "Ativo",
  ativa: "Ativa",
  ordem: "Ordem",
  metrica: "Métrica",
  periodo: "Período",
  alvo: "Alvo",
  inicio_em: "Início da vigência",
  fim_em: "Fim da vigência",
  member_id: "Colaborador",
  cliente_id: "Cliente",
  lead_id: "Lead",
  servico_id: "Serviço",
  prioridade: "Prioridade",
  prazo: "Prazo",
  concluida_em: "Concluída em",
  data: "Data",
  inicio_at: "Início da jornada",
  fim_at: "Fim da jornada",
};

export function rotularCampo(campo: string): string {
  return CAMPO_LABELS[campo] ?? campo;
}

/** `{chave: {label}}` → `{chave: label}`, para reaproveitar os mapas de rótulo. */
function soLabels(mapa: Record<string, { label: string }>): Record<string, string> {
  return Object.fromEntries(Object.entries(mapa).map(([k, v]) => [k, v.label]));
}

/**
 * Enums do domínio, para o log não mostrar `visita_diagnostico_agendado`.
 *
 * `status` junta cliente e serviço no mesmo mapa porque os valores não se
 * cruzam (ativo/inativo × agendado/realizado/cancelado) — e o log não carrega a
 * entidade dentro do nome da coluna.
 */
const VALOR_LABELS: Record<string, Record<string, string>> = {
  pipeline_stage: PIPELINE_STAGE_LABELS,
  status: { ...soLabels(CLIENTE_STATUS_LABELS), ...soLabels(SERVICO_STATUS_LABELS) },
  metrica: soLabels(METRICA_LABELS),
  periodo: soLabels(PERIODO_LABELS),
  role: { admin: "Administrador", colaborador: "Colaborador" },
  categoria: { treinamento: "Treinamento", servico: "Serviço" },
  prioridade: { baixa: "Baixa", normal: "Normal", alta: "Alta" },
};

const CAMPOS_DATA = new Set([
  "data",
  "prazo",
  "inicio_em",
  "fim_em",
  "data_realizacao",
  "data_vencimento",
]);

const CAMPOS_INSTANTE = new Set([
  "follow_up_at",
  "data_agendada",
  "inicio_at",
  "fim_at",
  "concluida_em",
]);

/**
 * Um valor do log em texto legível.
 *
 * Colunas `date` são formatadas a partir da string, sem passar por `new Date` —
 * `new Date("2026-03-01")` é lido como UTC e volta 28/02 em UTC-3, o mesmo
 * cuidado que o resto do projeto toma com data pura.
 */
export function formatarValor(campo: string, valor: unknown): string {
  if (valor === null || valor === undefined || valor === "") return "vazio";
  if (typeof valor === "boolean") return valor ? "sim" : "não";

  if (Array.isArray(valor)) {
    return valor.length === 0 ? "vazio" : valor.join(", ");
  }

  const texto = String(valor);

  const traducao = VALOR_LABELS[campo]?.[texto];
  if (traducao) return traducao;

  if (CAMPOS_DATA.has(campo)) {
    const [ano, mes, dia] = texto.split("-");
    return dia ? `${dia}/${mes}/${ano}` : texto;
  }

  if (CAMPOS_INSTANTE.has(campo)) {
    return dayjs(texto).format("DD/MM/YYYY HH:mm");
  }

  return texto;
}

export interface Alteracao {
  campo: string;
  rotulo: string;
  de: string;
  para: string;
}

/**
 * As mudanças de um `update`, prontas para tabela. Vazio para insert/delete —
 * neles `dados` é a linha inteira, não um diff, e mostrar quarenta campos
 * "de vazio para X" não informa nada.
 */
export function alteracoesLegiveis(entry: AuditEntry): Alteracao[] {
  if (entry.acao !== "update" || !entry.dados) return [];

  return Object.entries(entry.dados)
    .filter(
      (par): par is [string, { de: unknown; para: unknown }] =>
        typeof par[1] === "object" && par[1] !== null && "para" in (par[1] as object),
    )
    .map(([campo, { de, para }]) => ({
      campo,
      rotulo: rotularCampo(campo),
      de: formatarValor(campo, de),
      para: formatarValor(campo, para),
    }))
    .sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}

/**
 * Uma frase por linha do log: "Alterou o lead «Padaria São José»: Etapa,
 * Responsável".
 *
 * Sem o rótulo do registro a frase seria "alterou o lead <uuid>", que não
 * responde a pergunta que o administrador está fazendo.
 */
export function descreverEntrada(entry: AuditEntry): string {
  const tabela = TABELA_LABELS[entry.tabela] ?? { singular: entry.tabela, artigo: "o" as const };
  const { verbo } = ACAO_LABELS[entry.acao];
  const alvo = entry.rotulo ? `${tabela.singular} «${entry.rotulo}»` : tabela.singular;

  const frase = `${verbo} ${tabela.artigo} ${alvo}`;

  if (entry.acao !== "update") return frase;

  const campos = alteracoesLegiveis(entry).map((a) => a.rotulo);
  return campos.length > 0 ? `${frase}: ${campos.join(", ")}` : frase;
}

/** As tabelas presentes no log, para alimentar o filtro sem chumbar a lista. */
export function tabelasPresentes(entradas: AuditEntry[]): { value: string; label: string }[] {
  const vistas = new Set(entradas.map((e) => e.tabela));
  return Array.from(vistas)
    .map((tabela) => ({
      value: tabela,
      label: TABELA_LABELS[tabela]?.singular ?? tabela,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));
}
