import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import type { Product, CreateProductInput, UpdateProductInput } from "@/types/product";
import { DEFAULT_SALES_PLAYBOOK } from "@/components/products/salesPlaybookTemplate";

// Helper function to ensure category exists in product_categories table
async function ensureCategoryExists(categoryName: string | undefined, workspaceId: string): Promise<void> {
  if (!categoryName || !categoryName.trim()) return;

  const trimmedName = categoryName.trim();

  // Check if category already exists
  const { data: existingCategory } = await supabase
    .from("product_categories")
    .select("id")
    .eq("workspace_id", workspaceId)
    .eq("name", trimmedName)
    .maybeSingle();

  // If category doesn't exist, create it
  if (!existingCategory) {
    const { error } = await supabase
      .from("product_categories")
      .insert({
        name: trimmedName,
        workspace_id: workspaceId,
        is_active: true,
      });

    if (error && !error.message.includes("duplicate")) {
      console.warn("Failed to create category:", error);
    }
  }
}

export function useProducts(filters?: {
  status?: string;
  productType?: string;
  category?: string;
  search?: string;
  billingType?: string;
  storePublished?: boolean;
  sortBy?: string;
  sortDirection?: "asc" | "desc";
}) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["products", currentWorkspace?.id, filters],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      let query = supabase
        .from("products")
        .select("*, product_images(url)")
        .eq("workspace_id", currentWorkspace.id);

      // --- Server-side sorting ---
      const sortCol = filters?.sortBy || "updated_at";
      const sortAsc = filters?.sortDirection === "asc";
      if (sortCol === "name") {
        query = query.order("name", { ascending: sortAsc });
      } else if (sortCol === "base_price") {
        query = query.order("base_price", { ascending: sortAsc });
      } else {
        query = query.order("updated_at", { ascending: sortAsc });
      }

      // --- Server-side filters ---
      if (filters?.status && filters.status !== "all") {
        query = query.eq("status", filters.status);
      }

      if (filters?.productType && filters.productType !== "all") {
        query = query.eq("product_type", filters.productType);
      }

      if (filters?.category && filters.category !== "all") {
        query = query.eq("category", filters.category);
      }

      if (filters?.billingType && filters.billingType !== "all") {
        query = query.eq("billing_type", filters.billingType);
      }

      if (filters?.storePublished !== undefined) {
        query = (query as any).eq("store_published", filters.storePublished);
      }

      if (filters?.search) {
        query = query.or(`name.ilike.%${filters.search}%,category.ilike.%${filters.search}%,sku.ilike.%${filters.search}%`);
      }

      const { data, error } = await query.limit(5000);

      if (error) throw error;
      const products = (data ?? []) as Product[];

      // Hydrate `images` from the inline join first (saves a round-trip when
      // the relation already came back).
      for (const product of products) {
        const inline = (product as any).product_images as Array<{ url: string }> | undefined;
        if ((!product.images || product.images.length === 0) && Array.isArray(inline) && inline.length > 0) {
          product.images = inline.map((i) => i.url).filter(Boolean);
        }
      }

      // Fallback: explicit fetch ordered by position for products still missing
      // images (e.g. when the embedded join was skipped or filtered by RLS).
      const missingIds = products.filter((p) => !p.images || p.images.length === 0).map((p) => p.id);
      if (missingIds.length > 0) {
        const { data: imgData, error: imgErr } = await supabase
          .from("product_images")
          .select("product_id, url, position")
          .in("product_id", missingIds)
          .order("position", { ascending: true });

        if (imgErr) {
          console.warn("[useProducts] product_images fetch failed", imgErr);
        } else if (imgData && imgData.length > 0) {
          const byProduct = new Map<string, string[]>();
          for (const img of imgData) {
            const arr = byProduct.get(img.product_id) ?? [];
            arr.push(img.url);
            byProduct.set(img.product_id, arr);
          }
          for (const product of products) {
            const urls = byProduct.get(product.id);
            if (urls && urls.length > 0 && (!product.images || product.images.length === 0)) {
              product.images = urls;
            }
          }
        }
      }

      return products;
    },
    enabled: !!currentWorkspace?.id,
  });
}

