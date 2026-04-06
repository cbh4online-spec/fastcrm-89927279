import { useState } from "react";
import { Helmet } from "react-helmet-async";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import {
  useStoreReviewModeration,
  useApproveReview,
  useRejectReview,
  useDeleteReview,
} from "@/hooks/useStoreReviewModeration";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Star,
  CheckCircle,
  XCircle,
  Trash2,
  Clock,
  MessageSquare,
  Bot,
} from "lucide-react";
import { format } from "date-fns";
import { pt } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { BotCommentsPanel } from "@/components/store/admin/BotCommentsPanel";

function Stars({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={cn(
            "h-4 w-4",
            s <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
          )}
        />
      ))}
    </div>
  );
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function StoreReviewsPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("pending");
  const { data: reviews = [], isLoading } = useStoreReviewModeration(statusFilter);
  const approveReview = useApproveReview();
  const rejectReview = useRejectReview();
  const deleteReview = useDeleteReview();

  const [rejectDialog, setRejectDialog] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const handleReject = (reviewId: string) => {
    rejectReview.mutate(
      { reviewId, reason: rejectReason || undefined },
      {
        onSuccess: () => {
          setRejectDialog(null);
          setRejectReason("");
        },
      }
    );
  };

  const getStatusBadge = (review: any) => {
    if (review.is_approved) {
      return <Badge className="bg-green-100 text-green-700 border-green-200">Aprovada</Badge>;
    }
    if (review.moderated_at) {
      return <Badge variant="destructive">Rejeitada</Badge>;
    }
    return (
      <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50">
        <Clock className="h-3 w-3 mr-1" /> Pendente
      </Badge>
    );
  };

  const pendingCount = reviews.filter((r) => !r.is_approved && !r.moderated_at).length;

  return (
    <>
      <Helmet>
        <title>Avaliações & Comentários | FastCRM</title>
      </Helmet>
      <DashboardLayout>
        <main className="p-6 space-y-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <MessageSquare className="h-6 w-6" /> Avaliações & Comentários
            </h1>
            <p className="text-sm text-muted-foreground">
              Moderar avaliações e gerir comentários inteligentes
            </p>
          </div>

          <Tabs defaultValue="reviews">
            <TabsList>
              <TabsTrigger value="reviews" className="gap-1.5">
                <MessageSquare className="h-3.5 w-3.5" /> Avaliações
                {pendingCount > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">
                    {pendingCount}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="bot" className="gap-1.5">
                <Bot className="h-3.5 w-3.5" /> Bot Inteligente
              </TabsTrigger>
            </TabsList>

            <TabsContent value="reviews" className="mt-4 space-y-4">
              <div className="flex justify-end">
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendentes</SelectItem>
                    <SelectItem value="approved">Aprovadas</SelectItem>
                    <SelectItem value="rejected">Rejeitadas</SelectItem>
                    <SelectItem value="all">Todas</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Avaliação</TableHead>
                      <TableHead>Fonte</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          A carregar...
                        </TableCell>
                      </TableRow>
                    ) : reviews.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          {statusFilter === "pending"
                            ? "Sem avaliações pendentes 🎉"
                            : "Sem avaliações nesta categoria"}
                        </TableCell>
                      </TableRow>
                    ) : (
                      reviews.map((r: any) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium max-w-[200px] truncate">
                            {r.product_name}
                          </TableCell>
                          <TableCell>
                            <Stars rating={r.rating} />
                          </TableCell>
                          <TableCell className="max-w-[300px]">
                            <div className="space-y-1">
                              {r.title && (
                                <p className="font-medium text-sm truncate">{r.title}</p>
                              )}
                              {r.comment && (
                                <p className="text-xs text-muted-foreground line-clamp-2">
                                  {r.comment}
                                </p>
                              )}
                              {r.reviewer_name && (
                                <p className="text-[10px] text-muted-foreground">
                                  por {r.reviewer_name}
                                </p>
                              )}
                              {r.is_verified_purchase && (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] gap-1 text-green-600 border-green-200"
                                >
                                  <CheckCircle className="h-3 w-3" /> Compra verificada
                                </Badge>
                              )}
                              {r.rejection_reason && (
                                <p className="text-[10px] text-destructive italic">
                                  Motivo: {r.rejection_reason}
                                </p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {r.source === "bot" ? (
                              <Badge variant="outline" className="gap-1 text-[10px]">
                                <Bot className="h-3 w-3" /> Bot
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px]">Cliente</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            {format(new Date(r.created_at), "d MMM yyyy", { locale: pt })}
                          </TableCell>
                          <TableCell>{getStatusBadge(r)}</TableCell>
                          <TableCell>
                            <div className="flex items-center justify-end gap-1">
                              {!r.is_approved && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => approveReview.mutate(r.id)}
                                  disabled={approveReview.isPending}
                                  title="Aprovar"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {(r.is_approved || !r.moderated_at) && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                                  onClick={() => setRejectDialog(r.id)}
                                  title="Rejeitar"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive"
                                onClick={() => deleteReview.mutate(r.id)}
                                disabled={deleteReview.isPending}
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </TabsContent>

            <TabsContent value="bot" className="mt-4">
              <BotCommentsPanel />
            </TabsContent>
          </Tabs>
        </main>
      </DashboardLayout>

      {/* Reject dialog */}
      <Dialog open={!!rejectDialog} onOpenChange={() => setRejectDialog(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Rejeitar avaliação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Motivo da rejeição (opcional)"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setRejectDialog(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                onClick={() => rejectDialog && handleReject(rejectDialog)}
                disabled={rejectReview.isPending}
              >
                Rejeitar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
