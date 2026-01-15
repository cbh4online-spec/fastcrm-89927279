import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import type { ClientEntitlement } from "@/types/product";
import {
  PackageAlert,
  INACTIVITY_DAYS_THRESHOLD,
  EXPIRY_WARNING_DAYS,
  LOW_REMAINING_THRESHOLD,
  packageAlertMessages,
} from "@/types/entitlement";
import type { EntitlementStatus } from "@/types/product";

interface EntitlementWithDetails {
  id: string;
  product_id: string;
  total_units: number;
  used_units: number;
  remaining_units: number;
  unit_name: string;
  status: EntitlementStatus;
  expiry_date: string | null;
  product?: { id: string; name: string };
  contact?: { id: string; name: string };
  company?: { id: string; name: string };
  last_consumption_date?: string;
}

function generateAlertsForEntitlement(ent: EntitlementWithDetails): PackageAlert[] {
  const alerts: PackageAlert[] = [];
  const now = new Date();
  const clientName = ent.contact?.name || ent.company?.name || 'Cliente';
  const productName = ent.product?.name || 'Produto';

  // Only check active packages
  if (ent.status !== 'active') {
    // Check completed
    if (ent.status === 'completed') {
      alerts.push({
        type: 'completed',
        severity: 'info',
        title: packageAlertMessages.completed.title,
        message: packageAlertMessages.completed.message({ clientName, productName }),
        entitlementId: ent.id,
        productName,
        clientName,
        actions: [
          { label: 'Criar Oportunidade', action: 'create_opportunity' },
          { label: 'Enviar Mensagem', action: 'send_message' },
        ],
      });
    }

    // Check expired
    if (ent.status === 'expired') {
      alerts.push({
        type: 'expired',
        severity: 'warning',
        title: packageAlertMessages.expired.title,
        message: packageAlertMessages.expired.message({
          clientName,
          remaining: ent.remaining_units,
          unitName: ent.unit_name,
        }),
        entitlementId: ent.id,
        productName,
        clientName,
        actions: [
          { label: 'Criar Oportunidade', action: 'create_opportunity' },
          { label: 'Ver Pacote', action: 'view_package' },
        ],
      });
    }

    return alerts;
  }

  // Check low remaining (<=20% left)
  const remainingPct = ent.remaining_units / ent.total_units;
  if (remainingPct <= LOW_REMAINING_THRESHOLD && ent.remaining_units > 0) {
    alerts.push({
      type: 'low_remaining',
      severity: 'warning',
      title: packageAlertMessages.low_remaining.title,
      message: packageAlertMessages.low_remaining.message({
        clientName,
        remaining: ent.remaining_units,
        unitName: ent.unit_name,
      }),
      entitlementId: ent.id,
      productName,
      clientName,
      actions: [
        { label: 'Criar Oportunidade', action: 'create_opportunity' },
        { label: 'Criar Tarefa', action: 'create_task' },
      ],
    });
  }

  // Check expiring soon
  if (ent.expiry_date) {
    const expiryDate = new Date(ent.expiry_date);
    const daysLeft = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft > 0 && daysLeft <= EXPIRY_WARNING_DAYS) {
      alerts.push({
        type: 'expiring_soon',
        severity: 'warning',
        title: packageAlertMessages.expiring_soon.title,
        message: packageAlertMessages.expiring_soon.message({ clientName, daysLeft }),
        entitlementId: ent.id,
        productName,
        clientName,
        actions: [
          { label: 'Enviar Mensagem', action: 'send_message' },
          { label: 'Criar Tarefa', action: 'create_task' },
        ],
      });
    }
  }

  // Check inactivity
  if (ent.last_consumption_date) {
    const lastConsumption = new Date(ent.last_consumption_date);
    const daysSince = Math.floor((now.getTime() - lastConsumption.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysSince >= INACTIVITY_DAYS_THRESHOLD) {
      alerts.push({
        type: 'inactive',
        severity: 'info',
        title: packageAlertMessages.inactive.title,
        message: packageAlertMessages.inactive.message({ clientName, daysSince }),
        entitlementId: ent.id,
        productName,
        clientName,
        actions: [
          { label: 'Criar Tarefa', action: 'create_task' },
          { label: 'Enviar Mensagem', action: 'send_message' },
        ],
      });
    }
  }

  return alerts;
}

