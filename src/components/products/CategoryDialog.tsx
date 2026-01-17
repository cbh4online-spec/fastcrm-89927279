import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Wand2, ImageIcon, Check, RefreshCw, Upload } from "lucide-react";
import {
  useCreateProductCategory,
  useUpdateProductCategory,
  useProductCategoriesList,
  ProductCategory,
} from "@/hooks/useProductCategories";
import { useCategoryAIAssistant } from "@/hooks/useCategoryAIAssistant";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const categorySchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  description: z.string().optional(),
  color: z.string().optional(),
  image_url: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CategoryFormData = z.infer<typeof categorySchema>;

const PRESET_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Green
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Purple
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo
];

interface CategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: ProductCategory | null;
}

export function CategoryDialog({ open, onOpenChange, category }: CategoryDialogProps) {
  const createCategory = useCreateProductCategory();
  const updateCategory = useUpdateProductCategory();
  const { data: existingCategories } = useProductCategoriesList();
  const { generateCategory, generateCategoryImage, suggestCategoryDetails } = useCategoryAIAssistant();
  const isEditing = !!category;

  const [theme, setTheme] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState<Set<string>>(new Set());

  const form = useForm<CategoryFormData>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: "",
      description: "",
      color: "#3B82F6",
      image_url: "",
      is_active: true,
    },
  });

  useEffect(() => {
    if (category) {
      form.reset({
        name: category.name,
        description: category.description || "",
        color: category.color || "#3B82F6",
        image_url: category.image_url || "",
        is_active: category.is_active,
      });
      setPreviewImage(category.image_url || null);
    } else {
      form.reset({
        name: "",
        description: "",
        color: "#3B82F6",
        image_url: "",
        is_active: true,
      });
      setPreviewImage(null);
      setTheme("");
      setAppliedSuggestions(new Set());
    }
  }, [category, form, open]);

  const onSubmit = async (data: CategoryFormData) => {
    try {
      if (isEditing && category) {
        await updateCategory.mutateAsync({
          id: category.id,
          ...data,
        });
      } else {
        await createCategory.mutateAsync({
          name: data.name,
          description: data.description,
          color: data.color,
          image_url: data.image_url,
          is_active: data.is_active,
        });
      }
      onOpenChange(false);
      form.reset();
    } catch (error) {
      // Error handled in mutation
    }
  };

  const handleGenerateFromTheme = async () => {
    if (!theme.trim()) {
      toast.error("Insira um tema para gerar a categoria");
      return;
    }

    try {
      const existingNames = existingCategories?.map(c => c.name) || [];
      const result = await generateCategory.mutateAsync({
        theme,
        existingCategories: existingNames,
      });

      form.setValue("name", result.name);
      form.setValue("description", result.description);
      form.setValue("color", result.color);
      setAppliedSuggestions(new Set(["name", "description", "color"]));
      toast.success("Categoria gerada com sucesso!");
    } catch (error) {
      toast.error("Erro ao gerar categoria");
    }
  };

  const handleGenerateImage = async () => {
    const name = form.getValues("name");
    const description = form.getValues("description");
    
    if (!name.trim()) {
      toast.error("Insira o nome da categoria primeiro");
      return;
    }

    try {
      const result = await generateCategoryImage.mutateAsync({
        categoryName: name,
        description,
      });

      if (result.imageBase64) {
        setPreviewImage(result.imageBase64);
        // Upload to storage
        await uploadImageToStorage(result.imageBase64);
      }
    } catch (error) {
      toast.error("Erro ao gerar imagem");
    }
  };

  const handleSuggestDetails = async () => {
    const name = form.getValues("name");
    if (!name.trim()) {
      toast.error("Insira o nome da categoria primeiro");
      return;
    }

    try {
      const result = await suggestCategoryDetails.mutateAsync({ name });
      form.setValue("description", result.description);
      form.setValue("color", result.color);
      setAppliedSuggestions(prev => new Set([...prev, "description", "color"]));
      toast.success("Sugestões aplicadas!");
    } catch (error) {
      toast.error("Erro ao sugerir detalhes");
    }
  };

  const uploadImageToStorage = async (base64Image: string) => {
    try {
      setIsUploadingImage(true);
      
      // Extract base64 data (remove data:image/xxx;base64, prefix if present)
      const base64Data = base64Image.includes(',') 
        ? base64Image.split(',')[1] 
        : base64Image;
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Data);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'image/png' });
      
      // Generate unique filename
      const fileName = `category-${Date.now()}-${Math.random().toString(36).substring(7)}.png`;
      
      // Upload to storage
      const { data, error } = await supabase.storage
        .from('category-images')
        .upload(fileName, blob, {
          contentType: 'image/png',
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error("Erro ao guardar imagem");
        return;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      form.setValue("image_url", publicUrl);
      toast.success("Imagem guardada!");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      
      const fileName = `category-${Date.now()}-${Math.random().toString(36).substring(7)}.${file.name.split('.').pop()}`;
      
      const { data, error } = await supabase.storage
        .from('category-images')
        .upload(fileName, file, {
          contentType: file.type,
          upsert: false,
        });

      if (error) {
        console.error('Upload error:', error);
        toast.error("Erro ao carregar imagem");
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('category-images')
        .getPublicUrl(fileName);

      form.setValue("image_url", publicUrl);
      setPreviewImage(publicUrl);
      toast.success("Imagem carregada!");
    } catch (error) {
      console.error('Upload error:', error);
      toast.error("Erro ao processar imagem");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const selectedColor = form.watch("color");
  const currentImageUrl = form.watch("image_url");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar Categoria" : "Nova Categoria"}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* AI Generation Section */}
            {!isEditing && (
              <Card className="p-4 bg-primary/5 border-primary/20">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="font-medium text-sm">Gerar com IA</span>
                </div>
                <div className="flex gap-2">
                  <Input
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                    placeholder="Tema ou palavra-chave (ex: Câmaras, Formação, Software)"
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleGenerateFromTheme}
                    disabled={generateCategory.isPending || !theme.trim()}
                    size="sm"
                  >
                    {generateCategory.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                    Gerar
                  </Button>
                </div>
                {generateCategory.isPending && (
                  <p className="text-xs text-muted-foreground mt-2">A gerar categoria...</p>
                )}
              </Card>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column: Form Fields */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Nome
                        {appliedSuggestions.has("name") && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />IA
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="flex gap-2">
                          <Input placeholder="Ex: Câmaras IP" {...field} />
                          {field.value && !isEditing && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={handleSuggestDetails}
                              disabled={suggestCategoryDetails.isPending}
                              title="Sugerir descrição e cor"
                            >
                              {suggestCategoryDetails.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Sparkles className="h-4 w-4" />
                              )}
                            </Button>
                          )}
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Descrição
                        {appliedSuggestions.has("description") && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />IA
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Descrição opcional da categoria..."
                          rows={3}
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="color"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2">
                        Cor
                        {appliedSuggestions.has("color") && (
                          <Badge variant="secondary" className="text-xs">
                            <Check className="h-3 w-3 mr-1" />IA
                          </Badge>
                        )}
                      </FormLabel>
                      <FormControl>
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-2">
                            {PRESET_COLORS.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => field.onChange(color)}
                                className={`w-7 h-7 rounded-full border-2 transition-all ${
                                  selectedColor === color
                                    ? "border-foreground scale-110"
                                    : "border-transparent hover:scale-105"
                                }`}
                                style={{ backgroundColor: color }}
                              />
                            ))}
                          </div>
                          <div className="flex items-center gap-2">
                            <Input
                              type="color"
                              {...field}
                              className="w-10 h-8 p-0.5 cursor-pointer"
                            />
                            <Input
                              value={field.value || ""}
                              onChange={field.onChange}
                              placeholder="#3B82F6"
                              className="flex-1"
                            />
                          </div>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_active"
                  render={({ field }) => (
                    <FormItem className="flex items-center justify-between rounded-lg border p-3">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Ativa</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Categorias inativas não aparecem na seleção
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>

              {/* Right Column: Image */}
              <div className="space-y-4">
                <FormField
                  control={form.control}
                  name="image_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imagem</FormLabel>
                      <FormControl>
                        <div className="space-y-3">
                          {/* Image Preview */}
                          <div className="relative aspect-square w-full max-w-[200px] mx-auto rounded-lg border bg-muted/50 overflow-hidden">
                            {(previewImage || currentImageUrl) ? (
                              <img
                                src={previewImage || currentImageUrl}
                                alt="Preview"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="flex items-center justify-center h-full text-muted-foreground">
                                <ImageIcon className="h-12 w-12" />
                              </div>
                            )}
                            {isUploadingImage && (
                              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                                <Loader2 className="h-6 w-6 animate-spin" />
                              </div>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex gap-2 justify-center">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={handleGenerateImage}
                              disabled={generateCategoryImage.isPending || !form.getValues("name")}
                            >
                              {generateCategoryImage.isPending ? (
                                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                              ) : (
                                <Wand2 className="h-4 w-4 mr-1" />
                              )}
                              Gerar IA
                            </Button>
                            <label>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleFileUpload}
                                disabled={isUploadingImage}
                              />
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <span>
                                  <Upload className="h-4 w-4 mr-1" />
                                  Carregar
                                </span>
                              </Button>
                            </label>
                          </div>

                          {/* URL input (hidden but still in form) */}
                          <Input
                            type="hidden"
                            {...field}
                          />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={createCategory.isPending || updateCategory.isPending || isUploadingImage}
              >
                {(createCategory.isPending || updateCategory.isPending) && (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                )}
                {isEditing ? "Guardar" : "Criar Categoria"}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
