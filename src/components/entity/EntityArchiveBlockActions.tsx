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
}: EntityArchiveBlockActionsProps) {
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const { unarchive, unblock } = useEntityArchiveBlock(entity);

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
          onSelect={(e) => {
            e.preventDefault();
            setBlockOpen(true);
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
          onSelect={(e) => {
            e.preventDefault();
            setArchiveOpen(true);
          }}
        >
          <Archive className="h-4 w-4" />
          Arquivar
        </DropdownMenuItem>
      )}

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
  );
}
