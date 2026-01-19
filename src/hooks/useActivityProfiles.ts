import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { 
  ActivityProfile, 
  ActivityProfileType, 
  ProfileCustomField,
  ProfileAutomation,
  ProfileKPI,
  AIContext,
  PROFILE_SPECIFIC_FIELDS 
} from "@/types/activityProfile";
import { Json } from "@/integrations/supabase/types";

// Helper to safely parse JSONB fields
function parseActivityProfile(data: any): ActivityProfile {
  return {
    id: data.id,
    workspace_id: data.workspace_id,
    code: data.code,
    name: data.name,
    description: data.description,
    profile_type: data.profile_type as ActivityProfileType,
    icon: data.icon || 'Briefcase',
    color: data.color || '#6366f1',
    is_system: data.is_system ?? false,
    is_active: data.is_active ?? true,
    visible_fields: (data.visible_fields as Record<string, string[]>) || {},
    hidden_fields: (data.hidden_fields as Record<string, string[]>) || {},
    active_modules: Array.isArray(data.active_modules) ? data.active_modules : [],
    module_settings: (data.module_settings as Record<string, unknown>) || {},
    custom_fields_config: Array.isArray(data.custom_fields_config) 
      ? data.custom_fields_config as ProfileCustomField[]
      : [],
    automation_triggers: Array.isArray(data.automation_triggers)
      ? data.automation_triggers as ProfileAutomation[]
      : [],
    kpi_config: Array.isArray(data.kpi_config)
      ? data.kpi_config as ProfileKPI[]
      : [],
    ai_context: (data.ai_context as AIContext) || { terminology: {}, focus_areas: [] },
    ai_suggestions_enabled: data.ai_suggestions_enabled ?? true,
    created_at: data.created_at,
    updated_at: data.updated_at,
    created_by: data.created_by,
  };
}

// Helper to convert ActivityProfile to DB format
function toDbFormat(profile: Partial<ActivityProfile>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  
  if (profile.code !== undefined) result.code = profile.code;
  if (profile.name !== undefined) result.name = profile.name;
  if (profile.description !== undefined) result.description = profile.description;
  if (profile.profile_type !== undefined) result.profile_type = profile.profile_type;
  if (profile.icon !== undefined) result.icon = profile.icon;
  if (profile.color !== undefined) result.color = profile.color;
  if (profile.is_active !== undefined) result.is_active = profile.is_active;
  if (profile.visible_fields !== undefined) result.visible_fields = profile.visible_fields as Json;
  if (profile.hidden_fields !== undefined) result.hidden_fields = profile.hidden_fields as Json;
  if (profile.active_modules !== undefined) result.active_modules = profile.active_modules as Json;
  if (profile.module_settings !== undefined) result.module_settings = profile.module_settings as Json;
  if (profile.custom_fields_config !== undefined) result.custom_fields_config = profile.custom_fields_config as unknown as Json;
  if (profile.automation_triggers !== undefined) result.automation_triggers = profile.automation_triggers as unknown as Json;
  if (profile.kpi_config !== undefined) result.kpi_config = profile.kpi_config as unknown as Json;
  if (profile.ai_context !== undefined) result.ai_context = profile.ai_context as unknown as Json;
  if (profile.ai_suggestions_enabled !== undefined) result.ai_suggestions_enabled = profile.ai_suggestions_enabled;
  
  return result;
}

// Fetch all activity profiles for the workspace
export function useActivityProfiles() {
  const { currentWorkspace } = useWorkspace();
  const workspaceId = currentWorkspace?.id;

  return useQuery({
    queryKey: ['activity-profiles', workspaceId],
    queryFn: async (): Promise<ActivityProfile[]> => {
      if (!workspaceId) return [];

      const { data, error } = await supabase
        .from('activity_profiles')
        .select('*')
        .eq('workspace_id', workspaceId)
        .eq('is_active', true)
        .order('is_system', { ascending: false })
        .order('name');

      if (error) {
        console.error('Error fetching activity profiles:', error);
        throw error;
      }

      return (data || []).map(parseActivityProfile);
    },
    enabled: !!workspaceId,
  });
}

