import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase as _supabase } from "@/integrations/supabase/client";
const supabase = _supabase as any;
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

/**
 * Hook for converting between Security Ops pipeline stages:
 * Partner Request → Lead → Proposal → Contract (Adjudicação) → Installation
 */
export function useSecurityConversions() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const workspaceId = currentWorkspace?.id;

  /**
   * Convert a validated Partner Request → Security Lead
   */
  const convertRequestToLead = useMutation({
    mutationFn: async (request: any) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data: user } = await supabase.auth.getUser();
      const payload = request.parsed_payload_json || {};

      // 1. Create or find client
      let clientId = request.linked_company_id;
      if (!clientId && payload.client_name) {
        const { data: client } = await supabase
          .from("security_clients")
          .insert({
            workspace_id: workspaceId,
            name: payload.client_name,
            client_type: payload.client_type || "particular",
            status: "prospect",
            contact_person_name: payload.responsible_name,
            contact_person_phone: payload.responsible_phone,
            contact_email: payload.responsible_email,
            created_by: user.user?.id,
          } as any)
          .select()
          .single();
        if (client) clientId = client.id;
      }

      // 2. Create or find site
      let siteId = request.linked_site_id;
      if (!siteId && payload.address) {
        const { data: site } = await supabase
          .from("security_installation_sites")
          .insert({
            workspace_id: workspaceId,
            client_id: clientId,
            site_name: payload.client_name || payload.address,
            address_line1: payload.address,
            postal_code: payload.postal_code,
            locality: payload.locality,
            county: payload.county,
            district: payload.district,
            onsite_responsible_name: payload.responsible_name,
            onsite_responsible_phone: payload.responsible_phone,
            onsite_responsible_email: payload.responsible_email,
            partner_id: request.partner_id,
            created_by: user.user?.id,
          } as any)
          .select()
          .single();
        if (site) siteId = site.id;
      }

      // 3. Create lead
      const { data: lead, error } = await supabase
        .from("security_leads")
        .insert({
          workspace_id: workspaceId,
          origin: "partner",
          partner_id: request.partner_id,
          partner_request_id: request.id,
          source_channel: request.source_channel,
          client_id: clientId,
          client_name: payload.client_name,
          client_type: payload.client_type,
          site_id: siteId,
          installation_address: payload.address,
          need_description: payload.observations || request.raw_text?.substring(0, 500),
          system_type: payload.system_type || "cctv",
          request_type: payload.request_type || "installation",
          status: "new",
          priority: "medium",
          created_by: user.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // 4. Update request with link
      await supabase
        .from("security_partner_requests")
        .update({
          linked_security_lead_id: lead.id,
          linked_company_id: clientId,
          linked_site_id: siteId,
          updated_by: user.user?.id,
        } as any)
        .eq("id", request.id);

      return lead;
    },
    onSuccess: (lead) => {
      qc.invalidateQueries({ queryKey: ["security-leads"] });
      qc.invalidateQueries({ queryKey: ["security-partner-requests"] });
      qc.invalidateQueries({ queryKey: ["security-clients"] });
      toast.success("Lead criado com sucesso", {
        description: "Pedido de parceiro convertido em lead operacional",
        action: { label: "Ver Lead", onClick: () => navigate(`/dashboard/security/leads/${lead.id}`) },
      });
    },
    onError: (e: any) => toast.error("Erro ao converter: " + e.message),
  });

  /**
   * Convert a Lead → Proposal
   */
  const convertLeadToProposal = useMutation({
    mutationFn: async (lead: any) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data: user } = await supabase.auth.getUser();

      const { data: proposal, error } = await supabase
        .from("security_proposals")
        .insert({
          workspace_id: workspaceId,
          lead_id: lead.id,
          client_id: lead.client_id,
          site_id: lead.site_id,
          partner_id: lead.partner_id,
          title: `Proposta — ${lead.client_name || "Cliente"}`,
          solution_description: lead.need_description,
          status: "draft",
          version: 1,
          created_by: user.user?.id,
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update lead status
      await supabase
        .from("security_leads")
        .update({ status: "proposal_sent", updated_by: user.user?.id } as any)
        .eq("id", lead.id);

      return proposal;
    },
    onSuccess: (proposal) => {
      qc.invalidateQueries({ queryKey: ["security-leads"] });
      qc.invalidateQueries({ queryKey: ["security-proposals"] });
      toast.success("Proposta criada", {
        description: "Lead convertido em proposta",
        action: { label: "Ver Proposta", onClick: () => navigate(`/dashboard/security/proposals/${proposal.id}`) },
      });
    },
    onError: (e: any) => toast.error("Erro ao criar proposta: " + e.message),
  });

  /**
   * Convert accepted Proposal → Contract (Adjudicação)
   */
  const convertProposalToContract = useMutation({
    mutationFn: async (proposal: any) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data: user } = await supabase.auth.getUser();

      const { data: contract, error } = await supabase
        .from("security_contracts")
        .insert({
          workspace_id: workspaceId,
          lead_id: proposal.lead_id,
          proposal_id: proposal.id,
          client_id: proposal.client_id,
          system_id: null,
          contract_type: "installation",
          contract_status: "draft",
          adjudication_date: new Date().toISOString().split("T")[0],
          internal_responsible: user.user?.id,
          notes: `Adjudicação da proposta ${proposal.proposal_number || proposal.title || ""}`.trim(),
          commercial_terms_json: {
            total_value: proposal.final_value || proposal.total_value,
            equipment_value: proposal.equipment_value,
            labor_value: proposal.labor_value,
          },
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update proposal status
      await supabase
        .from("security_proposals")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), updated_by: user.user?.id } as any)
        .eq("id", proposal.id);

      // Update lead status
      if (proposal.lead_id) {
        await supabase
          .from("security_leads")
          .update({ status: "won", updated_by: user.user?.id } as any)
          .eq("id", proposal.lead_id);
      }

      return contract;
    },
    onSuccess: (contract) => {
      qc.invalidateQueries({ queryKey: ["security-proposals"] });
      qc.invalidateQueries({ queryKey: ["security-leads"] });
      qc.invalidateQueries({ queryKey: ["security-contracts"] });
      toast.success("Adjudicação registada", {
        description: "Proposta aceite e contrato criado",
        action: { label: "Ver Contrato", onClick: () => navigate(`/dashboard/security/contracts/${contract.id}`) },
      });
    },
    onError: (e: any) => toast.error("Erro na adjudicação: " + e.message),
  });

  /**
   * Convert Contract (Adjudicação) → Installation (System)
   */
  const convertContractToInstallation = useMutation({
    mutationFn: async (contract: any) => {
      if (!workspaceId) throw new Error("Workspace não encontrado");
      const { data: user } = await supabase.auth.getUser();

      // Determine system type from lead or default
      let systemType = "cctv";
      let siteId = null;
      let clientId = contract.client_id;

      if (contract.lead_id) {
        const { data: lead } = await supabase
          .from("security_leads")
          .select("system_type, site_id, client_id")
          .eq("id", contract.lead_id)
          .single();
        if (lead) {
          systemType = lead.system_type || systemType;
          siteId = lead.site_id;
          if (!clientId) clientId = lead.client_id;
        }
      }

      // If no site from lead, try to find from contract's system
      if (!siteId && contract.system_id) {
        const { data: existingSys } = await supabase
          .from("security_systems")
          .select("site_id")
          .eq("id", contract.system_id)
          .single();
        if (existingSys) siteId = existingSys.site_id;
      }

      const { data: system, error } = await supabase
        .from("security_systems")
        .insert({
          workspace_id: workspaceId,
          site_id: siteId,
          contract_id: contract.id,
          client_id: clientId,
          system_type: systemType,
          lifecycle_type: "new_installation",
          status: "draft",
          technical_notes: contract.notes || "",
        } as any)
        .select()
        .single();

      if (error) throw error;

      // Update contract with system_id and activate
      await supabase
        .from("security_contracts")
        .update({
          system_id: system.id,
          contract_status: "active",
        } as any)
        .eq("id", contract.id);

      return system;
    },
    onSuccess: (system) => {
      qc.invalidateQueries({ queryKey: ["security-contracts"] });
      qc.invalidateQueries({ queryKey: ["security-systems"] });
      toast.success("Instalação criada", {
        description: "Contrato convertido em instalação — preencha os dados do sistema",
        action: { label: "Ver Instalação", onClick: () => navigate(`/dashboard/security/systems/${system.id}`) },
      });
    },
    onError: (e: any) => toast.error("Erro ao criar instalação: " + e.message),
  });

  return {
    convertRequestToLead,
    convertLeadToProposal,
    convertProposalToContract,
    convertContractToInstallation,
  };
}
