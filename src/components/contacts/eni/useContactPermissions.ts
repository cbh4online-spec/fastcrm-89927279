import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWorkspace } from "@/contexts/WorkspaceContext";

export type WorkspaceRole = "owner" | "admin" | "agent" | "viewer" | "agency";

// Permission sections for ENI Contact
export type ContactSection = 
  | "identification"
  | "address"
  | "professional"
  | "commercial"
  | "financial"
  | "products"
  | "documents"
  | "history"
  | "notes"
  | "ai_insights";

export type PermissionAction = "view" | "edit";

interface ContactPermissions {
  canView: (section: ContactSection) => boolean;
  canEdit: (section: ContactSection) => boolean;
  role: WorkspaceRole | null;
  isLoading: boolean;
}

// Role-based permissions matrix
const PERMISSION_MATRIX: Record<WorkspaceRole, Record<ContactSection, { view: boolean; edit: boolean }>> = {
  owner: {
    identification: { view: true, edit: true },
    address: { view: true, edit: true },
    professional: { view: true, edit: true },
    commercial: { view: true, edit: true },
    financial: { view: true, edit: true },
    products: { view: true, edit: true },
    documents: { view: true, edit: true },
    history: { view: true, edit: false }, // Read-only (auto-calculated)
    notes: { view: true, edit: true },
    ai_insights: { view: true, edit: false },
  },
  admin: {
    identification: { view: true, edit: true },
    address: { view: true, edit: true },
    professional: { view: true, edit: true },
    commercial: { view: true, edit: true },
    financial: { view: true, edit: true },
    products: { view: true, edit: true },
    documents: { view: true, edit: true },
    history: { view: true, edit: false },
    notes: { view: true, edit: true },
    ai_insights: { view: true, edit: false },
  },
  agency: {
    identification: { view: true, edit: true },
    address: { view: true, edit: true },
    professional: { view: true, edit: true },
    commercial: { view: true, edit: true },
    financial: { view: true, edit: true },
    products: { view: true, edit: true },
    documents: { view: true, edit: true },
    history: { view: true, edit: false },
    notes: { view: true, edit: true },
    ai_insights: { view: true, edit: false },
  },
  agent: {
    // Vendas: editar perfil comercial, produtos, notas
    identification: { view: true, edit: false },
    address: { view: true, edit: false },
    professional: { view: true, edit: false },
    commercial: { view: true, edit: true }, // Can edit
    financial: { view: false, edit: false }, // No access
    products: { view: true, edit: true }, // Can edit
    documents: { view: true, edit: true },
    history: { view: true, edit: false },
    notes: { view: true, edit: true }, // Can edit
    ai_insights: { view: true, edit: false },
  },
  viewer: {
    // Suporte: ver dados e notas
    identification: { view: true, edit: false },
    address: { view: true, edit: false },
    professional: { view: true, edit: false },
    commercial: { view: true, edit: false },
    financial: { view: false, edit: false }, // No access
    products: { view: true, edit: false },
    documents: { view: true, edit: false },
    history: { view: true, edit: false },
    notes: { view: true, edit: false },
    ai_insights: { view: true, edit: false },
  },
};

export function useContactPermissions(): ContactPermissions {
  const { user } = useAuth();
  const { currentWorkspace } = useWorkspace();

  const { data: membership, isLoading } = useQuery({
    queryKey: ["workspace-membership", currentWorkspace?.id, user?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id || !user?.id) return null;

      const { data, error } = await supabase
        .from("workspace_members")
        .select("role")
        .eq("workspace_id", currentWorkspace.id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) {
        console.error("Error fetching workspace membership:", error);
        return null;
      }

      return data;
    },
    enabled: !!currentWorkspace?.id && !!user?.id,
  });

  const role = (membership?.role as WorkspaceRole) || null;

  const canView = (section: ContactSection): boolean => {
    if (!role) return false;
    return PERMISSION_MATRIX[role]?.[section]?.view ?? false;
  };

  const canEdit = (section: ContactSection): boolean => {
    if (!role) return false;
    return PERMISSION_MATRIX[role]?.[section]?.edit ?? false;
  };

  return {
    canView,
    canEdit,
    role,
    isLoading,
  };
}

// Helper hook for checking if user is financial role (admin/owner with financial access)
export function useIsFinancialRole(): boolean {
  const { canEdit } = useContactPermissions();
  return canEdit("financial");
}

// Helper to get permission summary for UI
export function useContactPermissionsSummary() {
  const { role, canView, canEdit, isLoading } = useContactPermissions();

  const sections: ContactSection[] = [
    "identification",
    "address", 
    "professional",
    "commercial",
    "financial",
    "products",
    "documents",
    "history",
    "notes",
    "ai_insights",
  ];

  const summary = sections.map((section) => ({
    section,
    canView: canView(section),
    canEdit: canEdit(section),
  }));

  return {
    role,
    summary,
    isLoading,
  };
}
