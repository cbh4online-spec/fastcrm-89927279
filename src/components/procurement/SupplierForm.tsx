import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState, useEffect } from "react";
import { Star, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface SupplierFormProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplier?: any;
  onSave: (values: any) => Promise<void>;
}

const defaultForm = {
  name: "", vat_number: "", email: "", phone: "", address: "", iban: "",
  payment_terms: "30 dias", category: "general", status: "active", notes: "",
  website: "", country: "", contact_person: "", contact_person_role: "",
  rating: 0, min_order_value: "", delivery_time_days: "",
  product_categories: [] as string[], certifications: [] as string[],
  tags: [] as string[], platforms: [] as { name: string; url: string }[],
};

export function SupplierForm({ open, onOpenChange, supplier, onSave }: SupplierFormProps) {
  const { t } = useTranslation("procurement");
  const [form, setForm] = useState({ ...defaultForm });
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");
  const [certInput, setCertInput] = useState("");
  const [catInput, setCatInput] = useState("");
  const [platName, setPlatName] = useState("");
  const [platUrl, setPlatUrl] = useState("");

  useEffect(() => {
    if (supplier) {
      setForm({
        name: supplier.name || "",
        vat_number: supplier.vat_number || "",
        email: supplier.email || "",
        phone: supplier.phone || "",
        address: supplier.address || "",
        iban: supplier.iban || "",
        payment_terms: supplier.payment_terms || "30 dias",
        category: supplier.category || "general",
        status: supplier.status || "active",
        notes: supplier.notes || "",
        website: supplier.website || "",
        country: supplier.country || "",
        contact_person: supplier.contact_person || "",
        contact_person_role: supplier.contact_person_role || "",
        rating: supplier.rating || 0,
        min_order_value: supplier.min_order_value?.toString() || "",
        delivery_time_days: supplier.delivery_time_days?.toString() || "",
        product_categories: supplier.product_categories || [],
        certifications: supplier.certifications || [],
        tags: supplier.tags || [],
        platforms: supplier.platforms || [],
      });
    } else {
      setForm({ ...defaultForm });
    }
  }, [supplier, open]);

  const handleSubmit = async () => {
    if (!form.name) return;
    setSaving(true);
    const payload = {
      ...form,
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      delivery_time_days: form.delivery_time_days ? parseInt(form.delivery_time_days) : null,
    };
    await onSave(payload);
    setSaving(false);
  };

  const addToArray = (field: "tags" | "certifications" | "product_categories", value: string, setter: (v: string) => void) => {
    const trimmed = value.trim();
    if (trimmed && !form[field].includes(trimmed)) {
      setForm({ ...form, [field]: [...form[field], trimmed] });
    }
    setter("");
  };

  const removeFromArray = (field: "tags" | "certifications" | "product_categories", value: string) => {
    setForm({ ...form, [field]: form[field].filter((v: string) => v !== value) });
  };

  const addPlatform = () => {
    if (platName.trim()) {
      setForm({ ...form, platforms: [...form.platforms, { name: platName.trim(), url: platUrl.trim() }] });
      setPlatName(""); setPlatUrl("");
    }
  };

  const removePlatform = (idx: number) => {
    setForm({ ...form, platforms: form.platforms.filter((_, i) => i !== idx) });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{supplier ? t("editSupplier") : t("addSupplier")}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="general">Geral</TabsTrigger>
            <TabsTrigger value="commercial">Comercial</TabsTrigger>
            <TabsTrigger value="products">Produtos</TabsTrigger>
            <TabsTrigger value="contact">Contacto</TabsTrigger>
          </TabsList>

          <TabsContent value="general" className="space-y-3 mt-3">
            <div><Label>{t("supplierName")} *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("vatNumber")}</Label><Input value={form.vat_number} onChange={(e) => setForm({ ...form, vat_number: e.target.value })} /></div>
              <div><Label>{t("iban")}</Label><Input value={form.iban} onChange={(e) => setForm({ ...form, iban: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("address")}</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div><Label>País</Label><Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} placeholder="Portugal" /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>{t("category")}</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">{t("general")}</SelectItem>
                    <SelectItem value="services">{t("services")}</SelectItem>
                    <SelectItem value="materials">{t("materials")}</SelectItem>
                    <SelectItem value="technology">{t("technology")}</SelectItem>
                    <SelectItem value="other">{t("other")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("status")}</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">{t("active")}</SelectItem>
                    <SelectItem value="inactive">{t("inactive")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="commercial" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>{t("paymentTerms")}</Label><Input value={form.payment_terms} onChange={(e) => setForm({ ...form, payment_terms: e.target.value })} /></div>
              <div><Label>Valor mín. encomenda (€)</Label><Input type="number" value={form.min_order_value} onChange={(e) => setForm({ ...form, min_order_value: e.target.value })} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Prazo entrega (dias)</Label><Input type="number" value={form.delivery_time_days} onChange={(e) => setForm({ ...form, delivery_time_days: e.target.value })} /></div>
              <div>
                <Label>Avaliação</Label>
                <div className="flex gap-1 mt-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button key={star} type="button" onClick={() => setForm({ ...form, rating: star })} className="focus:outline-none">
                      <Star className={`h-5 w-5 ${star <= form.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"}`} />
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <Label>Certificações</Label>
              <div className="flex gap-2 mt-1">
                <Input value={certInput} onChange={(e) => setCertInput(e.target.value)} placeholder="ISO 9001..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("certifications", certInput, setCertInput))} />
                <Button type="button" size="icon" variant="outline" onClick={() => addToArray("certifications", certInput, setCertInput)}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.certifications.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">{c}<X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray("certifications", c)} /></Badge>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="products" className="space-y-3 mt-3">
            <div>
              <Label>Categorias de produtos</Label>
              <div className="flex gap-2 mt-1">
                <Input value={catInput} onChange={(e) => setCatInput(e.target.value)} placeholder="Parafusos, Tintas..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("product_categories", catInput, setCatInput))} />
                <Button type="button" size="icon" variant="outline" onClick={() => addToArray("product_categories", catInput, setCatInput)}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.product_categories.map((c) => (
                  <Badge key={c} variant="secondary" className="gap-1">{c}<X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray("product_categories", c)} /></Badge>
                ))}
              </div>
            </div>
            <div>
              <Label>Plataformas</Label>
              <div className="flex gap-2 mt-1">
                <Input value={platName} onChange={(e) => setPlatName(e.target.value)} placeholder="Nome (ex: Amazon)" className="w-1/3" />
                <Input value={platUrl} onChange={(e) => setPlatUrl(e.target.value)} placeholder="URL de acesso" className="flex-1" />
                <Button type="button" size="icon" variant="outline" onClick={addPlatform}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="space-y-1 mt-2">
                {form.platforms.map((p, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm bg-muted/50 rounded px-2 py-1">
                    <span className="font-medium">{p.name}</span>
                    {p.url && <a href={p.url} target="_blank" rel="noopener noreferrer" className="text-primary underline truncate max-w-[200px]">{p.url}</a>}
                    <X className="h-3 w-3 cursor-pointer ml-auto text-muted-foreground" onClick={() => removePlatform(i)} />
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="contact" className="space-y-3 mt-3">
            <div className="grid grid-cols-2 gap-3">
              <div><Label>Contacto principal</Label><Input value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} /></div>
              <div><Label>Cargo</Label><Input value={form.contact_person_role} onChange={(e) => setForm({ ...form, contact_person_role: e.target.value })} /></div>
            </div>
            <div><Label>Website</Label><Input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="https://" /></div>
            <div>
              <Label>Tags</Label>
              <div className="flex gap-2 mt-1">
                <Input value={tagInput} onChange={(e) => setTagInput(e.target.value)} placeholder="Adicionar tag..." onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addToArray("tags", tagInput, setTagInput))} />
                <Button type="button" size="icon" variant="outline" onClick={() => addToArray("tags", tagInput, setTagInput)}><Plus className="h-4 w-4" /></Button>
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {form.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="gap-1">{tag}<X className="h-3 w-3 cursor-pointer" onClick={() => removeFromArray("tags", tag)} /></Badge>
                ))}
              </div>
            </div>
            <div><Label>{t("notes")}</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} /></div>
          </TabsContent>
        </Tabs>

        <Button className="w-full mt-3" onClick={handleSubmit} disabled={saving || !form.name}>
          {saving ? "A guardar..." : supplier ? t("editSupplier") : t("addSupplier")}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
