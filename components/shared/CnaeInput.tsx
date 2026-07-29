"use client";

import { useMemo, useState } from "react";
import { Autocomplete, Grid, Group, Text, TextInput } from "@mantine/core";
import { IconBuildingFactory2 } from "@tabler/icons-react";
import { buscarCnae, descreverCnae, exibirCodigo, segmentoDoCnae } from "@/lib/cnae";

interface Props {
  /** Código só com dígitos, como está no formulário. */
  codigo: string;
  descricao: string;
  onChange: (valor: { codigo: string; descricao: string }) => void;
  /** Erro de validação do campo do código. */
  error?: React.ReactNode;
}

/**
 * O ramo da empresa, por nome ou por código.
 *
 * São dois campos e não um porque servem a dois momentos diferentes: quem está
 * ao telefone sabe dizer "é uma construtora" e não o CNAE; quem tem o cartão
 * CNPJ na mão tem o código exato e não quer procurar numa lista de 760 itens.
 * Os dois se preenchem: escolher o segmento grava o código, e digitar o código
 * resolve o segmento enquanto se digita.
 *
 * A lista sai de `lib/cnaeCatalogo.ts`, gerada da API do IBGE — 87 divisões e
 * 673 classes. Subclasses ficam de fora: são 1.332 itens para uma precisão que
 * o casamento por prefixo não usa.
 */
export function CnaeInput({ codigo, descricao, onChange, error }: Props) {
  const [termo, setTermo] = useState("");

  const sugestoes = useMemo(() => buscarCnae(termo, 12), [termo]);

  // O que mostrar como identidade do que já está preenchido. Preferimos a
  // descrição guardada; se ela não existe (lead antigo, ou código digitado à
  // mão), resolve pelo catálogo.
  const resolvida = descricao || descreverCnae(codigo) || "";
  const segmento = segmentoDoCnae(codigo);

  const dados = useMemo(
    () =>
      sugestoes.map((s) => ({
        value: s.descricao,
        // Segunda linha do item: o código e, para classe, a divisão de origem.
        detalhe: s.nivel === "divisao" ? `Segmento ${s.codigo}` : `${exibirCodigo(s.codigo)} · ${s.segmento ?? ""}`,
        codigo: s.codigo,
      })),
    [sugestoes],
  );

  return (
    <>
      <Grid gap="sm">
        <Grid.Col span={{ base: 12, sm: 8 }}>
          <Autocomplete
            label="Segmento / atividade"
            placeholder="Construção, padaria, metalurgia…"
            leftSection={<IconBuildingFactory2 size={16} />}
            value={resolvida}
            data={dados}
            limit={12}
            // Filtro desligado: quem filtra é buscarCnae, que também casa por
            // código e ignora acento. O Autocomplete filtraria de novo por
            // substring do rótulo e derrubaria os acertos por número.
            filter={({ options }) => options}
            onChange={(valor) => {
              setTermo(valor);
              const escolhido = dados.find((d) => d.value === valor);
              // Escolheu na lista: grava código e nome juntos. Digitou texto
              // solto: mantém o código como está e guarda o que foi escrito —
              // é a descrição que a pessoa quis, e nada obriga a existir no
              // catálogo do IBGE.
              onChange(
                escolhido
                  ? { codigo: escolhido.codigo, descricao: escolhido.value }
                  : { codigo, descricao: valor },
              );
            }}
            renderOption={({ option }) => {
              const item = dados.find((d) => d.value === option.value);
              return (
                <div>
                  <Text size="sm">{option.value}</Text>
                  <Text size="xs" c="dimmed">
                    {item?.detalhe}
                  </Text>
                </div>
              );
            }}
          />
        </Grid.Col>

        <Grid.Col span={{ base: 12, sm: 4 }}>
          <TextInput
            label="CNAE"
            placeholder="4120-4/00"
            value={codigo}
            error={error}
            onChange={(e) => {
              const digitado = e.currentTarget.value;
              // Resolve o nome enquanto digita: dois dígitos já bastam para
              // saber o segmento, e é isso que dispensa consultar a tabela.
              const encontrada = descreverCnae(digitado);
              onChange({ codigo: digitado, descricao: encontrada ?? descricao });
            }}
          />
        </Grid.Col>
      </Grid>

      {segmento && (
        <Group gap={6} mt={-8}>
          <Text size="xs" c="dimmed">
            Segmento:
          </Text>
          <Text size="xs" fw={500}>
            {segmento[1]}
          </Text>
          <Text size="xs" c="dimmed">
            ({segmento[0]})
          </Text>
        </Group>
      )}
    </>
  );
}
