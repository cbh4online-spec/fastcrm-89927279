import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { FileUp, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { parseExcelFile } from "@/utils/excelUtils";
import { GROWMAN_MAX_ROWS, mapGrowmanRows, parseCsvText, type GrowmanParseResult } from "@/lib/prospecting/growmanParser";
import { PROSPECTING_IDENTITY_QUERY_KEY } from "@/hooks/useProspectingIdentityBatch";

const BATCH = 100;

export function GrowmanImportDialog({ open, onOpenChange, onImported }: { open: boolean; onOpenChange: (o: boolean) => void; onImported?: () => void }) {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [result, setResult] = useState<GrowmanParseResult | null>(null);
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [progress, setProgress] = useState(0);

  const reset = () => { setFileName(null); setResult(null); setProgress(0); };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { toast.error("Ficheiro demasiado grande (máx. 20 MB)"); return; }
    setReading(true); setFileName(file.name); setResult(null);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase();
      let rows: Record<string, string>[];
      if (ext === "csv" || ext === "txt") rows = parseCsvText(await file.text());
      else if (ext === "xlsx") rows = (await parseExcelFile(await file.arrayBuffer())).rows;
      else throw new Error("Formato não suportado. Use CSV ou Excel (.xlsx).");
      if (rows.length > GROWMAN_MAX_ROWS) throw new Error(`O ficheiro tem ${rows.length} linhas; o máximo é ${GROWMAN_MAX_ROWS}.`);
      const parsed = mapGrowmanRows(rows);
      if (!parsed.hasUsernameColumn) throw new Error("Não encontrei a coluna do nome de utilizador (ex.: «Username» ou «Profile URL»).");
      setResult(parsed);
    } catch (e) {
      toast.error("Não foi possível ler o ficheiro", { description: e instanceof Error ? e.message : String(e) });
      setFileName(null);
    } finally {
      setReading(false);
    }
  };

  const handleImport = async () => {
    if (!workspaceId || !result?.profiles.length) return;
    setSaving(true); setProgress(0);
    let saved = 0;
    try {
      for (let i = 0; i < result.profiles.length; i += BATCH) {
        const chunk = result.profiles.slice(i, i + BATCH).map((p) => ({
          workspace_id: workspaceId,
          platform: "instagram",
          instagram_username: p.username,
          profile_url: p.profileUrl,
          profile_link: p.profileUrl,
          profile_name: p.fullName,
          profile_bio: p.bio,
          instagram_full_bio: p.bio,
          profile_image_url: p.imageUrl,
          instagram_followers_count: p.followers,
          instagram_following_count: p.following,
          instagram_posts_count: p.posts,
          instagram_is_verified: p.isVerified,
          instagram_is_business: p.isBusiness,
          is_private: p.isPrivate,
          instagram_category: p.category,
          instagram_external_url: p.externalUrl,
          extracted_email: p.email,
          extracted_phone: p.phone,
          contact_source: p.email || p.phone ? "growman_import" : null,
          status: "pending",
        }));
        // Perfis já existentes não são alterados (nem os convertidos em lead)
        const { data, error } = await supabase
          .from("professional_prospecting_profiles")
          .upsert(chunk, { onConflict: "workspace_id,profile_url", ignoreDuplicates: true })
          .select("id");
        if (error) throw error;
        saved += data?.length ?? 0;
        setProgress(Math.round(((i + chunk.length) / result.profiles.length) * 100));
      }
      const skipped = result.profiles.length - saved;
      toast.success(`${saved} perfis importados`, { description: skipped ? `${skipped} já existiam e não foram alterados.` : undefined });
      queryClient.invalidateQueries({ queryKey: ["instagram-extraction-results", workspaceId] });
      queryClient.invalidateQueries({ queryKey: PROSPECTING_IDENTITY_QUERY_KEY });
      onImported?.();
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error("Falha na importação", { description: `${saved} gravados antes do erro. ${e instanceof Error ? e.message : ""}` });
    } finally {
      setSaving(false);
    }
  };

  const withEmail = result?.profiles.filter((p) => p.email).length ?? 0;
  const withPhone = result?.profiles.filter((p) => p.phone).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!saving) { if (!o) reset(); onOpenChange(o); } }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar do Growman</DialogTitle>
          <DialogDescription>Carregue o ficheiro CSV ou Excel exportado pelo Growman. Os perfis ficam na lista de prospeção, com emails e telefones.</DialogDescription>
        </DialogHeader>

        <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border p-6 text-center hover:border-primary">
          {reading ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <FileUp className="h-6 w-6 text-muted-foreground" />}
          <span className="text-sm font-medium text-foreground">{fileName ?? "Escolher ficheiro (.csv ou .xlsx)"}</span>
          <span className="text-xs text-muted-foreground">Máx. {GROWMAN_MAX_ROWS} linhas, 20 MB</span>
          <input type="file" accept=".csv,.txt,.xlsx" className="sr-only" disabled={reading || saving}
            onChange={(e) => { handleFile(e.target.files?.[0]); e.target.value = ""; }} />
        </label>

        {result && (
          <div className="grid grid-cols-3 gap-3 rounded-2xl border border-border p-4 text-center">
            <div><div className="text-2xl font-bold text-foreground">{result.profiles.length}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Perfis</div></div>
            <div><div className="text-2xl font-bold text-foreground">{withEmail}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Com email</div></div>
            <div><div className="text-2xl font-bold text-foreground">{withPhone}</div><div className="text-[11px] uppercase tracking-wider text-muted-foreground">Com telefone</div></div>
            {(result.invalidRows > 0 || result.duplicateRows > 0) && (
              <p className="col-span-3 text-xs text-muted-foreground">
                Ignorados: {result.invalidRows} sem utilizador Instagram válido, {result.duplicateRows} repetidos no ficheiro.
              </p>
            )}
          </div>
        )}
        {saving && <Progress value={progress} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleImport} disabled={!result?.profiles.length || saving || !workspaceId}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Importar {result?.profiles.length ?? 0} perfis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