// Fetch a single activity profile by ID
export function useActivityProfile(profileId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['activity-profile', profileId],
    queryFn: async (): Promise<ActivityProfile | null> => {
      if (!profileId) return null;

      const { data, error } = await supabase
        .from('activity_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (error) {
        console.error('Error fetching activity profile:', error);
        return null;
      }

      return parseActivityProfile(data);
    },
    enabled: !!profileId && !!currentWorkspace?.id,
  });
}

// Get the default/active profile for an entity
export function useEntityActivityProfile(entityType: 'contact' | 'company', entityId: string | null) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ['entity-activity-profile', entityType, entityId],
    queryFn: async (): Promise<ActivityProfile | null> => {
      if (!entityId || !currentWorkspace?.id) return null;

      // First check if entity has a specific profile
      const table = entityType === 'contact' ? 'contacts' : 'companies';
      const { data: entity, error: entityError } = await supabase
        .from(table)
        .select('activity_profile_id')
        .eq('id', entityId)
        .single();

      if (entityError) {
        console.error('Error fetching entity profile:', entityError);
        return null;
      }

      let profileId = (entity as any)?.activity_profile_id;

      // If no specific profile, get workspace default
      if (!profileId) {
        const { data: workspace } = await supabase
          .from('workspaces')
          .select('default_activity_profile_id')
          .eq('id', currentWorkspace.id)
          .single();

        profileId = workspace?.default_activity_profile_id;
      }

      // If still no profile, get the generic one
      if (!profileId) {
        const { data: genericProfile } = await supabase
          .from('activity_profiles')
          .select('*')
          .eq('workspace_id', currentWorkspace.id)
          .eq('code', 'generico')
          .single();

        if (genericProfile) {
          return parseActivityProfile(genericProfile);
        }
        return null;
      }

      // Fetch the specific profile
      const { data: profile } = await supabase
        .from('activity_profiles')
        .select('*')
        .eq('id', profileId)
        .single();

      if (!profile) return null;

      return parseActivityProfile(profile);
    },
    enabled: !!entityId && !!currentWorkspace?.id,
  });
}

// Initialize profiles for a workspace
export function useInitializeActivityProfiles() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async () => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      // Check if profiles already exist
      const { data: existing } = await supabase
        .from('activity_profiles')
        .select('id')
        .eq('workspace_id', currentWorkspace.id)
        .limit(1);

      if (existing && existing.length > 0) {
        return { alreadyExists: true };
      }

      // Call the initialization function
      const { error } = await supabase.rpc('initialize_workspace_activity_profiles', {
        p_workspace_id: currentWorkspace.id,
        p_created_by: null,
      });

      if (error) throw error;
      return { alreadyExists: false };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['activity-profiles', currentWorkspace?.id] });
      if (!result.alreadyExists) {
        toast.success('Perfis de atividade inicializados');
      }
    },
    onError: (error) => {
      console.error('Error initializing profiles:', error);
      toast.error('Erro ao inicializar perfis');
    },
  });
}

// Update an activity profile
export function useUpdateActivityProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async ({ 
      profileId, 
      updates 
    }: { 
      profileId: string; 
      updates: Partial<ActivityProfile>;
    }) => {
      const dbUpdates = {
        ...toDbFormat(updates),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('activity_profiles')
        .update(dbUpdates)
        .eq('id', profileId)
        .select()
        .single();

      if (error) throw error;
      return parseActivityProfile(data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['activity-profiles', currentWorkspace?.id] });
      queryClient.invalidateQueries({ queryKey: ['activity-profile', data.id] });
      toast.success('Perfil atualizado');
    },
    onError: (error) => {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    },
  });
}

// Create a custom activity profile
export function useCreateActivityProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (profile: Omit<ActivityProfile, 'id' | 'created_at' | 'updated_at' | 'workspace_id'>) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const dbData = {
        ...toDbFormat(profile),
        workspace_id: currentWorkspace.id,
        is_system: false,
        code: profile.code,
        name: profile.name,
        profile_type: profile.profile_type,
      };

      const { data, error } = await supabase
        .from('activity_profiles')
        .insert(dbData)
        .select()
        .single();

      if (error) throw error;
      return parseActivityProfile(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-profiles', currentWorkspace?.id] });
      toast.success('Perfil criado');
    },
    onError: (error) => {
      console.error('Error creating profile:', error);
      toast.error('Erro ao criar perfil');
    },
  });
}

