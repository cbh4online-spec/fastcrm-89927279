import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { emitKernelEvent } from "@/lib/kernelEmitter";
import { toast } from "sonner";

interface WorkspaceBranding {
  logo_url?: string | null;
  primary_color?: string;
  secondary_color?: string;
}

interface WorkspaceInfo {
  name: string;
  slug: string;
}

export function useWorkspaceSettings() {
  const { currentWorkspace, refreshWorkspaces } = useWorkspace();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const updateWorkspaceInfo = async (info: WorkspaceInfo) => {
    if (!currentWorkspace) {
      toast.error("Nenhum workspace selecionado");
      return false;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          name: info.name,
          slug: info.slug,
        })
        .eq("id", currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      console.log(`[WS-SETTINGS] WORKSPACE_UPDATED workspace=${currentWorkspace.id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'SETTINGS.WORKSPACE_UPDATED',
        entity_kind: 'workspace',
        entity_id: currentWorkspace.id,
        source_module: 'admin-settings',
        payload: { changed_fields: ['name', 'slug'] },
      });
      toast.success("Informação do workspace actualizada");
      return true;
    } catch (error) {
      console.warn('[WS-SETTINGS] WORKSPACE_UPDATE_FAILED', (error as Error).message);
      toast.error("Erro ao actualizar informação do workspace");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const uploadLogo = async (file: File): Promise<string | null> => {
    if (!currentWorkspace) {
      toast.error("Nenhum workspace selecionado");
      return null;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("O ficheiro é demasiado grande. Máximo 2MB.");
      return null;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/svg+xml", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Formato não suportado. Use PNG, JPG, SVG ou WebP.");
      return null;
    }

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "png";
      const filePath = `${currentWorkspace.id}/logo.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { 
          upsert: true,
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;

      console.log(`[WS-SETTINGS] LOGO_UPLOADED workspace=${currentWorkspace.id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'SETTINGS.LOGO_UPLOADED',
        entity_kind: 'workspace',
        entity_id: currentWorkspace.id,
        source_module: 'admin-settings',
        payload: { file_type: file.type, file_size: file.size },
      });
      toast.success("Logótipo carregado com sucesso");
      return logoUrl;
    } catch (error) {
      console.warn('[WS-SETTINGS] LOGO_UPLOAD_FAILED', (error as Error).message);
      toast.error("Erro ao carregar logótipo");
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  const updateBranding = async (branding: WorkspaceBranding) => {
    if (!currentWorkspace) {
      toast.error("Nenhum workspace selecionado");
      return false;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("workspaces")
        .update({
          logo_url: branding.logo_url,
          primary_color: branding.primary_color,
          secondary_color: branding.secondary_color,
        })
        .eq("id", currentWorkspace.id);

      if (error) throw error;

      await refreshWorkspaces();
      console.log(`[WS-SETTINGS] BRANDING_UPDATED workspace=${currentWorkspace.id}`);
      emitKernelEvent({
        workspace_id: currentWorkspace.id,
        type: 'SETTINGS.BRANDING_UPDATED',
        entity_kind: 'workspace',
        entity_id: currentWorkspace.id,
        source_module: 'admin-settings',
        payload: { changed_fields: Object.keys(branding) },
      });
      toast.success("Aparência actualizada com sucesso");
      return true;
    } catch (error) {
      console.warn('[WS-SETTINGS] BRANDING_UPDATE_FAILED', (error as Error).message);
      toast.error("Erro ao actualizar aparência");
      return false;
    } finally {
      setIsUpdating(false);
    }
  };

  const fetchWorkspaceDetails = async () => {
    if (!currentWorkspace) return null;

    try {
      const { data, error } = await supabase
        .from("workspaces")
        .select("name, slug, logo_url, primary_color, secondary_color")
        .eq("id", currentWorkspace.id)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error("Error fetching workspace details:", error);
      return null;
    }
  };

  return {
    updateWorkspaceInfo,
    uploadLogo,
    updateBranding,
    fetchWorkspaceDetails,
    isUpdating,
    isUploading,
  };
}