export function useProduct(id: string | undefined) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product", id, currentWorkspace?.id],
    queryFn: async () => {
      if (!id || !currentWorkspace?.id) return null;

      const { data, error } = await supabase
        .from("products")
        .select("*, product_images(url, position, is_cover, created_at)")
        .eq("id", id)
        .eq("workspace_id", currentWorkspace.id)
        .single();

      if (error) throw error;
      const product = data as Product & {
        product_images?: Array<{ url: string; position: number | null; is_cover?: boolean | null; created_at?: string | null }>;
      };
      if ((!product.images || product.images.length === 0) && Array.isArray(product.product_images)) {
        product.images = product.product_images
          .slice()
          .sort((a, b) => {
            // 1. capa primeiro
            if ((b.is_cover ? 1 : 0) !== (a.is_cover ? 1 : 0)) return (b.is_cover ? 1 : 0) - (a.is_cover ? 1 : 0);
            // 2. position
            const pa = a.position ?? Number.MAX_SAFE_INTEGER;
            const pb = b.position ?? Number.MAX_SAFE_INTEGER;
            if (pa !== pb) return pa - pb;
            // 3. created_at
            return (a.created_at ?? "").localeCompare(b.created_at ?? "");
          })
          .map((image) => image.url)
          .filter(Boolean);
      }
      return product as Product;
    },
    enabled: !!id && !!currentWorkspace?.id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateProductInput) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      // Check for duplicate SKU
      if (input.sku?.trim()) {
        const { data: skuDup } = await supabase
          .from("products")
          .select("id, name")
          .eq("workspace_id", currentWorkspace.id)
          .ilike("sku", input.sku.trim())
          .limit(1);
        if (skuDup && skuDup.length > 0) {
          throw new Error(`Já existe um produto com o SKU "${input.sku.trim()}": "${skuDup[0].name}"`);
        }
      }

      // Check for duplicate name
      if (input.name?.trim()) {
        const { data: nameDup } = await supabase
          .from("products")
          .select("id, name")
          .eq("workspace_id", currentWorkspace.id)
          .ilike("name", input.name.trim())
          .limit(1);
        if (nameDup && nameDup.length > 0) {
          throw new Error(`Já existe um produto com o nome "${input.name.trim()}"`);
        }
      }

      // Ensure category exists in product_categories table
      await ensureCategoryExists(input.category, currentWorkspace.id);

      const inputAny = input as any;
      const hasUserPlaybook =
        inputAny.sales_playbook &&
        typeof inputAny.sales_playbook === "object" &&
        Object.keys(inputAny.sales_playbook).length > 0;

      const { data, error } = await supabase
        .from("products")
        .insert({
          ...input,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          // Seed every new product with the standard playbook so the team has a
          // ready-to-edit baseline. User-provided playbook always wins.
          sales_playbook: hasUserPlaybook ? inputAny.sales_playbook : DEFAULT_SALES_PLAYBOOK,
        } as any)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Produto criado com sucesso!");
      console.log(`[PRODUCTS] Created: ${data.id}`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'PRODUCT.CREATED',
          entity_kind: 'product',
          entity_id: data.id,
          source_module: 'sales-products',
          payload: {
            has_sku: !!data.sku,
            has_price: (data.base_price ?? 0) > 0,
            category: data.category,
            product_type: data.product_type,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[PRODUCTS] CREATE_FAILED', error.message);
      toast.error("Erro ao criar produto: " + error.message);
    },
  });
}

/**
 * Duplicate an existing product as a fresh draft. Keeps every editable field
 * (price, cost, category, descriptions, playbook, etc.) and only mutates the
 * fields that must be unique (id, name, sku) plus timestamps and stock-derived
 * counters. The clone is created as a `draft` so the user can review before
 * publishing.
 */
