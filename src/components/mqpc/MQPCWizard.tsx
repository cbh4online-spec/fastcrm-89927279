import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { MQPCStepImages, type ImageItem } from "./MQPCStepImages";
import { MQPCStepDetails, type ProductDetails } from "./MQPCStepDetails";
import { MQPCStepExtras, type ExtrasData } from "./MQPCStepExtras";
import { useCreateProduct } from "@/hooks/useProducts";
import { useAdminStoreCategories } from "@/hooks/useAdminStoreCategories";
import { toast } from "sonner";

const STEPS = ["Imagens", "Dados", "Extras"];

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function MQPCWizard() {
  const navigate = useNavigate();
  const createProduct = useCreateProduct();
  const { data: categories = [] } = useAdminStoreCategories();
  const [step, setStep] = useState(0);
  const [creating, setCreating] = useState(false);

  const [images, setImages] = useState<ImageItem[]>([]);
  const [details, setDetails] = useState<ProductDetails>({
    name: "",
    price: "",
    categoryId: "",
    publishNow: false,
  });
  const [detailErrors, setDetailErrors] = useState<Record<string, string>>({});
  const [extras, setExtras] = useState<ExtrasData>({
    shortDescription: "",
    fullDescription: "",
    sku: "",
    stockQuantity: "",
  });

  const validateStep1 = () => true; // Images are optional
  const validateStep2 = () => {
    const errors: Record<string, string> = {};
    if (!details.name.trim()) errors.name = "Nome é obrigatório";
    if (!details.price || parseFloat(details.price) <= 0) errors.price = "Preço é obrigatório";
    if (!details.categoryId) errors.categoryId = "Selecione uma categoria";
    setDetailErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const goNext = () => {
    if (step === 0 && validateStep1()) setStep(1);
    else if (step === 1 && validateStep2()) setStep(2);
  };

  const goBack = () => {
    if (step > 0) setStep(step - 1);
    else navigate(-1);
  };

  const handleCreate = async () => {
    if (!validateStep2()) {
      setStep(1);
      return;
    }

    setCreating(true);
    try {
      const category = categories.find((c) => c.id === details.categoryId);
      // Prefer storage_paths for future product-quick-create; fallback to public URLs for current useCreateProduct
      const storagePaths = images.filter((img) => img.storagePath).map((img) => img.storagePath!);
      const imageUrls = storagePaths.length > 0
        ? storagePaths.map((p) => `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/product-images/${p}`)
        : images.filter((img) => img.url).map((img) => img.url!);

      await createProduct.mutateAsync({
        name: details.name.trim(),
        base_price: parseFloat(details.price),
        category: category?.name || "",
        status: details.publishNow ? "active" : "draft",
        short_description: extras.shortDescription || undefined,
        commercial_description: extras.fullDescription || undefined,
        sku: extras.sku || undefined,
        images: imageUrls.length > 0 ? imageUrls : undefined,
        sheet_slug: slugify(details.name),
        stock_quantity: extras.stockQuantity ? parseInt(extras.stockQuantity) : undefined,
        stock_status: extras.stockQuantity ? "in_stock" : undefined,
        store_published: details.publishNow,
        is_quick_created: true,
        created_channel: "mobile_quick",
      } as any);

      toast.success("Produto criado com sucesso! 🎉");
      navigate("/dashboard/store-products");
    } catch (err: any) {
      toast.error("Erro ao criar: " + err.message);
    } finally {
      setCreating(false);
    }
  };

  const categoryName = categories.find((c) => c.id === details.categoryId)?.name || "";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={goBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="font-semibold">Criar Produto</h1>
          <span className="text-sm text-muted-foreground">
            {step + 1}/{STEPS.length}
          </span>
        </div>
        <div className="flex gap-2">
          {STEPS.map((label, i) => (
            <div key={label} className="flex-1 space-y-1">
              <div
                className={`h-1 rounded-full transition-colors ${
                  i <= step ? "bg-primary" : "bg-muted"
                }`}
              />
              <p className={`text-[10px] text-center ${i <= step ? "text-primary font-medium" : "text-muted-foreground"}`}>
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-4 py-6">
        {step === 0 && <MQPCStepImages images={images} onImagesChange={setImages} />}
        {step === 1 && <MQPCStepDetails details={details} onDetailsChange={setDetails} errors={detailErrors} />}
        {step === 2 && (
          <MQPCStepExtras
            extras={extras}
            onExtrasChange={setExtras}
            productName={details.name}
            categoryName={categoryName}
          />
        )}
      </div>

      {/* Footer */}
      <div className="sticky bottom-0 bg-background/95 backdrop-blur border-t px-4 py-4 safe-area-pb">
        {step < 2 ? (
          <Button onClick={goNext} className="w-full h-12 text-base gap-2">
            Seguinte
            <ArrowRight className="h-5 w-5" />
          </Button>
        ) : (
          <Button
            onClick={handleCreate}
            disabled={creating}
            className="w-full h-12 text-base gap-2"
          >
            {creating ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                A criar...
              </>
            ) : (
              <>
                <Check className="h-5 w-5" />
                Criar Produto
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
