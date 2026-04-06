import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  useBotCommentJobs,
  useCreateBotCommentJob,
  useWorkspaceQA,
  useApproveQA,
  useRejectQA,
} from "@/hooks/useBotComments";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Bot,
  Sparkles,
  CheckCircle,
  XCircle,
  Loader2,
  HelpCircle,
  MessageSquare,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";

export function BotCommentsPanel() {
  const { currentWorkspace } = useWorkspace();
  const { data: jobs = [], isLoading: jobsLoading } = useBotCommentJobs();
  const createJob = useCreateBotCommentJob();
  const [generateOpen, setGenerateOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Bot className="h-5 w-5" /> Comentários Inteligentes
          </h3>
          <p className="text-sm text-muted-foreground">
            Gere reviews e Q&A automaticamente com IA para os seus produtos
          </p>
        </div>
        <Button onClick={() => setGenerateOpen(true)} className="gap-2">
          <Sparkles className="h-4 w-4" /> Gerar Comentários
        </Button>
      </div>

      <Tabs defaultValue="jobs">
        <TabsList>
          <TabsTrigger value="jobs">Histórico de Geração</TabsTrigger>
          <TabsTrigger value="qa">Perguntas &amp; Respostas</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="mt-4">
          <JobsTable jobs={jobs} isLoading={jobsLoading} />
        </TabsContent>

        <TabsContent value="qa" className="mt-4">
          <QAModerationTable />
        </TabsContent>
      </Tabs>

      <GenerateDialog
        open={generateOpen}
        onOpenChange={setGenerateOpen}
        onGenerate={(params) => {
          createJob.mutate(params, { onSuccess: () => setGenerateOpen(false) });
        }}
        isLoading={createJob.isPending}
      />
    </div>
  );
}

function JobsTable({ jobs, isLoading }: { jobs: any[]; isLoading: boolean }) {
  const statusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-100 text-green-700 border-green-200">Concluído</Badge>;
      case "processing":
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-300 bg-blue-50 gap-1">
            <Loader2 className="h-3 w-3 animate-spin" /> A processar
          </Badge>
        );
      case "failed":
        return <Badge variant="destructive">Falhou</Badge>;
      default:
        return <Badge variant="secondary">Pendente</Badge>;
    }
  };

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Tipo</TableHead>
            <TableHead>Conteúdo</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead>Resultado</TableHead>
            <TableHead>Data</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                A carregar...
              </TableCell>
            </TableRow>
          ) : jobs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                Nenhum job de geração encontrado
              </TableCell>
            </TableRow>
          ) : (
            jobs.map((job) => (
              <TableRow key={job.id}>
                <TableCell>
                  <Badge variant="outline" className="capitalize">{job.job_type}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {job.content_type === "both" ? "Reviews + Q&A" : job.content_type === "reviews" ? "Reviews" : "Q&A"}
                  <span className="text-muted-foreground ml-1">
                    ({job.reviews_count}R / {job.qa_count}Q)
                  </span>
                </TableCell>
                <TableCell>{statusBadge(job.status)}</TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {job.result_json ? (
                    <span>
                      {job.result_json.reviews_generated || 0} reviews, {job.result_json.qa_generated || 0} Q&A
                    </span>
                  ) : job.error_message ? (
                    <span className="text-destructive text-xs">{job.error_message}</span>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                  {format(new Date(job.created_at), "d MMM yyyy HH:mm", { locale: pt })}
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

function QAModerationTable() {
  const [filter, setFilter] = useState<"pending" | "approved" | "all">("pending");
  const { data: qaItems = [], isLoading } = useWorkspaceQA(filter);
  const approveQA = useApproveQA();
  const rejectQA = useRejectQA();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          Moderar perguntas e respostas geradas por bots
        </p>
        <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
          <SelectTrigger className="w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="pending">Pendentes</SelectItem>
            <SelectItem value="approved">Aprovadas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produto</TableHead>
              <TableHead>Pergunta</TableHead>
              <TableHead>Resposta</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  A carregar...
                </TableCell>
              </TableRow>
            ) : qaItems.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Sem Q&A {filter === "pending" ? "pendentes" : "nesta categoria"}
                </TableCell>
              </TableRow>
            ) : (
              qaItems.map((qa: any) => (
                <TableRow key={qa.id}>
                  <TableCell className="font-medium max-w-[150px] truncate">
                    {qa.product_name}
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="flex items-start gap-1.5">
                      <HelpCircle className="h-3.5 w-3.5 mt-0.5 text-primary shrink-0" />
                      <p className="text-sm line-clamp-2">{qa.question}</p>
                    </div>
                  </TableCell>
                  <TableCell className="max-w-[250px]">
                    <div className="flex items-start gap-1.5">
                      <MessageSquare className="h-3.5 w-3.5 mt-0.5 text-muted-foreground shrink-0" />
                      <p className="text-xs text-muted-foreground line-clamp-2">{qa.answer}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    {qa.is_approved ? (
                      <Badge className="bg-green-100 text-green-700 border-green-200">Aprovado</Badge>
                    ) : (
                      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
                        Pendente
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      {!qa.is_approved && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={() => approveQA.mutate(qa.id)}
                          disabled={approveQA.isPending}
                          title="Aprovar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive"
                        onClick={() => rejectQA.mutate(qa.id)}
                        disabled={rejectQA.isPending}
                        title="Eliminar"
                      >
                        <XCircle className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

function GenerateDialog({
  open,
  onOpenChange,
  onGenerate,
  isLoading,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onGenerate: (params: any) => void;
  isLoading: boolean;
}) {
  const { currentWorkspace } = useWorkspace();
  const [productId, setProductId] = useState("");
  const [contentType, setContentType] = useState("both");
  const [reviewsCount, setReviewsCount] = useState(3);
  const [qaCount, setQaCount] = useState(2);

  // Fetch published products for selection
  const { data: products = [] } = useQuery({
    queryKey: ["products-for-bot", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("workspace_id", currentWorkspace.id)
        .eq("b2b_published", true)
        .order("name")
        .limit(100);
      if (error) throw error;
      return data || [];
    },
    enabled: open && !!currentWorkspace?.id,
  });

  const handleSubmit = () => {
    if (!productId) return;
    onGenerate({ productId, contentType, reviewsCount, qaCount });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Gerar Comentários com IA
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1.5 block">Produto</label>
            <Select value={productId} onValueChange={setProductId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar produto..." />
              </SelectTrigger>
              <SelectContent>
                {products.map((p: any) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-sm font-medium mb-1.5 block">Tipo de conteúdo</label>
            <Select value={contentType} onValueChange={setContentType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="both">Reviews + Q&A</SelectItem>
                <SelectItem value="reviews">Apenas Reviews</SelectItem>
                <SelectItem value="qa">Apenas Q&A</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {contentType !== "qa" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nº Reviews</label>
                <Select value={String(reviewsCount)} onValueChange={(v) => setReviewsCount(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {contentType !== "reviews" && (
              <div>
                <label className="text-sm font-medium mb-1.5 block">Nº Q&A</label>
                <Select value={String(qaCount)} onValueChange={(v) => setQaCount(Number(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <p className="text-xs text-muted-foreground bg-muted/50 p-2.5 rounded-md">
            Os comentários são gerados como rascunho e precisam de aprovação manual antes de ficarem visíveis na loja.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={!productId || isLoading} className="gap-2">
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Gerar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
