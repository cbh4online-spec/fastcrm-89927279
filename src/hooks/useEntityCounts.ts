import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface EntityCounts {
  messages: number;
  tasks: number;
  opportunities: number;
  proposals: number;
  contacts: number;
  orders: number;
  scheduling: number;
  files: number;
  notes: number;
}

type EntityType = 'lead' | 'contact' | 'company';

export function useEntityCounts(entityType: EntityType, entityId: string | undefined) {
  return useQuery({
    queryKey: ['entity-counts', entityType, entityId],
    queryFn: async (): Promise<EntityCounts> => {
      if (!entityId) {
        return { messages: 0, tasks: 0, opportunities: 0, proposals: 0, contacts: 0, orders: 0, scheduling: 0, files: 0, notes: 0 };
      }

      let tasksCount = 0;
      let opportunitiesCount = 0;
      let proposalsCount = 0;
      let contactsCount = 0;
      let ordersCount = 0;

      // Count tasks - tasks table uses related_type and related_id columns
      const tasksResult = await supabase
        .from('tasks')
        .select('id')
        .eq('related_type', entityType)
        .eq('related_id', entityId);
      tasksCount = tasksResult.data?.length || 0;

      // Count opportunities
      const oppColumn = entityType === 'lead' ? 'lead_id' 
        : entityType === 'contact' ? 'contact_id' 
        : 'company_id';
      
      const oppResult = await supabase
        .from('opportunities')
        .select('id')
        .eq(oppColumn, entityId);
      opportunitiesCount = oppResult.data?.length || 0;

      // Count proposals - using type assertion
      const propColumn = entityType === 'lead' ? 'lead_id' 
        : entityType === 'contact' ? 'contact_id' 
        : 'company_id';
      
      const propResult = await (supabase
        .from('proposals')
        .select('id') as any)
        .eq(propColumn, entityId);
      proposalsCount = propResult.data?.length || 0;

      // Count contacts (only for companies)
      if (entityType === 'company') {
        const contactsResult = await supabase
          .from('contacts')
          .select('id')
          .eq('company_id', entityId);
        contactsCount = contactsResult.data?.length || 0;
      }

      // Count orders (for contacts and companies via client_users)
      if (entityType === 'contact' || entityType === 'company') {
        const clientUserColumn = entityType === 'contact' ? 'contact_id' : 'company_id';
        const clientUsersResult = await supabase
          .from('client_users')
          .select('id')
          .eq(clientUserColumn, entityId);
        
        if (clientUsersResult.data && clientUsersResult.data.length > 0) {
          const clientUserIds = clientUsersResult.data.map(c => c.id);
          const ordersResult = await supabase
            .from('order_notes')
            .select('id')
            .in('client_user_id', clientUserIds)
            .neq('status', 'draft');
          ordersCount = ordersResult.data?.length || 0;
        }
      }

      // Count scheduling (meetings) - via meetings table
      let schedulingCount = 0;
      const meetingColumn = entityType === 'lead' ? 'lead_id' 
        : entityType === 'contact' ? 'contact_id' 
        : 'company_id';
      
      const meetingsResult = await supabase
        .from('meetings')
        .select('id')
        .eq(meetingColumn, entityId);
      schedulingCount = meetingsResult.data?.length || 0;

      // Also count calendar_events
      const calendarEventsResult = await supabase
        .from('calendar_events')
        .select('id')
        .eq(meetingColumn, entityId);
      schedulingCount += calendarEventsResult.data?.length || 0;

      // Count files (entity_documents)
      let filesCount = 0;
      const filesResult = await (supabase
        .from('entity_documents' as any)
        .select('id') as any)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      filesCount = filesResult.data?.length || 0;

      // Count notes (entity_notes)
      let notesCount = 0;
      const notesResult = await (supabase
        .from('entity_notes' as any)
        .select('id') as any)
        .eq('entity_type', entityType)
        .eq('entity_id', entityId);
      notesCount = notesResult.data?.length || 0;

      return {
        messages: 0,
        tasks: tasksCount,
        opportunities: opportunitiesCount,
        proposals: proposalsCount,
        contacts: contactsCount,
        orders: ordersCount,
        scheduling: schedulingCount,
        files: filesCount,
        notes: notesCount,
      };
    },
    enabled: !!entityId,
    staleTime: 30000,
  });
}
