import { useState } from "react";
import { useStoreFaqs, useCreateStoreFaq, useUpdateStoreFaq, useDeleteStoreFaq, type StoreFaq } from "@/hooks/useStoreFaqs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, GripVertical, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";

export function StoreFaqManager() {
  const { data: faqs = [], isLoading } = useStoreFaqs();
  const createFaq = useCreateStoreFaq();
  const updateFaq = useUpdateStoreFaq();
  const deleteFaq = useDeleteStoreFaq();

  const [open, setOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<StoreFaq | null>(null);
  const [form, setForm] = useState({ question: "", answer: "" });

  const handleOpen = (faq?: StoreFaq) => {
    if (faq) {
      setEditingFaq(faq);
      setForm({ question: faq.question, answer: faq.answer });
    } else {
      setEditingFaq(null);
      setForm({ question: "", answer: "" });
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.question.trim() || !form.answer.trim()) return;
    if (editingFaq) {
      updateFaq.mutate({ id: editingFaq.id, question: form.question, answer: form.answer });
    } else {
      createFaq.mutate({ question: form.question, answer: form.answer, sort_order: faqs.length });
    }
    setOpen(false);
    setForm({ question: "", answer: "" });
    setEditingFaq(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg flex items-center gap-2">
          <HelpCircle className="h-5 w-5" />
          Perguntas Frequentes (FAQ)
        </CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" className="gap-1" onClick={() => handleOpen()}>
              <Plus className="h-4 w-4" /> Adicionar
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingFaq ? "Editar FAQ" : "Nova FAQ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Pergunta</Label>
                <Input
                  value={form.question}
                  onChange={(e) => setForm(f => ({ ...f, question: e.target.value }))}
                  placeholder="Ex: Qual é o prazo de entrega?"
                />
              </div>
              <div>
                <Label>Resposta</Label>
                <Textarea
                  value={form.answer}
                  onChange={(e) => setForm(f => ({ ...f, answer: e.target.value }))}
                  placeholder="Escreva a resposta aqui..."
                  rows={4}
                />
              </div>
              <Button
                onClick={handleSave}
                disabled={!form.question.trim() || !form.answer.trim() || createFaq.isPending || updateFaq.isPending}
                className="w-full"
              >
                {editingFaq ? "Guardar Alterações" : "Criar FAQ"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4 text-center">A carregar...</p>
        ) : faqs.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            Sem FAQs. Adicione perguntas frequentes para a sua loja.
          </p>
        ) : (
          <div className="space-y-2">
            {faqs.map((faq) => (
              <div key={faq.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <GripVertical className="h-4 w-4 mt-1 text-muted-foreground/50 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm">{faq.question}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{faq.answer}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Switch
                    checked={faq.is_active}
                    onCheckedChange={(v) => updateFaq.mutate({ id: faq.id, is_active: v })}
                  />
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleOpen(faq)}>
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteFaq.mutate(faq.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