export function useDuplicateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (productId: string) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      const { data: source, error: fetchErr } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("workspace_id", currentWorkspace.id)
        .single();
      if (fetchErr) throw fetchErr;
      if (!source) throw new Error("Produto original não encontrado");

      // Find an available "(cópia)" name
      const baseName = (source as any).name as string;
      let candidateName = `${baseName} (cópia)`;
      let suffix = 2;
      while (true) {
        const { data: dup } = await supabase
          .from("products")
          .select("id")
          .eq("workspace_id", currentWorkspace.id)
          .ilike("name", candidateName)
          .limit(1);
        if (!dup || dup.length === 0) break;
        candidateName = `${baseName} (cópia ${suffix})`;
        suffix += 1;
        if (suffix > 50) throw new Error("Não foi possível gerar nome único");
      }

      // Find an available SKU (only if the source has one)
      const baseSku = ((source as any).sku as string | null)?.trim() || null;
      let candidateSku: string | null = null;
      if (baseSku) {
        candidateSku = `${baseSku}-COPY`;
        let s = 2;
        while (true) {
          const { data: dup } = await supabase
            .from("products")
            .select("id")
            .eq("workspace_id", currentWorkspace.id)
            .ilike("sku", candidateSku)
            .limit(1);
          if (!dup || dup.length === 0) break;
          candidateSku = `${baseSku}-COPY-${s}`;
          s += 1;
          if (s > 50) {
            candidateSku = `${baseSku}-COPY-${Date.now().toString(36)}`;
            break;
          }
        }
      }

      // Strip fields that must not be cloned verbatim
      const {
        id: _id,
        created_at: _ca,
        updated_at: _ua,
        created_by: _cb,
        slug: _slug,
        ...rest
      } = source as any;

      const insertPayload: Record<string, any> = {
        ...rest,
        workspace_id: currentWorkspace.id,
        created_by: user.id,
        name: candidateName,
        sku: candidateSku,
        // Clone como "archived" para o utilizador rever antes de publicar
        // (a tabela só aceita 'active' ou 'archived').
        status: "archived",
      };

      const { data, error } = await supabase
        .from("products")
        .insert(insertPayload as any)
        .select()
        .single();
      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`Produto duplicado: "${(data as any).name}"`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: "PRODUCT.CREATED",
          entity_kind: "product",
          entity_id: data.id,
          source_module: "sales-products",
          payload: { duplicated_from: (data as any).id, status: "draft" },
        });
      }
    },
    onError: (error: any) => {
      console.warn("[PRODUCTS] DUPLICATE_FAILED", error?.message);
      toast.error("Erro ao duplicar produto: " + (error?.message ?? "desconhecido"));
    },
  });
}



