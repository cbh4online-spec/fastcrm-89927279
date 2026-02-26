import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useWorkspaceInstance } from "@/contexts/WorkspaceInstanceContext";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CompanyContext {
  about_us?: string;
  services?: string;
  products?: string;
  clients?: string;
  team_info?: string;
  mission_values?: string;
  differentiators?: string;
  certifications?: string;
  target_market?: string;
  year_founded?: string;
  extracted_at?: string;
}

export interface Company {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  tax_id: string | null;
  client_number: string | null;
  website: string | null;
  industry: string | null;
  size: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  tags: string[];
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  twitter_url: string | null;
  entity_type: string | null;
  company_context: CompanyContext | null;
  payment_conditions: string | null;
  credit_limit: number | null;
  preferred_payment_method: string | null;
  credit_active: boolean | null;
  activity_profile_id: string | null;
  profile_field_values?: Record<string, unknown>;
  // Commercial history fields
  sales_2023: number | null;
  sales_2024: number | null;
  sales_2025: number | null;
  sales_2026: number | null;
  total_revenue: number | null;
  average_ticket: number | null;
  last_purchase_date: string | null;
  abc_category: string | null;
  // New Core Object fields
  legal_name: string | null;
  domain: string | null;
  description: string | null;
  categories: string[] | null;
  founded_year: number | null;
  annual_revenue_range: string | null;
  funding_amount: number | null;
  business_model: string | null;
  country: string | null;
  timezone: string | null;
  connection_strength: string | null;
  icp_fit_score: number;
  pare_score: number;
  account_value_estimate: number | null;
  estimated_ltv: number | null;
  primary_use_case: string | null;
  decision_maker_role: string | null;
  priority_level: string | null;
  ai_summary: string | null;
  ai_tags: unknown[] | null;
  ai_pain_points: Record<string, unknown> | null;
  ai_opportunities: Record<string, unknown> | null;
  ai_risk_flags: Record<string, unknown> | null;
  ai_last_enriched_at: string | null;
  custom_fields: Record<string, unknown> | null;
  associated_workspaces: string[] | null;
  updated_by: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCompanyData {
  name: string;
  tax_id?: string;
  client_number?: string;
  website?: string;
  industry?: string;
  size?: string;
  phone?: string;
  email?: string;
  address?: string;
  notes?: string;
  tags?: string[];
  linkedin_url?: string;
  facebook_url?: string;
  instagram_url?: string;
  twitter_url?: string;
  entity_type?: string;
  payment_conditions?: string;
  credit_limit?: number;
  preferred_payment_method?: string;
  credit_active?: boolean;
  activity_profile_id?: string;
  profile_field_values?: Record<string, unknown>;
}

export interface UpdateCompanyData extends Partial<CreateCompanyData> {
  id: string;
}

export function useCompanies() {
  const { currentWorkspace } = useWorkspace();
  const { workspaceClient } = useWorkspaceInstance();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const companiesQuery = useQuery({
    queryKey: ["companies", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace) return [];
      
      const { data, error } = await workspaceClient
        .from("companies")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
    enabled: !!currentWorkspace,
  });

  const createCompany = useMutation({
    mutationFn: async (data: CreateCompanyData) => {
      if (!currentWorkspace || !user) throw new Error("Not authenticated");

      const domainFromWebsite = data.website
        ? data.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/.*$/, '').toLowerCase()
        : null;

      const { data: company, error } = await workspaceClient
        .from("companies")
        .insert({
          workspace_id: currentWorkspace.id,
          created_by: user.id,
          updated_by: user.id,
          name: data.name,
          tax_id: data.tax_id || null,
          website: data.website || null,
          domain: domainFromWebsite || null,
          industry: data.industry || null,
          size: data.size || null,
          phone: data.phone || null,
          email: data.email || null,
          address: data.address || null,
          notes: data.notes || null,
          tags: data.tags || [],
          linkedin_url: data.linkedin_url || null,
          facebook_url: data.facebook_url || null,
          instagram_url: data.instagram_url || null,
          twitter_url: data.twitter_url || null,
          entity_type: data.entity_type || 'company',
        })
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          const msg = error.message || "";
          if (msg.includes("email")) throw new Error("DUPLICATE_EMAIL");
          if (msg.includes("tax_id")) throw new Error("DUPLICATE_TAX_ID");
          throw new Error("DUPLICATE_FIELD");
        }
        throw error;
      }
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa criada com sucesso");
    },
    onError: (error) => {
      console.error("Error creating company:", error);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe uma empresa com este email neste workspace.");
      } else if (error.message === "DUPLICATE_TAX_ID") {
        toast.error("Já existe uma empresa com este NIF neste workspace.");
      } else if (error.message === "DUPLICATE_FIELD") {
        toast.error("Já existe uma empresa com estes dados neste workspace.");
      } else {
        toast.error("Erro ao criar empresa");
      }
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...data }: UpdateCompanyData) => {
      // Build update object only with defined fields
      const updateData: Record<string, unknown> = { updated_by: user?.id };
      if (data.name !== undefined) updateData.name = data.name;
      if (data.tax_id !== undefined) updateData.tax_id = data.tax_id;
      if (data.website !== undefined) updateData.website = data.website;
      if (data.industry !== undefined) updateData.industry = data.industry;
      if (data.size !== undefined) updateData.size = data.size;
      if (data.phone !== undefined) updateData.phone = data.phone;
      if (data.email !== undefined) updateData.email = data.email;
      if (data.address !== undefined) updateData.address = data.address;
      if (data.notes !== undefined) updateData.notes = data.notes;
      if (data.tags !== undefined) updateData.tags = data.tags;
      if (data.linkedin_url !== undefined) updateData.linkedin_url = data.linkedin_url;
      if (data.facebook_url !== undefined) updateData.facebook_url = data.facebook_url;
      if (data.instagram_url !== undefined) updateData.instagram_url = data.instagram_url;
      if (data.twitter_url !== undefined) updateData.twitter_url = data.twitter_url;
      if (data.entity_type !== undefined) updateData.entity_type = data.entity_type;
      if (data.payment_conditions !== undefined) updateData.payment_conditions = data.payment_conditions;
      if (data.credit_limit !== undefined) updateData.credit_limit = data.credit_limit;
      if (data.preferred_payment_method !== undefined) updateData.preferred_payment_method = data.preferred_payment_method;
      if (data.credit_active !== undefined) updateData.credit_active = data.credit_active;
      // Commercial history fields
      if ((data as any).sales_2023 !== undefined) updateData.sales_2023 = (data as any).sales_2023;
      if ((data as any).sales_2024 !== undefined) updateData.sales_2024 = (data as any).sales_2024;
      if ((data as any).sales_2025 !== undefined) updateData.sales_2025 = (data as any).sales_2025;
      if ((data as any).sales_2026 !== undefined) updateData.sales_2026 = (data as any).sales_2026;
      if ((data as any).total_revenue !== undefined) updateData.total_revenue = (data as any).total_revenue;
      if ((data as any).average_ticket !== undefined) updateData.average_ticket = (data as any).average_ticket;
      if ((data as any).last_purchase_date !== undefined) updateData.last_purchase_date = (data as any).last_purchase_date;
      if ((data as any).abc_category !== undefined) updateData.abc_category = (data as any).abc_category;
      // New Core Object fields - pass through any extra fields
      const extraFields = ['legal_name','domain','description','categories','founded_year','annual_revenue_range','funding_amount','business_model','country','timezone','connection_strength','icp_fit_score','pare_score','account_value_estimate','estimated_ltv','primary_use_case','decision_maker_role','priority_level','ai_summary','ai_tags','ai_pain_points','ai_opportunities','ai_risk_flags','custom_fields','company_status'];
      for (const f of extraFields) {
        if ((data as any)[f] !== undefined) updateData[f] = (data as any)[f];
      }

      const { data: company, error } = await workspaceClient
        .from("companies")
        .update(updateData)
        .eq("id", id)
        .select()
        .single();

      if (error) {
        if (error.code === "23505") {
          const msg = error.message || "";
          if (msg.includes("email")) throw new Error("DUPLICATE_EMAIL");
          if (msg.includes("tax_id")) throw new Error("DUPLICATE_TAX_ID");
          throw new Error("DUPLICATE_FIELD");
        }
        throw error;
      }
      return company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
    },
    onError: (error) => {
      console.error("Error updating company:", error);
      if (error.message === "DUPLICATE_EMAIL") {
        toast.error("Já existe uma empresa com este email neste workspace.");
      } else if (error.message === "DUPLICATE_TAX_ID") {
        toast.error("Já existe uma empresa com este NIF neste workspace.");
      } else if (error.message === "DUPLICATE_FIELD") {
        toast.error("Já existe uma empresa com estes dados neste workspace.");
      } else {
        toast.error("Erro ao atualizar empresa");
      }
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("companies")
        .update({ deleted_at: new Date().toISOString(), updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa arquivada com sucesso");
    },
    onError: (error) => {
      console.error("Error archiving company:", error);
      toast.error("Erro ao arquivar empresa");
    },
  });

  const restoreCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await workspaceClient
        .from("companies")
        .update({ deleted_at: null, updated_by: user?.id })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies", currentWorkspace?.id] });
      toast.success("Empresa restaurada com sucesso");
    },
    onError: () => {
      toast.error("Erro ao restaurar empresa");
    },
  });

  return {
    companies: companiesQuery.data || [],
    isLoading: companiesQuery.isLoading,
    error: companiesQuery.error,
    createCompany,
    updateCompany,
    deleteCompany,
    restoreCompany,
  };
}

// Hook to fetch a single company by ID
export function useCompany(companyId: string | undefined) {
  const { workspaceClient } = useWorkspaceInstance();
  
  return useQuery({
    queryKey: ["company", companyId],
    queryFn: async () => {
      if (!companyId) return null;
      
      const { data, error } = await workspaceClient
        .from("companies")
        .select("*")
        .eq("id", companyId)
        .single();

      if (error) {
        if (error.code === "PGRST116") return null; // Not found
        throw error;
      }
      return data as Company;
    },
    enabled: !!companyId,
  });
}
