import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const shortcuts = [
  { key: "C", description: "Nova mensagem" },
  { key: "J", description: "Próxima conversa" },
  { key: "K", description: "Conversa anterior" },
  { key: "R", description: "Responder" },
  { key: "E", description: "Resolver conversa" },
  { key: "F", description: "Marcar follow-up" },
  { key: "#", description: "Arquivar" },
  { key: "P", description: "Painel CRM" },
  { key: "[", description: "Barra lateral" },
  { key: "⌘+Enter", description: "Enviar mensagem" },
  { key: "?", description: "Atalhos" },
];

export function KeyboardShortcutsModal({ open, onOpenChange }: KeyboardShortcutsModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Atalhos de teclado</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {shortcuts.map((s) => (
            <div key={s.key} className="flex items-center justify-between py-1.5 px-2 rounded-md hover:bg-muted/50">
              <span className="text-sm text-muted-foreground">{s.description}</span>
              <kbd className="ml-2 px-2 py-0.5 rounded bg-muted border border-border text-xs font-mono font-medium">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
