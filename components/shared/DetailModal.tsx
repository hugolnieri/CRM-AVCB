"use client";

import type { ReactNode } from "react";
import { Modal, Title, type MantineSize } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";

interface Props<T extends { id: string }> {
  /** Registro aberto; null fecha o modal. */
  record: T | null;
  title: (record: T) => ReactNode;
  size?: MantineSize;
  onClose: () => void;
  children: (record: T) => ReactNode;
}

/**
 * Modal de detalhe/edição de um registro. No celular ocupa a tela inteira.
 *
 * O `key={record.id}` no conteúdo é load-bearing: ele descarta e remonta o
 * corpo quando outro registro é aberto, zerando todo estado local de formulário
 * sem precisar de um efeito ressincronizando estado a partir das props.
 */
export function DetailModal<T extends { id: string }>({
  record,
  title,
  size = "lg",
  onClose,
  children,
}: Props<T>) {
  const isMobile = useMediaQuery("(max-width: 48em)");

  return (
    <Modal
      opened={record !== null}
      onClose={onClose}
      title={record ? <Title order={3}>{title(record)}</Title> : null}
      size={size}
      fullScreen={isMobile}
      centered
    >
      {record && <div key={record.id}>{children(record)}</div>}
    </Modal>
  );
}