export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ id, ...input }: UpdateProductInput) => {
      // Ensure category exists if being updated
      if (input.category && currentWorkspace?.id) {
        await ensureCategoryExists(input.category, currentWorkspace.id);
      }

      const updateData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      // Only include fields that are explicitly provided
      if (input.name !== undefined) updateData.name = input.name;
      if (input.product_type !== undefined) updateData.product_type = input.product_type;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.base_price !== undefined) updateData.base_price = input.base_price;
      if (input.currency !== undefined) updateData.currency = input.currency;
      if (input.billing_type !== undefined) updateData.billing_type = input.billing_type;
      if (input.short_description !== undefined) updateData.short_description = input.short_description;
      if (input.sku !== undefined) updateData.sku = input.sku;
      if (input.direct_cost !== undefined) updateData.direct_cost = input.direct_cost;
      if (input.direct_cost_mode !== undefined) updateData.direct_cost_mode = input.direct_cost_mode;
      if (input.operational_cost !== undefined) updateData.operational_cost = input.operational_cost;
      if (input.operational_cost_mode !== undefined) updateData.operational_cost_mode = input.operational_cost_mode;
      if (input.operational_cost_base !== undefined) updateData.operational_cost_base = input.operational_cost_base;
      if (input.commission_default !== undefined) updateData.commission_default = input.commission_default;
      if (input.commission_mode !== undefined) updateData.commission_mode = input.commission_mode;
      if (input.commission_base !== undefined) updateData.commission_base = input.commission_base;
      if (input.tax_rate_estimate_pct !== undefined) updateData.tax_rate_estimate_pct = input.tax_rate_estimate_pct;
      if (input.tax_included !== undefined) updateData.tax_included = input.tax_included;
      if (input.tax_rate_mode !== undefined) updateData.tax_rate_mode = input.tax_rate_mode;
      if (input.target_margin_pct !== undefined) updateData.target_margin_pct = input.target_margin_pct;
      if (input.target_margin_mode !== undefined) updateData.target_margin_mode = input.target_margin_mode;
      if (input.images !== undefined) updateData.images = input.images;
      if (input.bundle_price_mode !== undefined) updateData.bundle_price_mode = input.bundle_price_mode;
      if (input.total_units !== undefined) updateData.total_units = input.total_units;
      if (input.unit_name !== undefined) updateData.unit_name = input.unit_name;
      if (input.setup_fee !== undefined) updateData.setup_fee = input.setup_fee;
      if (input.recurring_fee !== undefined) updateData.recurring_fee = input.recurring_fee;
      // Consumption model fields
      if (input.consumption_model !== undefined) updateData.consumption_model = input.consumption_model;
      if (input.included_quantity !== undefined) updateData.included_quantity = input.included_quantity;
      if (input.recommended_frequency !== undefined) updateData.recommended_frequency = input.recommended_frequency;
      if (input.typical_duration_days !== undefined) updateData.typical_duration_days = input.typical_duration_days;
      if (input.is_trackable !== undefined) updateData.is_trackable = input.is_trackable;
      // Technical specifications
      if (input.specifications !== undefined) updateData.specifications = input.specifications;
      // Demo video
      if (input.demo_video_url !== undefined) updateData.demo_video_url = input.demo_video_url;
      // Labor fields
      if (input.labor_hours !== undefined) updateData.labor_hours = input.labor_hours;
      if (input.labor_hourly_rate !== undefined) updateData.labor_hourly_rate = input.labor_hourly_rate;
      if (input.labor_included_in_price !== undefined) updateData.labor_included_in_price = input.labor_included_in_price;
      if (input.labor_notes !== undefined) updateData.labor_notes = input.labor_notes;
      // B2B Portal visibility
      if (input.b2b_published !== undefined) updateData.b2b_published = input.b2b_published;
      // Barcode
      if (input.barcode !== undefined) updateData.barcode = input.barcode;
      // Sheet / storefront publishing
      if (input.sheet_published !== undefined) updateData.sheet_published = input.sheet_published;
      if (input.sheet_slug !== undefined) updateData.sheet_slug = input.sheet_slug;
      if (input.store_published !== undefined) updateData.store_published = input.store_published;
      if (input.commercial_description !== undefined) updateData.commercial_description = input.commercial_description;
      if (input.benefits !== undefined) updateData.benefits = input.benefits;
      if (input.conditions !== undefined) updateData.conditions = input.conditions;
      // Physical attributes (frascos líquidos, peso, dimensões, embalagem)
      if (input.weight_net !== undefined) updateData.weight_net = input.weight_net;
      if (input.weight_gross !== undefined) updateData.weight_gross = input.weight_gross;
      if (input.volume_value !== undefined) updateData.volume_value = input.volume_value;
      if (input.volume_unit !== undefined) updateData.volume_unit = input.volume_unit;
      if (input.length_cm !== undefined) updateData.length_cm = input.length_cm;
      if (input.width_cm !== undefined) updateData.width_cm = input.width_cm;
      if (input.height_cm !== undefined) updateData.height_cm = input.height_cm;
      if (input.package_type !== undefined) updateData.package_type = input.package_type;

      const { data, error } = await supabase
        .from("products")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      toast.success("Produto atualizado com sucesso!");
      console.log(`[PRODUCTS] Updated: ${data.id}`);
      if (variables.base_price !== undefined && currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'PRODUCT.PRICE_UPDATED',
          entity_kind: 'product',
          entity_id: data.id,
          source_module: 'sales-products',
          payload: {
            product_id: data.id,
            new_price: data.base_price,
            currency: data.currency,
          },
        });
      }
    },
    onError: (error) => {
      console.warn('[PRODUCTS] UPDATE_FAILED', error.message);
      toast.error("Erro ao atualizar produto: " + error.message);
    },
  });
}

