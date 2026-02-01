import { useState } from "react";
import { useContactDuplicateGroups, DuplicateGroup, ContactWithRelations } from "@/hooks/useContactDuplicateGroups";
import { useContactMerge } from "@/hooks/useContactMerge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { 
  Users, 
  Mail, 
  Phone, 
  Building2, 
  Calendar, 
  FileText,
  MessageSquare,
  Target,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Merge,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

interface DuplicateManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function DuplicateGroupCard({ 
  group, 
  onMerge 
}: { 
  group: DuplicateGroup; 
  onMerge: (primaryId: string, duplicateIds: string[]) => void;
}) {
  const [selectedPrimary, setSelectedPrimary] = useState<string>(group.contacts[0]?.id || "");
  const [showConfirm, setShowConfirm] = useState(false);

  const matchTypeLabels = {
    email: "Email igual",
    phone: "Telefone igual",
    name_similarity: `Nome similar (${Math.round(group.similarity * 100)}%)`,
  };

  const matchTypeColors = {
    email: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300",
    phone: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
    name_similarity: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
  };

  const handleMerge = () => {
    const duplicateIds = group.contacts
      .filter(c => c.id !== selectedPrimary)
      .map(c => c.id);
    onMerge(selectedPrimary, duplicateIds);
    setShowConfirm(false);
  };

  const getTotalRelations = (contact: ContactWithRelations) => {
    return Object.values(contact.relatedCounts).reduce((sum, v) => sum + v, 0);
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">{group.contacts[0]?.name}</span>
            <Badge className={cn("text-xs", matchTypeColors[group.matchType])}>
              {matchTypeLabels[group.matchType]}
            </Badge>
          </div>
          <Badge variant="outline" className="text-xs">
            {group.contacts.length} contactos
          </Badge>
        </div>

        <RadioGroup value={selectedPrimary} onValueChange={setSelectedPrimary} className="space-y-2">
          {group.contacts.map((contact, index) => (
            <div
              key={contact.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                selectedPrimary === contact.id 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-muted-foreground/30"
              )}
            >
              <RadioGroupItem value={contact.id} id={contact.id} className="mt-1" />
              <Label htmlFor={contact.id} className="flex-1 cursor-pointer">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{contact.name}</span>
                      {index === 0 && (
                        <Badge variant="secondary" className="text-[10px]">Sugerido</Badge>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {contact.email && (
                        <span className="flex items-center gap-1">
                          <Mail className="w-3 h-3" />
                          {contact.email}
                        </span>
                      )}
                      {contact.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </span>
                      )}
                      {contact.company && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {contact.company}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      Criado: {format(new Date(contact.created_at), "d MMM yyyy", { locale: pt })}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getTotalRelations(contact) > 0 && (
                      <div className="flex items-center gap-2 text-xs">
                        {contact.relatedCounts.opportunities > 0 && (
                          <span className="flex items-center gap-1" title="Oportunidades">
                            <Target className="w-3 h-3" />
                            {contact.relatedCounts.opportunities}
                          </span>
                        )}
                        {contact.relatedCounts.invoices > 0 && (
                          <span className="flex items-center gap-1" title="Faturas">
                            <FileText className="w-3 h-3" />
                            {contact.relatedCounts.invoices}
                          </span>
                        )}
                        {contact.relatedCounts.conversations > 0 && (
                          <span className="flex items-center gap-1" title="Conversas">
                            <MessageSquare className="w-3 h-3" />
                            {contact.relatedCounts.conversations}
                          </span>
                        )}
                        {contact.relatedCounts.profiles > 0 && (
                          <span className="flex items-center gap-1" title="Perfis Student Journey">
                            <Users className="w-3 h-3" />
                            {contact.relatedCounts.profiles}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Label>
            </div>
          ))}
        </RadioGroup>

        <div className="flex justify-end gap-2 mt-4">
          <Button 
            size="sm" 
            onClick={() => setShowConfirm(true)}
            className="gap-2"
          >
            <Merge className="w-4 h-4" />
            Fundir em "{group.contacts.find(c => c.id === selectedPrimary)?.name}"
          </Button>
        </div>
      </Card>

      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              Confirmar fusão de contactos
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Esta acção irá fundir {group.contacts.length - 1} contacto(s) em{" "}
                <strong>{group.contacts.find(c => c.id === selectedPrimary)?.name}</strong>.
              </p>
              <p className="text-sm">
                Todas as referências (oportunidades, faturas, conversas, etc.) serão migradas para o contacto principal.
                Os contactos duplicados serão eliminados permanentemente.
              </p>
              <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                Esta acção não pode ser desfeita.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleMerge}>
              Confirmar Fusão
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export function DuplicateManagementDialog({ open, onOpenChange }: DuplicateManagementDialogProps) {
  const { data: duplicateGroups = [], isLoading, refetch } = useContactDuplicateGroups();
  const mergeContacts = useContactMerge();
  const [mergedGroups, setMergedGroups] = useState<Set<string>>(new Set());

  const handleMerge = async (primaryId: string, duplicateIds: string[]) => {
    await mergeContacts.mutateAsync({ primaryContactId: primaryId, duplicateContactIds: duplicateIds });
    refetch();
  };

  const visibleGroups = duplicateGroups.filter(g => !mergedGroups.has(g.id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Gestão de Duplicados
          </DialogTitle>
          <DialogDescription>
            Analise e funda contactos duplicados para manter a base de dados limpa.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-500 mb-3" />
            <h3 className="font-medium text-lg">Nenhum duplicado encontrado</h3>
            <p className="text-sm text-muted-foreground mt-1">
              A sua base de contactos está limpa!
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between py-2">
              <p className="text-sm text-muted-foreground">
                Encontrados <strong>{visibleGroups.length}</strong> grupos de possíveis duplicados
              </p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Atualizar
              </Button>
            </div>

            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {visibleGroups.map(group => (
                  <DuplicateGroupCard
                    key={group.id}
                    group={group}
                    onMerge={handleMerge}
                  />
                ))}
              </div>
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
