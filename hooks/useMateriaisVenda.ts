import { useQuery } from "@tanstack/react-query";
import {
  deleteMaterialVenda,
  fetchMateriaisVenda,
  uploadMaterialVenda,
} from "@/lib/supabase/queries/materiaisVenda";
import { useCrudMutation } from "@/hooks/useCrudMutation";
import type { MaterialVenda } from "@/types/servico";

export function useMateriaisVenda() {
  return useQuery({
    queryKey: ["materiaisVenda"],
    queryFn: fetchMateriaisVenda,
  });
}

export function useUploadMaterialVenda() {
  return useCrudMutation({
    mutationFn: (vars: { tipoServicoId: string; arquivo: File }) => uploadMaterialVenda(vars),
    invalidate: [["materiaisVenda"]],
    successMessage: (_data, vars) => `"${vars.arquivo.name}" anexado.`,
    errorMessage: "Não foi possível anexar o arquivo.",
  });
}

export function useDeleteMaterialVenda() {
  return useCrudMutation({
    mutationFn: (material: MaterialVenda) => deleteMaterialVenda(material),
    invalidate: [["materiaisVenda"]],
    successMessage: "Arquivo excluído.",
    errorMessage: "Não foi possível excluir o arquivo.",
  });
}