export function useArchiveProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, archive }: { id: string; archive: boolean }) => {
      const { data, error } = await supabase
        .from("products")
        .update({
          status: archive ? "archived" : "active",
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data as Product;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      console.log(`[PRODUCTS] ${data.status === 'archived' ? 'Archived' : 'Reactivated'}: ${data.id}`);
      toast.success(
        data.status === "archived"
          ? "Produto arquivado com sucesso!"
          : "Produto reativado com sucesso!"
      );
    },
    onError: (error) => {
      console.warn('[PRODUCTS] ARCHIVE_FAILED', error.message);
      toast.error("Erro ao arquivar produto: " + error.message);
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
      return id;
    },
    onSuccess: (id) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", id] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      console.log(`[PRODUCTS] Deleted: ${id}`);
      toast.success("Produto eliminado com sucesso!");
    },
    onError: (error) => {
      console.warn('[PRODUCTS] DELETE_FAILED', error.message);
      toast.error("Erro ao eliminar produto: " + error.message);
    },
  });
}

// Batch insert: creates many products in a single DB call
export function useCreateProductsBatch() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();

  const isUniqueViolation = (error: { code?: string; message?: string } | null) =>
    error?.code === "23505" || error?.message?.toLowerCase().includes("duplicate key") === true;

  const getDuplicateReason = (
    error: { message?: string } | null,
    row: { sku?: string | null; barcode?: string | null }
  ) => {
    const msg = error?.message?.toLowerCase() ?? "";
    if (msg.includes("barcode")) {
      return `Código de barras duplicado${row.barcode ? ` (${row.barcode})` : ""}`;
    }
    if (msg.includes("products_workspace_sku_unique_idx")) {
      return `SKU duplicado${row.sku ? ` (${row.sku})` : ""}`;
    }
    return "Registo duplicado";
  };

  return useMutation({
    mutationFn: async (items: CreateProductInput[]) => {
      if (!currentWorkspace?.id || !user?.id) {
        throw new Error("Workspace ou utilizador não encontrado");
      }

      const workspaceId = currentWorkspace.id;

      // 1. Collect all SKUs and check existing ones in ONE query
      const skus = items.map(i => i.sku?.trim()).filter(Boolean) as string[];
      // Map lowercase SKU → existing product id
      const existingSkuMap = new Map<string, string>();
      if (skus.length > 0) {
        for (let i = 0; i < skus.length; i += 200) {
          const batch = skus.slice(i, i + 200);
          const { data } = await supabase
            .from("products")
            .select("id, sku")
            .eq("workspace_id", workspaceId)
            .in("sku", batch);
          if (data) {
            for (const d of data) {
              if (d.sku) existingSkuMap.set(d.sku.toLowerCase(), d.id);
            }
          }
        }
      }

      // 2. Collect unique categories and ensure they exist (batch)
      const uniqueCategories = [...new Set(
        items.map(i => i.category?.trim()).filter(Boolean) as string[]
      )];
      for (const cat of uniqueCategories) {
        await ensureCategoryExists(cat, workspaceId);
      }

      // 3. Separate items into toInsert, toUpdate, skipped
      const toInsert: Record<string, any>[] = [];
      const toUpdate: { id: string; data: Record<string, any> }[] = [];
      const skipped: { sku: string; reason: string }[] = [];
      const seenSkus = new Set<string>();
      const imageUrlsBySku = new Map<string, string[]>();

      for (const item of items) {
        const sku = item.sku?.trim();
        if (sku) {
          const lower = sku.toLowerCase();
          if (seenSkus.has(lower)) {
            skipped.push({ sku, reason: "SKU duplicado no lote" });
            continue;
          }
          seenSkus.add(lower);
        }

        // Extract image URLs
        const imageUrl = item.image_url;
        const imageUrls = item.image_urls;
        const allImages = new Set<string>();
        if (imageUrls) imageUrls.forEach(u => { if (u?.trim()) allImages.add(u.trim()); });
        if (imageUrl?.trim() && !allImages.has(imageUrl.trim())) allImages.add(imageUrl.trim());
        
        if (allImages.size > 0 && sku) {
          imageUrlsBySku.set(sku.toLowerCase(), [...allImages]);
        }

        const { image_url: _imgUrl, image_urls: _imgUrls, ...itemWithoutImage } = item;

        if (sku && existingSkuMap.has(sku.toLowerCase())) {
          // Existing product → update
          const existingId = existingSkuMap.get(sku.toLowerCase())!;
          const { sku: _sku, ...updateData } = itemWithoutImage;
          toUpdate.push({ id: existingId, data: updateData });
        } else {
          // New product → insert
          toInsert.push({
            ...itemWithoutImage,
            sku,
            workspace_id: workspaceId,
            created_by: user.id,
          });
        }
      }

      // 4. Update existing products in batches
      let updated = 0;
      const updatedProductIds: string[] = [];
      for (const item of toUpdate) {
        const { error } = await supabase
          .from("products")
          .update(item.data as any)
          .eq("id", item.id)
          .eq("workspace_id", workspaceId);
        if (error) {
          console.warn(`[PRODUCTS] Failed to update product ${item.id}:`, error.message);
          skipped.push({ sku: item.data.name ?? item.id, reason: `Erro ao atualizar: ${error.message}` });
        } else {
          updated += 1;
          updatedProductIds.push(item.id);
        }
      }

      // 5. Insert new products in batches of 500
      let created = 0;
      const createdSkus: string[] = [];
      for (let i = 0; i < toInsert.length; i += 500) {
        const batch = toInsert.slice(i, i + 500);
        const { error } = await supabase
          .from("products")
          .insert(batch as any);

        if (!error) {
          created += batch.length;
          for (const row of batch) {
            if (row.sku) createdSkus.push(row.sku);
          }
          continue;
        }

        if (!isUniqueViolation(error)) {
          throw error;
        }

        for (const row of batch) {
          const { error: rowError } = await supabase
            .from("products")
            .insert(row as any);

          if (!rowError) {
            created += 1;
            if (row.sku) createdSkus.push(row.sku);
            continue;
          }

          if (isUniqueViolation(rowError)) {
            skipped.push({
              sku: row.sku ?? row.name ?? "(sem SKU)",
              reason: getDuplicateReason(rowError, {
                sku: row.sku ?? null,
                barcode: row.barcode ?? null,
              }),
            });
            continue;
          }

          throw rowError;
        }
      }

      // 6. Create product_images for NEW items that had image URLs
      const skusWithImages = createdSkus.filter(s => imageUrlsBySku.has(s.toLowerCase()));
      if (skusWithImages.length > 0) {
        try {
          const productImageInserts: { workspace_id: string; product_id: string; url: string; position: number }[] = [];
          for (let i = 0; i < skusWithImages.length; i += 200) {
            const batch = skusWithImages.slice(i, i + 200);
            const { data: products } = await supabase
              .from("products")
              .select("id, sku")
              .eq("workspace_id", workspaceId)
              .in("sku", batch);
            if (products) {
              for (const p of products) {
                const imgUrls = p.sku ? imageUrlsBySku.get(p.sku.toLowerCase()) : null;
                if (imgUrls) {
                  imgUrls.forEach((url, idx) => {
                    productImageInserts.push({
                      workspace_id: workspaceId,
                      product_id: p.id,
                      url,
                      position: idx,
                    });
                  });
                }
              }
            }
          }
          if (productImageInserts.length > 0) {
            await supabase.from("product_images").insert(productImageInserts);
            console.log(`[PRODUCTS] Created ${productImageInserts.length} product images from CSV`);
          }
        } catch (imgErr) {
          console.warn("[PRODUCTS] Failed to create product images, products were still created:", imgErr);
        }
      }

      // 7. Add images for UPDATED products (only new URLs, avoid duplicates)
      const updatedSkusWithImages = toUpdate
        .filter(u => {
          const sku = items.find(i => existingSkuMap.get(i.sku?.trim()?.toLowerCase() ?? '') === u.id)?.sku?.trim();
          return sku && imageUrlsBySku.has(sku.toLowerCase());
        });
      if (updatedSkusWithImages.length > 0) {
        try {
          const ids = updatedSkusWithImages.map(u => u.id);
          // Get existing images for these products
          const { data: existingImages } = await supabase
            .from("product_images")
            .select("product_id, url")
            .in("product_id", ids);
          const existingUrlSet = new Set(
            (existingImages ?? []).map(img => `${img.product_id}::${img.url}`)
          );
          const newImageInserts: { workspace_id: string; product_id: string; url: string; position: number }[] = [];
          for (const u of updatedSkusWithImages) {
            const item = items.find(i => existingSkuMap.get(i.sku?.trim()?.toLowerCase() ?? '') === u.id);
            const sku = item?.sku?.trim();
            if (!sku) continue;
            const imgUrls = imageUrlsBySku.get(sku.toLowerCase());
            if (!imgUrls) continue;
            const existingCount = (existingImages ?? []).filter(img => img.product_id === u.id).length;
            let pos = existingCount;
            for (const url of imgUrls) {
              if (!existingUrlSet.has(`${u.id}::${url}`)) {
                newImageInserts.push({ workspace_id: workspaceId, product_id: u.id, url, position: pos++ });
              }
            }
          }
          if (newImageInserts.length > 0) {
            await supabase.from("product_images").insert(newImageInserts);
            console.log(`[PRODUCTS] Added ${newImageInserts.length} new images to updated products`);
          }
        } catch (imgErr) {
          console.warn("[PRODUCTS] Failed to add images to updated products:", imgErr);
        }
      }

      return { created, updated, skipped };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product-categories"] });
      const parts: string[] = [];
      if (result.created > 0) parts.push(`${result.created} criado(s)`);
      if (result.updated > 0) parts.push(`${result.updated} atualizado(s)`);
      if (result.skipped.length > 0) parts.push(`${result.skipped.length} ignorado(s)`);
      const msg = parts.length > 0 ? parts.join(", ") : "Importação concluída";
      toast.success(msg);
      console.log(`[PRODUCTS] Batch import: ${result.created} created, ${result.updated} updated, ${result.skipped.length} skipped`);
      if (currentWorkspace?.id) {
        emitKernelEvent({
          workspace_id: currentWorkspace.id,
          type: 'PRODUCT.BATCH_CREATED',
          entity_kind: 'product',
          entity_id: 'batch',
          source_module: 'sales-products',
          payload: { created: result.created, updated: result.updated, skipped: result.skipped.length },
        });
      }
    },
    onError: (error) => {
      console.warn('[PRODUCTS] BATCH_CREATE_FAILED', error.message);
      toast.error("Erro ao criar produtos em lote: " + error.message);
    },
  });
}

export function useProductCategories() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["product-category-names", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      const { data, error } = await supabase
        .from("products")
        .select("category")
        .eq("workspace_id", currentWorkspace.id)
        .not("category", "is", null);

      if (error) throw error;

      const categories = [...new Set(data.map((p) => p.category).filter(Boolean))] as string[];
      return categories.sort();
    },
    enabled: !!currentWorkspace?.id,
  });
}

// Hook to delete products in batch
export function useDeleteProductsBatch() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (!currentWorkspace?.id || ids.length === 0) return { deleted: 0 };

      const { error } = await supabase
        .from("products")
        .delete()
        .in("id", ids)
        .eq("workspace_id", currentWorkspace.id);

      if (error) throw error;
      return { deleted: ids.length };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success(`${data.deleted} produto${data.deleted !== 1 ? "s" : ""} apagado${data.deleted !== 1 ? "s" : ""}`);
    },
    onError: (error: any) => {
      toast.error("Erro ao apagar produtos: " + error.message);
    },
  });
}
