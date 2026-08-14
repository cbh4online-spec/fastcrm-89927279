import { useState } from "react";
import { DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Archive, ArchiveRestore, Ban, ShieldCheck } from "lucide-react";
import { ArchiveEntityDialog } from "./ArchiveEntityDialog";
import { BlockEntityDialog } from "./BlockEntityDialog";
import { useEntityArchiveBlock, type ArchivableEntity } from "@/hooks/useEntityArchiveBlock";

interface EntityArchiveBlockActionsProps {
  entity: ArchivableEntity;
  id: string;
  isBlocked?: boolean | null;
  archivedAt?: string | null;
  archiveWarning?: string;
  onDone?: () => void;
  withSeparator?: boolean;
  /**
   * Quando fornecidos, os diálogos NÃO são renderizados aqui — o pai é
   * responsável por os montar fora do `DropdownMenu` (evita o bloqueio de
   * foco do Radix, que impede escrever no campo de motivo).
   */
  onRequestBlock?: (id: string) => void;
  onRequestArchive?: (id: string) => void;
}

/**
 * Itens de menu (…) reutilizáveis para arquivar/desarquivar e bloquear/desbloquear
 * contactos, empresas e leads.
 */
export function EntityArchiveBlockActions({
  entity,
  id,
  isBlocked,
  archivedAt,
  archiveWarning,
  onDone,
  withSeparator = true,
  onRequestBlock,
  onRequestArchive,
}: EntityArchiveBlockActionsProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const { unarchive, unblock } = useEntityArchiveBlock(entity);
  const controlled = !!(onRequestBlock || onRequestArchive);

  return (
    <>
      {withSeparator && <DropdownMenuSeparator />}

      {isBlocked ? (
        <DropdownMenuItem
          className="gap-2"
          onClick={async () => {
            await unblock.mutateAsync({ ids: [id] });
            onDone?.();
          }}
        >
          <ShieldCheck className="h-4 w-4" />
          Desbloquear
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          className="gap-2 text-destructive focus:text-destructive"
          onSelect={() => {
            // deixar o menu fechar antes de abrir o diálogo
            if (onRequestBlock) setTimeout(() => onRequestBlock(id), 0);
            else setTimeout(() => setBlockOpen(true), 0);
          }}
        >
          <Ban className="h-4 w-4" />
          Bloquear interações
        </DropdownMenuItem>
      )}

      {archivedAt ? (
        <DropdownMenuItem
          className="gap-2"
          onClick={async () => {
            await unarchive.mutateAsync({ ids: [id] });
            onDone?.();
          }}
        >
          <ArchiveRestore className="h-4 w-4" />
          Desarquivar
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem
          className="gap-2"
          onSelect={() => {
            if (onRequestArchive) setTimeout(() => onRequestArchive(id), 0);
            else setTimeout(() => setArchiveOpen(true), 0);
          }}
        >
          <Archive className="h-4 w-4" />
          Arquivar
        </DropdownMenuItem>
      )}

      {!controlled && (
        <>
          <ArchiveEntityDialog
            entity={entity}
            ids={[id]}
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            warning={archiveWarning}
            onDone={onDone}
          />
          <BlockEntityDialog entity={entity} ids={[id]} open={blockOpen} onOpenChange={setBlockOpen} onDone={onDone} />
        </>
      )}
    </>
  );
}

export type EntityActionRequest = { action: "block" | "archive"; id: string } | null;

interface EntityArchiveBlockDialogsProps {
  entity: ArchivableEntity;
  request: EntityActionRequest;
  onOpenChange: (open: boolean) => void;
  archiveWarning?: string;
  onDone?: () => void;
}

/** Diálogos montados fora do menu, controlados pelo pai. */
export function EntityArchiveBlockDialogs({
  entity,
  request,
  onOpenChange,
  archiveWarning,
  onDone,
}: EntityArchiveBlockDialogsProps) {
  return (
    <>
      <ArchiveEntityDialog
        entity={entity}
        ids={request?.id ? [request.id] : []}
        open={request?.action === "archive"}
        onOpenChange={onOpenChange}
        warning={archiveWarning}
        onDone={onDone}
      />
      <BlockEntityDialog
        entity={entity}
        ids={request?.id ? [request.id] : []}
        open={request?.action === "block"}
        onOpenChange={onOpenChange}
        onDone={onDone}
      />
    </>
  );
}
