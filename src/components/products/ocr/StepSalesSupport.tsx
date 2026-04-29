import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Sparkles, Plus, Trash2 } from "lucide-react";
import type { SalesSupportData, FAQ, Objection } from "./types";

interface Props {
  sales: SalesSupportData;
  onChange: (s: SalesSupportData) => void;
  onGenerate: () => void;
}

export function StepSalesSupport({ sales, onChange, onGenerate }: Props) {
  const set = <K extends keyof SalesSupportData>(k: K, v: SalesSupportData[K]) =>
    onChange({ ...sales, [k]: v });
  const setList = (k: "sales_arguments" | "sensory_arguments" | "olfactory_arguments" | "sales_alerts" | "do_not_sell_as" | "sell_as", v: string) =>
    set(k, v.split("\n").map((s) => s.trim()).filter(Boolean));

  const addFaq = () => set("faqs", [...sales.faqs, { question: "", answer: "" }]);
  const updFaq = (i: number, f: keyof FAQ, v: string) =>
    set("faqs", sales.faqs.map((q, idx) => (idx === i ? { ...q, [f]: v } : q)));
  const rmFaq = (i: number) => set("faqs", sales.faqs.filter((_, idx) => idx !== i));

  const addObj = () => set("objections", [...sales.objections, { objection: "", response: "" }]);
  const updObj = (i: number, f: keyof Objection, v: string) =>
    set("objections", sales.objections.map((o, idx) => (idx === i ? { ...o, [f]: v } : o)));
  const rmObj = (i: number) => set("objections", sales.objections.filter((_, idx) => idx !== i));

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Passo 5 — Argumentário Comercial</CardTitle>
          <CardDescription>Posicionamento, FAQs, objeções e scripts de venda.</CardDescription>
        </div>
        <Button onClick={onGenerate} variant="secondary" size="sm">
          <Sparkles className="h-4 w-4 mr-1" /> Gerar com IA
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Label className="text-xs">Posicionamento de venda</Label>
          <Textarea rows={2} value={sales.positioning} onChange={(e) => set("positioning", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Cliente ideal</Label>
          <Textarea rows={2} value={sales.ideal_customer} onChange={(e) => set("ideal_customer", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Como explicar ao cliente</Label>
          <Textarea rows={2} value={sales.how_to_explain} onChange={(e) => set("how_to_explain", e.target.value)} />
        </div>

        <div>
          <Label className="text-xs">Argumentos de venda (um por linha)</Label>
          <Textarea rows={3} value={sales.sales_arguments.join("\n")} onChange={(e) => setList("sales_arguments", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Argumentos sensoriais</Label>
          <Textarea rows={3} value={sales.sensory_arguments.join("\n")} onChange={(e) => setList("sensory_arguments", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Argumentos olfativos</Label>
          <Textarea rows={3} value={sales.olfactory_arguments.join("\n")} onChange={(e) => setList("olfactory_arguments", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Alertas de venda</Label>
          <Textarea rows={3} value={sales.sales_alerts.join("\n")} onChange={(e) => setList("sales_alerts", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Vender como</Label>
          <Textarea rows={3} value={sales.sell_as.join("\n")} onChange={(e) => setList("sell_as", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Não vender como</Label>
          <Textarea rows={3} value={sales.do_not_sell_as.join("\n")} onChange={(e) => setList("do_not_sell_as", e.target.value)} />
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Perguntas frequentes</Label>
            <Button variant="ghost" size="sm" onClick={addFaq}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
          </div>
          {sales.faqs.map((f, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-5" placeholder="Pergunta" value={f.question} onChange={(e) => updFaq(i, "question", e.target.value)} />
              <Textarea className="col-span-6" rows={1} placeholder="Resposta" value={f.answer} onChange={(e) => updFaq(i, "answer", e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => rmFaq(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs">Objeções e respostas</Label>
            <Button variant="ghost" size="sm" onClick={addObj}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
          </div>
          {sales.objections.map((o, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-start">
              <Input className="col-span-5" placeholder="Objeção" value={o.objection} onChange={(e) => updObj(i, "objection", e.target.value)} />
              <Textarea className="col-span-6" rows={1} placeholder="Resposta" value={o.response} onChange={(e) => updObj(i, "response", e.target.value)} />
              <Button variant="ghost" size="icon" onClick={() => rmObj(i)}><Trash2 className="h-4 w-4" /></Button>
            </div>
          ))}
        </div>

        <div>
          <Label className="text-xs">Script para balcão/loja</Label>
          <Textarea rows={3} value={sales.in_store_script} onChange={(e) => set("in_store_script", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Script para WhatsApp</Label>
          <Textarea rows={3} value={sales.whatsapp_script} onChange={(e) => set("whatsapp_script", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Script atendimento rápido</Label>
          <Textarea rows={3} value={sales.counter_script} onChange={(e) => set("counter_script", e.target.value)} />
        </div>
        <div>
          <Label className="text-xs">Script equipa comercial</Label>
          <Textarea rows={3} value={sales.sales_team_script} onChange={(e) => set("sales_team_script", e.target.value)} />
        </div>
        <div className="md:col-span-2">
          <Label className="text-xs">Notas internas</Label>
          <Textarea rows={2} value={sales.internal_notes} onChange={(e) => set("internal_notes", e.target.value)} />
        </div>
      </CardContent>
    </Card>
  );
}
