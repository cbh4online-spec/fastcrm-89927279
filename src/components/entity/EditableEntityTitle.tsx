import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, Pencil, X, Loader2 } from "lucide-react";
import { z } from "zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/** Validação partilhada do nome de leads, contactos e empresas. */
export const entityNameSchema = z
  .string()
  .trim()
  .min(2, { message: "O nome tem de ter pelo menos 2 caracteres." })
  .max(150, { message: "O nome não pode exceder 150 caracteres." });

interface EditableEntityTitleProps {
  value: string;
  onSave: (name: string) => Promise<void> | void;
  /** Quando falso, o título é apenas de leitura (ex.: sem permissão). */
  canEdit?: boolean;
  className?: string;
  /** Rótulo acessível do botão de edição. */
  editLabel?: string;
}

/**
 * Título de ficha editável em linha.
 * Enter guarda, Esc cancela, validação com zod e feedback por toast.
 */
export function EditableEntityTitle({
  value,
  onSave,
  canEdit = true,
  className,
  editLabel = "Editar nome",
}: EditableEntityTitleProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const [isSaving, setIsSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isEditing) setDraft(value);
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing) inputRef.current?.select();
  }, [isEditing]);

  const cancel = () => {
    setDraft(value);
    setIsEditing(false);
  };

  const save = async () => {
    if (isSaving) return;
    const parsed = entityNameSchema.safeParse(draft);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Nome inválido.");
      inputRef.current?.focus();
      return;
    }
    if (parsed.data === value.trim()) {
      setIsEditing(false);
      return;
    }
    setIsSaving(true);
    try {
      await onSave(parsed.data);
      setIsEditing(false);
      toast.success("Nome atualizado");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível atualizar o nome.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void save();
    } else if (e.key === "Escape") {
      e.preventDefault();
      cancel();
    }
  };

  if (isEditing) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <Input
          ref={inputRef}
          value={draft}
          autoFocus
          maxLength={150}
          disabled={isSaving}
          aria-label={editLabel}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          className={cn("h-11 max-w-md text-2xl font-bold tracking-tight sm:text-3xl", className)}
        />
        <Button
          size="icon"
          variant="default"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={() => void save()}
          disabled={isSaving}
          aria-label="Guardar nome"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
        </Button>
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 rounded-full"
          onClick={cancel}
          disabled={isSaving}
          aria-label="Cancelar edição do nome"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="group/title flex min-w-0 items-center gap-1.5">
      <h1
        className={cn("truncate text-2xl font-bold tracking-tight text-foreground sm:text-3xl", className)}
        {...(canEdit ? { onDoubleClick: () => setIsEditing(true), title: value } : { title: value })}
      >
        {value}
      </h1>
      {canEdit && (
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7 shrink-0 rounded-full text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover/title:opacity-100"
              onClick={() => setIsEditing(true)}
              aria-label={editLabel}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>{editLabel}</TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}
