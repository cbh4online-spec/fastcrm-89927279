import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/contexts/WorkspaceContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceCategory {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  position: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  workspace_id: string;
  category_id: string | null;
  name: string;
  description: string | null;
  duration: number;
  price: number | null;
  currency: string;
  color: string | null;
  buffer_before: number;
  buffer_after: number;
  min_notice_hours: number;
  max_booking_days: number;
  max_per_day: number | null;
  form_id: string | null;
  is_active: boolean;
  is_public: boolean;
  requires_confirmation: boolean;
  allow_cancellation: boolean;
  cancellation_hours: number;
  metadata: Record<string, unknown>;
  created_by: string;
  created_at: string;
  updated_at: string;
  category?: ServiceCategory;
  locations?: ServiceLocation[];
  user_assignments?: ServiceUserAssignment[];
  team_assignments?: ServiceTeamAssignment[];
  availability?: ServiceAvailability[];
}

export interface ServiceLocation {
  id: string;
  service_id: string;
  location_type: 'physical' | 'online' | 'phone' | 'client_location';
  location_name: string | null;
  location_address: string | null;
  meeting_url: string | null;
  is_default: boolean;
  created_at: string;
}

export interface ServiceUserAssignment {
  id: string;
  service_id: string;
  user_id: string;
  is_primary: boolean;
  custom_duration: number | null;
  custom_price: number | null;
  created_at: string;
}

export interface ServiceTeamAssignment {
  id: string;
  service_id: string;
  team_id: string;
  routing_mode: 'round_robin' | 'least_busy' | 'manual' | 'random';
  created_at: string;
}

export interface ServiceAvailability {
  id: string;
  service_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface CreateServiceData {
  name: string;
  description?: string;
  category_id?: string;
  duration: number;
  price?: number;
  currency?: string;
  color?: string;
  buffer_before?: number;
  buffer_after?: number;
  min_notice_hours?: number;
  max_booking_days?: number;
  max_per_day?: number;
  is_active?: boolean;
  is_public?: boolean;
  requires_confirmation?: boolean;
  allow_cancellation?: boolean;
  cancellation_hours?: number;
  locations?: Omit<ServiceLocation, 'id' | 'service_id' | 'created_at'>[];
  availability?: Omit<ServiceAvailability, 'id' | 'service_id' | 'created_at'>[];
}

export function useServices() {
  const { currentWorkspace } = useWorkspace();
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchServices = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    setIsLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('services')
        .select(`
          *,
          category:service_categories(*),
          locations:service_locations(*),
          user_assignments:service_user_assignments(*),
          team_assignments:service_team_assignments(*),
          availability:service_availability(*)
        `)
        .eq('workspace_id', currentWorkspace.id)
        .order('name');

      if (fetchError) throw fetchError;
      setServices(data as Service[] || []);
    } catch (err) {
      console.error('Error fetching services:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  const fetchCategories = useCallback(async () => {
    if (!currentWorkspace?.id) return;

    try {
      const { data, error: fetchError } = await supabase
        .from('service_categories')
        .select('*')
        .eq('workspace_id', currentWorkspace.id)
        .eq('is_active', true)
        .order('position');

      if (fetchError) throw fetchError;
      setCategories(data as ServiceCategory[] || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    fetchServices();
    fetchCategories();
  }, [fetchServices, fetchCategories]);

  const createService = async (data: CreateServiceData): Promise<Service | null> => {
    if (!currentWorkspace?.id || !user?.id) return null;

    try {
      const { locations, availability, ...serviceData } = data;

      const { data: service, error: insertError } = await supabase
        .from('services')
        .insert({
          ...serviceData,
          workspace_id: currentWorkspace.id,
          created_by: user.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      // Add locations if provided
      if (locations && locations.length > 0) {
        const { error: locError } = await supabase
          .from('service_locations')
          .insert(locations.map(loc => ({
            ...loc,
            service_id: service.id,
          })));
        if (locError) console.error('Error adding locations:', locError);
      }

      // Add availability if provided
      if (availability && availability.length > 0) {
        const { error: availError } = await supabase
          .from('service_availability')
          .insert(availability.map(avail => ({
            ...avail,
            service_id: service.id,
          })));
        if (availError) console.error('Error adding availability:', availError);
      }

      toast.success('Serviço criado com sucesso');
      await fetchServices();
      return service as Service;
    } catch (err) {
      console.error('Error creating service:', err);
      toast.error('Erro ao criar serviço');
      return null;
    }
  };

  const updateService = async (id: string, data: Partial<CreateServiceData>): Promise<boolean> => {
    try {
      const { locations, availability, ...serviceData } = data;

      const { error: updateError } = await supabase
        .from('services')
        .update(serviceData)
        .eq('id', id);

      if (updateError) throw updateError;

      // Update locations if provided
      if (locations !== undefined) {
        await supabase.from('service_locations').delete().eq('service_id', id);
        if (locations.length > 0) {
          await supabase.from('service_locations').insert(
            locations.map(loc => ({ ...loc, service_id: id }))
          );
        }
      }

      // Update availability if provided
      if (availability !== undefined) {
        await supabase.from('service_availability').delete().eq('service_id', id);
        if (availability.length > 0) {
          await supabase.from('service_availability').insert(
            availability.map(avail => ({ ...avail, service_id: id }))
          );
        }
      }

      toast.success('Serviço atualizado com sucesso');
      await fetchServices();
      return true;
    } catch (err) {
      console.error('Error updating service:', err);
      toast.error('Erro ao atualizar serviço');
      return false;
    }
  };

  const deleteService = async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;

      toast.success('Serviço eliminado com sucesso');
      await fetchServices();
      return true;
    } catch (err) {
      console.error('Error deleting service:', err);
      toast.error('Erro ao eliminar serviço');
      return false;
    }
  };

  const createCategory = async (name: string, color?: string): Promise<ServiceCategory | null> => {
    if (!currentWorkspace?.id) return null;

    try {
      const { data, error: insertError } = await supabase
        .from('service_categories')
        .insert({
          name,
          color: color || '#3B82F6',
          workspace_id: currentWorkspace.id,
        })
        .select()
        .single();

      if (insertError) throw insertError;

      toast.success('Categoria criada com sucesso');
      await fetchCategories();
      return data as ServiceCategory;
    } catch (err) {
      console.error('Error creating category:', err);
      toast.error('Erro ao criar categoria');
      return null;
    }
  };

  const toggleServiceStatus = async (id: string, isActive: boolean): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('services')
        .update({ is_active: isActive })
        .eq('id', id);

      if (updateError) throw updateError;

      toast.success(isActive ? 'Serviço ativado' : 'Serviço desativado');
      await fetchServices();
      return true;
    } catch (err) {
      console.error('Error toggling service status:', err);
      toast.error('Erro ao alterar estado do serviço');
      return false;
    }
  };

  return {
    services,
    categories,
    isLoading,
    error,
    createService,
    updateService,
    deleteService,
    createCategory,
    toggleServiceStatus,
    refresh: fetchServices,
  };
}