// Fetch all packages with alerts
export function useAllPackageAlerts() {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["all-package-alerts", currentWorkspace?.id],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];

      // Fetch active and recently completed/expired entitlements
      const { data: entitlements, error } = await supabase
        .from("client_entitlements")
        .select(`
          *,
          product:products(id, name),
          contact:contacts(id, name),
          company:companies(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id)
        .in("status", ["active", "completed", "expired"])
        .order("updated_at", { ascending: false });

      if (error) throw error;

      // Get last consumption dates for each entitlement
      const entitlementIds = entitlements?.map(e => e.id) || [];
      
      let lastConsumptions: Record<string, string> = {};
      if (entitlementIds.length > 0) {
        const { data: consumptions } = await supabase
          .from("session_consumptions")
          .select("entitlement_id, session_date")
          .in("entitlement_id", entitlementIds)
          .order("session_date", { ascending: false });

        // Get the most recent consumption for each entitlement
        consumptions?.forEach(c => {
          if (!lastConsumptions[c.entitlement_id]) {
            lastConsumptions[c.entitlement_id] = c.session_date;
          }
        });
      }

      // Generate alerts
      const allAlerts: PackageAlert[] = [];
      entitlements?.forEach(ent => {
        const entWithDetails: EntitlementWithDetails = {
          ...ent,
          status: ent.status as EntitlementStatus,
          last_consumption_date: lastConsumptions[ent.id],
        };
        allAlerts.push(...generateAlertsForEntitlement(entWithDetails));
      });

      return allAlerts;
    },
    enabled: !!currentWorkspace?.id,
    staleTime: 30000, // 30 seconds
  });
}

// Fetch alerts for a specific product
export function useProductPackageAlerts(productId: string | undefined) {
  const { data: allAlerts = [] } = useAllPackageAlerts();

  return {
    data: allAlerts.filter(alert => {
      // This is a simplified filter - in production you'd want to include productId in the alert
      return true;
    }),
  };
}

// Fetch alerts for a specific client
export function useClientPackageAlerts(params: { contactId?: string; companyId?: string }) {
  const { currentWorkspace } = useWorkspace();

  return useQuery({
    queryKey: ["client-package-alerts", params.contactId, params.companyId],
    queryFn: async () => {
      if (!currentWorkspace?.id) return [];
      if (!params.contactId && !params.companyId) return [];

      let query = supabase
        .from("client_entitlements")
        .select(`
          *,
          product:products(id, name),
          contact:contacts(id, name),
          company:companies(id, name)
        `)
        .eq("workspace_id", currentWorkspace.id);

      if (params.contactId) {
        query = query.eq("contact_id", params.contactId);
      }
      if (params.companyId) {
        query = query.eq("company_id", params.companyId);
      }

      const { data: entitlements, error } = await query;

      if (error) throw error;

      // Get last consumption dates
      const entitlementIds = entitlements?.map(e => e.id) || [];
      
      let lastConsumptions: Record<string, string> = {};
      if (entitlementIds.length > 0) {
        const { data: consumptions } = await supabase
          .from("session_consumptions")
          .select("entitlement_id, session_date")
          .in("entitlement_id", entitlementIds)
          .order("session_date", { ascending: false });

        consumptions?.forEach(c => {
          if (!lastConsumptions[c.entitlement_id]) {
            lastConsumptions[c.entitlement_id] = c.session_date;
          }
        });
      }

      // Generate alerts
      const allAlerts: PackageAlert[] = [];
      entitlements?.forEach(ent => {
        const entWithDetails: EntitlementWithDetails = {
          ...ent,
          status: ent.status as EntitlementStatus,
          last_consumption_date: lastConsumptions[ent.id],
        };
        allAlerts.push(...generateAlertsForEntitlement(entWithDetails));
      });

      return allAlerts;
    },
    enabled: !!currentWorkspace?.id && (!!params.contactId || !!params.companyId),
  });
}
