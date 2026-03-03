import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useProcurementProject } from "@/hooks/useProcurementProjects";
import { useRFQs, useCreateRFQFromNeeds } from "@/hooks/useRFQ";
import { useSuppliers } from "@/hooks/useProcurement";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Plus, Send, Loader2, Package, FileText, CalendarIcon } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { useTranslation } from "react-i18next";

const statusColors: Record<string, string> = {
  none: "bg-muted text-muted-foreground",
  open: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  rfq_sent: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  rfq_in_progress: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  quoted: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200",
  ordered: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  partially_received: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  received: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  resolved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
};

export default function ProcurementProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation("procurement");
  const { currentWorkspace } = useWorkspace();
  const { project, items, needs, isLoading } = useProcurementProject(id);
  const { data: rfqs } = useRFQs(currentWorkspace?.id);
  const { data: suppliers } = useSuppliers(currentWorkspace?.id);
  const createRFQ = useCreateRFQFromNeeds();

  const [showRFQModal, setShowRFQModal] = useState(false);
  const [selectedSuppliers, setSelectedSuppliers] = useState<string[]>([]);
  const [rfqTitle, setRfqTitle] = useState("");
  const [rfqDueDate, setRfqDueDate] = useState<Date | undefined>(undefined);

  const projectRFQs = (rfqs || []).filter((r: any) => r.project_id === id);
  const openNeeds = needs.filter((n: any) => n.status === "open");

  const handleCreateRFQ = async () => {
    if (!currentWorkspace?.id || !id || !selectedSuppliers.length) return;
    await createRFQ.mutateAsync({
      project_id: id,
      workspace_id: currentWorkspace.id,
      supplier_ids: selectedSuppliers,
      title: rfqTitle || undefined,
      due_date: rfqDueDate ? format(rfqDueDate, "yyyy-MM-dd") : undefined,
    });
    setShowRFQModal(false);
    setSelectedSuppliers([]);
    setRfqTitle("");
    setRfqDueDate(undefined);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>;
  }

  if (!project) {
    return <div className="p-6 text-muted-foreground">Projeto não encontrado.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/procurement/projects")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <Badge className={statusColors[project.status] || ""}>{project.status}</Badge>
        </div>
        {openNeeds.length > 0 && (
          <Button onClick={() => setShowRFQModal(true)}>
            <Plus className="mr-2 h-4 w-4" /> Criar RFQ
          </Button>
        )}
      </div>

      {/* Project Items */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" /> Itens do Projeto
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead className="text-right">Qtd. Vendida</TableHead>
                <TableHead className="text-right">Stock (criação)</TableHead>
                <TableHead className="text-right">A Comprar</TableHead>
                <TableHead>Estado</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell>{(item as any).products?.name || item.description || "—"}</TableCell>
                  <TableCell className="text-right">{item.qty_sold}</TableCell>
                  <TableCell className="text-right">{item.qty_in_stock_at_creation}</TableCell>
                  <TableCell className="text-right font-medium">{item.qty_to_buy}</TableCell>
                  <TableCell>
                    <Badge className={statusColors[item.procurement_status] || ""} variant="secondary">
                      {item.procurement_status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Needs */}
      {needs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Necessidades de Compra</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="text-right">Necessário</TableHead>
                  <TableHead className="text-right">Disponível</TableHead>
                  <TableHead className="text-right">A Comprar</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {needs.map((need: any) => (
                  <TableRow key={need.id}>
                    <TableCell>{(need as any).products?.name || "—"}</TableCell>
                    <TableCell className="text-right">{need.qty_needed}</TableCell>
                    <TableCell className="text-right">{need.qty_available}</TableCell>
                    <TableCell className="text-right font-medium">{need.qty_to_buy}</TableCell>
                    <TableCell>
                      <Badge className={statusColors[need.status] || ""} variant="secondary">
                        {need.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* RFQs */}
      {projectRFQs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" /> Pedidos de Cotação (RFQs)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectRFQs.map((rfq: any) => (
                  <TableRow key={rfq.id}>
                    <TableCell className="font-medium">{rfq.title}</TableCell>
                    <TableCell><Badge variant="secondary">{rfq.status}</Badge></TableCell>
                    <TableCell>{rfq.due_date || "—"}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" onClick={() => navigate(`/dashboard/procurement/rfqs/${rfq.id}`)}>
                        Ver
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Create RFQ Modal */}
      <Dialog open={showRFQModal} onOpenChange={setShowRFQModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Criar Pedido de Cotação (RFQ)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Título (opcional)</Label>
              <Input value={rfqTitle} onChange={(e) => setRfqTitle(e.target.value)} placeholder={`RFQ - ${project.name}`} />
            </div>
            {project.source_type === "proposal" && project.source_id && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">Proposta de origem:</span>{" "}
                <span className="font-medium">{project.source_id}</span>
              </div>
            )}
            <div>
              <Label>Data Limite de Resposta</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !rfqDueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {rfqDueDate ? format(rfqDueDate, "dd/MM/yyyy") : "Selecionar data..."}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={rfqDueDate}
                    onSelect={setRfqDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div>
              <Label>Itens ({openNeeds.length} necessidades em aberto)</Label>
              <div className="text-sm text-muted-foreground mt-1">
                {openNeeds.map((n: any) => (
                  <div key={n.id}>{(n as any).products?.name || "Produto"} — Qtd: {n.qty_to_buy}</div>
                ))}
              </div>
            </div>
            <div>
              <Label>Fornecedores a convidar</Label>
              <div className="space-y-2 mt-2 max-h-48 overflow-y-auto">
                {(suppliers || []).filter((s: any) => s.status === "active").map((s: any) => (
                  <label key={s.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selectedSuppliers.includes(s.id)}
                      onCheckedChange={(checked) => {
                        setSelectedSuppliers(prev =>
                          checked ? [...prev, s.id] : prev.filter(id => id !== s.id)
                        );
                      }}
                    />
                    {s.name}
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRFQModal(false)}>Cancelar</Button>
            <Button onClick={handleCreateRFQ} disabled={!selectedSuppliers.length || createRFQ.isPending}>
              {createRFQ.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar RFQ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
