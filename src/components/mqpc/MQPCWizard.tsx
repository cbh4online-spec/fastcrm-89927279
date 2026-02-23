import { useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Loader2, Check } from "lucide-react";
import { MQPCStepImages, type ImageItem } from "./MQPCStepImages";
import { MQPCStepDetails, type ProductDetails } from "./MQPCStepDetails";
import { MQPCStepExtras, type ExtrasData } from "./MQPCStepExtras";
import { useAdminStoreCategories } from "@/hooks/useAdminStoreCategories";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STEPS = ["Imagens", "Dados", "Extras"];

export function MQPCWizard() {
  const navigate = useNavigate();
  const { currentWorkspace } = useWorkspace();
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

  // Idempotency key ref - generated once per creation attempt, reused on retries
  const idempotencyKeyRef = useRef<string | null>(null);

  const validateStep1 = () => true;
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

    if (!currentWorkspace?.id) {
      toast.error("Workspace não encontrado");
      return;
    }

    setCreating(true);

    // Generate idempotency key once
    if (!idempotencyKeyRef.current) {
      idempotencyKeyRef.current = `mqpc:${currentWorkspace.id}:${Date.now()}:${crypto.randomUUID().slice(0, 8)}`;
    }

    try {
      const stockQty = extras.stockQuantity ? parseInt(extras.stockQuantity) : null;

      const body = {
        product: {
          name: details.name.trim(),
          price: {
            amount: parseFloat(details.price),
            currency: "EUR",
            tax_included: true,
          },
          category_id: details.categoryId,
          status: details.publishNow ? "active" : "draft",
          short_description: extras.shortDescription || null,
          description: extras.fullDescription || null,
          sku: extras.sku || null,
        },
        images: images
          .filter((img) => img.storagePath)
          .map((img, i) => {
            // Extract file_id from storage_path: workspaces/.../tmp/{file_id}.jpg
            const parts = img.storagePath!.split("/");
            const fileName = parts[parts.length - 1];
            const fileId = fileName.replace(".jpg", "");
            return {
              file_id: fileId,
              storage_path: img.storagePath!,
              position: i + 1,
              alt: details.name.trim(),
            };
          }),
        inventory: {
          track_stock: !!stockQty,
          quantity: stockQty,
          in_stock: true,
        },
        variants: [],
        options: {
          publish_now: details.publishNow,
          generate_slug: true,
          channel: "mobile_quick",
          is_quick_created: true,
          create_audit_log: true,
        },
        client: {
          device: "mobile",
          app_version: "fastcrm-web",
          locale: "pt-PT",
        },
      };

      const { data, error } = await supabase.functions.invoke(
        "product-quick-create",
        {
          body,
          headers: {
            "X-Workspace-Id": currentWorkspace.id,
            "X-Idempotency-Key": idempotencyKeyRef.current,
          },
        }
      );

      if (error) {
        throw new Error(error.message || "Erro ao criar produto");
      }

      if (!data?.success) {
        throw new Error(data?.message || "Erro ao criar produto");
      }

      // Reset idempotency key after successful creation
      idempotencyKeyRef.current = null;

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