// Delete a custom activity profile
export function useDeleteActivityProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (profileId: string) => {
      // Check if it's a system profile
      const { data: profile } = await supabase
        .from('activity_profiles')
        .select('is_system')
        .eq('id', profileId)
        .single();

      if (profile?.is_system) {
        throw new Error('Não é possível eliminar perfis de sistema');
      }

      const { error } = await supabase
        .from('activity_profiles')
        .delete()
        .eq('id', profileId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activity-profiles', currentWorkspace?.id] });
      toast.success('Perfil eliminado');
    },
    onError: (error) => {
      console.error('Error deleting profile:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao eliminar perfil');
    },
  });
}

// Set entity activity profile
export function useSetEntityActivityProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ 
      entityType, 
      entityId, 
      profileId 
    }: { 
      entityType: 'contact' | 'company'; 
      entityId: string; 
      profileId: string | null;
    }) => {
      const table = entityType === 'contact' ? 'contacts' : 'companies';
      
      const { error } = await supabase
        .from(table)
        .update({ activity_profile_id: profileId })
        .eq('id', entityId);

      if (error) throw error;
    },
    onSuccess: (_, { entityType, entityId }) => {
      queryClient.invalidateQueries({ queryKey: ['entity-activity-profile', entityType, entityId] });
      queryClient.invalidateQueries({ queryKey: [entityType === 'contact' ? 'contacts' : 'companies'] });
      toast.success('Perfil de atividade atualizado');
    },
    onError: (error) => {
      console.error('Error setting entity profile:', error);
      toast.error('Erro ao definir perfil');
    },
  });
}

// Set workspace default profile
export function useSetWorkspaceDefaultProfile() {
  const queryClient = useQueryClient();
  const { currentWorkspace } = useWorkspace();

  return useMutation({
    mutationFn: async (profileId: string) => {
      if (!currentWorkspace?.id) throw new Error('No workspace selected');

      const { error } = await supabase
        .from('workspaces')
        .update({ default_activity_profile_id: profileId })
        .eq('id', currentWorkspace.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspaces'] });
      queryClient.invalidateQueries({ queryKey: ['workspace', currentWorkspace?.id] });
      toast.success('Perfil padrão definido');
    },
    onError: (error) => {
      console.error('Error setting default profile:', error);
      toast.error('Erro ao definir perfil padrão');
    },
  });
}

// Helper to get profile-specific fields
export function getProfileSpecificFields(profileType: ActivityProfileType) {
  return PROFILE_SPECIFIC_FIELDS[profileType] || [];
}

// Helper to check if a module is active for a profile
export function isModuleActive(profile: ActivityProfile | null, module: string): boolean {
  if (!profile) return true; // Default to active if no profile
  return profile.active_modules.includes(module);
}

// Helper to check if a field should be visible
export function isFieldVisible(
  profile: ActivityProfile | null, 
  entityType: 'contact' | 'company' | 'opportunity',
  fieldName: string
): boolean {
  if (!profile) return true; // Default to visible if no profile
  
  const entityKey = entityType === 'contact' ? 'contacts' : 
                    entityType === 'company' ? 'companies' : 'opportunities';
  
  // Check hidden fields first
  const hiddenFields = profile.hidden_fields[entityKey] || [];
  if (hiddenFields.includes(fieldName)) return false;
  
  // If visible_fields is defined and not empty, only show those
  const visibleFields = profile.visible_fields[entityKey] || [];
  if (visibleFields.length > 0) {
    return visibleFields.includes(fieldName);
  }
  
  return true; // Default to visible
}

// Get AI terminology for a profile
export function getAITerminology(profile: ActivityProfile | null): Record<string, string> {
  if (!profile) {
    return { client: 'cliente', deal: 'oportunidade', product: 'produto' };
  }
  return {
    client: profile.ai_context.terminology?.client || 'cliente',
    deal: profile.ai_context.terminology?.deal || 'oportunidade',
    product: profile.ai_context.terminology?.product || 'produto',
    meeting: profile.ai_context.terminology?.meeting || 'reunião',
    ...profile.ai_context.terminology,
  };
}
