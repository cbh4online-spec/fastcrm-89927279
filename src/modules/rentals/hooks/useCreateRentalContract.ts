import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";
import type { CreateRentalContractInput } from "../types";

export function useCreateRentalContract() {
  const { currentWorkspace } = useWorkspace();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateRentalContractInput) => {
      if (!currentWorkspace) throw new Error("Sem workspace seleccionado");
      const wid = currentWorkspace.id;
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Sessão expirada");

      // 1. Gerar nº contrato (ou usar override manual)
      let contract_number: string;
      if (input.contract_number_override && input.contract_number_override.trim()) {
        contract_number = input.contract_number_override.trim();
        const { data: dup } = await supabase
          .from("rental_contracts")
          .select("id")
          .eq("workspace_id", wid)
          .eq("contract_number", contract_number)
          .limit(1)
          .maybeSingle();
        if (dup) throw new Error(`Já existe um contrato com a referência "${contract_number}".`);
      } else {
        const { data: numberData, error: numErr } = await supabase.rpc(
          "generate_rental_contract_number",
          { p_workspace_id: wid },
        );
        if (numErr) throw numErr;
        contract_number = numberData as unknown as string;
      }

      // 2. Calcular totais
      const total_financed = input.items.reduce(
        (sum, l) => sum + l.quantity * l.unit_price,
        0,
      );
      const end = new Date(input.start_date);
      end.setMonth(end.getMonth() + input.duration_months);

      // 3. Validar serial numbers únicos no workspace
      const allSerials = input.items.flatMap((l) => l.serial_numbers).filter(Boolean);
      if (allSerials.length > 0) {
        const { data: existing } = await supabase
          .from("equipment_units")
          .select("serial_number")
          .eq("workspace_id", wid)
          .in("serial_number", allSerials);
        if (existing && existing.length > 0) {
          throw new Error(
            `Nº de série já registado: ${existing.map((e) => e.serial_number).join(", ")}`,
          );
        }
      }

      // 4. Criar contrato
      const { data: contract, error: contractErr } = await supabase
        .from("rental_contracts")
        .insert({
          workspace_id: wid,
          contract_number,
          end_client_company_id: input.end_client_company_id,
          end_client_contact_id: input.end_client_contact_id ?? null,
          financier_company_id: input.financier_company_id,
          status: "active",
          start_date: input.start_date,
          end_date: end.toISOString().split("T")[0],
          duration_months: input.duration_months,
          monthly_amount: input.monthly_amount,
          total_financed,
          financier_commission: input.financier_commission ?? 0,
          notes: input.notes ?? null,
          created_by: userId,
        })
        .select()
        .single();
      if (contractErr) throw contractErr;

      // 5. Linhas + equipment_units
      const itemsRows = input.items.map((l, i) => ({
        contract_id: contract.id,
        product_id: l.product_id,
        description: l.description,
        quantity: l.quantity,
        unit_price: l.unit_price,
        total: l.quantity * l.unit_price,
        position: i,
      }));
      const { error: itemsErr } = await supabase.from("rental_contract_items").insert(itemsRows);
      if (itemsErr) throw itemsErr;

      for (const line of input.items) {
        for (const sn of line.serial_numbers) {
          if (!sn) continue;
          const { data: unit, error: unitErr } = await supabase
            .from("equipment_units")
            .insert({
              workspace_id: wid,
              product_id: line.product_id,
              serial_number: sn,
              status: "assigned",
              current_contract_id: contract.id,
              current_client_company_id: input.end_client_company_id,
              assigned_at: new Date().toISOString(),
              created_by: userId,
            })
            .select()
            .single();
          if (unitErr) throw unitErr;
          await supabase.from("equipment_unit_history").insert({
            equipment_unit_id: unit.id,
            event_type: "assigned",
            contract_id: contract.id,
            to_client_id: input.end_client_company_id,
            actor_user_id: userId,
            payload: { contract_number },
          });
        }
      }

      // 6. Fatura à Liquid (financier)
      let financierInvoiceId: string | null = null;
      if (input.emit_financier_invoice) {
        const { data: fin } = await supabase
          .from("companies")
          .select("name, tax_id, address, email")
          .eq("id", input.financier_company_id)
          .single();
        const { data: invNumber } = await supabase.rpc("generate_invoice_number", {
          p_workspace_id: wid,
        });
        const due = new Date(input.start_date);
        due.setDate(due.getDate() + 30);
        const { data: inv, error: invErr } = await supabase
          .from("invoices")
          .insert({
            workspace_id: wid,
            invoice_number: invNumber as string,
            status: "draft",
            document_type: "invoice",
            client_name: fin?.name ?? "Financiadora",
            client_email: fin?.email ?? null,
            client_tax_id: fin?.tax_id ?? null,
            client_address: fin?.address ?? null,
            company_id: input.financier_company_id,
            issue_date: input.start_date,
            due_date: due.toISOString().split("T")[0],
            subtotal: total_financed,
            tax_rate: 23,
            tax_amount: total_financed * 0.23,
            total: total_financed * 1.23,
            currency: "EUR",
            rental_contract_id: contract.id,
            notes: `Renting ${contract_number} — cliente final: ${input.end_client_company_id}`,
            created_by: userId,
          })
          .select()
          .single();
        if (invErr) throw invErr;
        financierInvoiceId = inv.id;

        const invItems = input.items.map((l, i) => ({
          invoice_id: inv.id,
          product_id: l.product_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: 23,
          total: l.quantity * l.unit_price,
          net_total: l.quantity * l.unit_price,
          tax_amount: l.quantity * l.unit_price * 0.23,
          gross_total: l.quantity * l.unit_price * 1.23,
          position: i,
          serial_numbers: l.serial_numbers,
        }));
        await supabase.from("invoice_items").insert(invItems);
      }

      // 7. Nota proforma ao cliente final
      let clientNoteId: string | null = null;
      if (input.emit_client_note) {
        const { data: cli } = await supabase
          .from("companies")
          .select("name, tax_id, address, email")
          .eq("id", input.end_client_company_id)
          .single();
        const { data: invNumber } = await supabase.rpc("generate_invoice_number", {
          p_workspace_id: wid,
        });
        const { data: note, error: noteErr } = await supabase
          .from("invoices")
          .insert({
            workspace_id: wid,
            invoice_number: invNumber as string,
            status: "draft",
            document_type: "proforma",
            client_name: cli?.name ?? "Cliente",
            client_email: cli?.email ?? null,
            client_tax_id: cli?.tax_id ?? null,
            client_address: cli?.address ?? null,
            company_id: input.end_client_company_id,
            issue_date: input.start_date,
            due_date: input.start_date,
            subtotal: total_financed,
            tax_rate: 23,
            tax_amount: total_financed * 0.23,
            total: total_financed * 1.23,
            currency: "EUR",
            rental_contract_id: contract.id,
            notes: `Documento informativo — pagamento via financiadora. Contrato ${contract_number}, ${input.duration_months} meses a ${input.monthly_amount.toFixed(2)} €/mês.`,
            created_by: userId,
          })
          .select()
          .single();
        if (noteErr) throw noteErr;
        clientNoteId = note.id;

        const noteItems = input.items.map((l, i) => ({
          invoice_id: note.id,
          product_id: l.product_id,
          description: l.description,
          quantity: l.quantity,
          unit_price: l.unit_price,
          tax_rate: 23,
          total: l.quantity * l.unit_price,
          net_total: l.quantity * l.unit_price,
          tax_amount: l.quantity * l.unit_price * 0.23,
          gross_total: l.quantity * l.unit_price * 1.23,
          position: i,
          serial_numbers: l.serial_numbers,
        }));
        await supabase.from("invoice_items").insert(noteItems);
      }

      // 8. Update contrato com IDs das faturas
      if (financierInvoiceId || clientNoteId) {
        await supabase
          .from("rental_contracts")
          .update({
            liquid_invoice_id: financierInvoiceId,
            client_note_id: clientNoteId,
          })
          .eq("id", contract.id);
      }

      // 9. Eventos do contrato
      await supabase.from("rental_contract_events").insert([
        { contract_id: contract.id, event_type: "created", actor_user_id: userId, payload: { contract_number } },
        ...(financierInvoiceId
          ? [{ contract_id: contract.id, event_type: "invoiced_financier", actor_user_id: userId, payload: { invoice_id: financierInvoiceId } }]
          : []),
        ...(clientNoteId
          ? [{ contract_id: contract.id, event_type: "note_issued_client", actor_user_id: userId, payload: { invoice_id: clientNoteId } }]
          : []),
      ]);

      return contract;
    },
    onSuccess: (contract) => {
      qc.invalidateQueries({ queryKey: ["rental-contracts"] });
      qc.invalidateQueries({ queryKey: ["equipment-units"] });
      qc.invalidateQueries({ queryKey: ["invoices"] });
      toast.success(`Contrato ${contract.contract_number} criado`);
    },
    onError: (err: Error) => toast.error(err.message || "Erro ao criar contrato"),
  });
}
