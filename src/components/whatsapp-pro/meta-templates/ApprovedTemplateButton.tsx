import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileCheck2 } from "lucide-react";
import { callMetaTemplates, CATEGORY_LABEL, type ListResult, type MetaTemplateRow } from "./api";
import { SendTemplateDialog } from "./SendTemplateDialog";

/** Botão «Usar modelo aprovado» para escrever fora das 24 h pela linha oficial. */
export function ApprovedTemplateButton({ phone, contactId = null }: { phone: string; contactId?: string | null }) {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const [chosen, setChosen] = useState<MetaTemplateRow | null>(null);
  const q = useQuery({ queryKey: ["meta-templates-db", wid], enabled: !!wid, retry: false, queryFn: () => callMetaTemplates<ListResult>({ action: "list", workspaceId: wid }) });
  const approved = (q.data?.templates ?? []).filter((t) => t.status === "APPROVED");
  if (!wid) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="gap-2" disabled={q.isLoading}><FileCheck2 className="h-4 w-4" />Usar modelo aprovado</Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="max-h-72 overflow-y-auto">
          <DropdownMenuLabel>Modelos aprovados pela Meta</DropdownMenuLabel>
          {approved.length === 0 && <DropdownMenuItem disabled>Ainda não há modelos aprovados.</DropdownMenuItem>}
          {approved.map((t) => (
            <DropdownMenuItem key={t.id} onClick={() => setChosen(t)}>{t.internal_name} · {CATEGORY_LABEL[t.category] ?? t.category}</DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <SendTemplateDialog key={chosen?.id ?? "none"} open={!!chosen} onOpenChange={(o) => !o && setChosen(null)} workspaceId={wid} template={chosen}
        variables={(q.data?.variables ?? []).filter((v) => v.template_id === chosen?.id)} defaultPhone={phone} contactId={contactId} />
    </>
  );
}
