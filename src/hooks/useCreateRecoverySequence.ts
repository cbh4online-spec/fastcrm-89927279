import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

const sb = supabase as any;

const STEPS = [
  {
    step_order: 1,
    delay_hours: 1,
    delay_days: 0,
    subject: "{{contact_name}}, esqueceu-se de algo?",
    body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <p>Olá <strong>{{contact_name}}</strong>,</p>
  <p>Reparámos que deixou alguns artigos no seu carrinho. Acontece aos melhores!</p>
  <p>O seu carrinho tem um total de <strong>{{cart_total}}</strong> à sua espera.</p>
  <p style="margin:24px 0">
    <a href="{{recovery_link}}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Recuperar o meu carrinho
    </a>
  </p>
  <p>Se tiver alguma dúvida, estamos cá para ajudar.</p>
  <p>Cumprimentos,<br/>A equipa</p>
</div>`,
  },
  {
    step_order: 2,
    delay_hours: 0,
    delay_days: 1,
    subject: "O seu carrinho ainda espera por si",
    body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <p>Olá <strong>{{contact_name}}</strong>,</p>
  <p>O seu carrinho continua reservado com um total de <strong>{{cart_total}}</strong>.</p>
  <p>Não queremos que perca os artigos que escolheu. Complete a sua compra agora:</p>
  <p style="margin:24px 0">
    <a href="{{recovery_link}}" style="background:#2563eb;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Finalizar compra
    </a>
  </p>
  <p>Precisa de ajuda? Responda a este email e teremos todo o gosto em ajudar.</p>
  <p>Cumprimentos,<br/>A equipa</p>
</div>`,
  },
  {
    step_order: 3,
    delay_hours: 0,
    delay_days: 3,
    subject: "Última oportunidade — {{cart_total}} à sua espera",
    body: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto">
  <p>Olá <strong>{{contact_name}}</strong>,</p>
  <p>Esta é a nossa última mensagem sobre o seu carrinho de <strong>{{cart_total}}</strong>.</p>
  <p>Os artigos que selecionou podem esgotar em breve. Aproveite enquanto ainda estão disponíveis:</p>
  <p style="margin:24px 0">
    <a href="{{recovery_link}}" style="background:#dc2626;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600">
      Completar agora
    </a>
  </p>
  <p>Se já não pretende estes artigos, pode ignorar este email.</p>
  <p>Cumprimentos,<br/>A equipa</p>
</div>`,
  },
];

export function useCreateRecoverySequence() {
  const { currentWorkspace } = useWorkspace();
  const wid = currentWorkspace?.id;
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (): Promise<string> => {
      if (!wid) throw new Error("No workspace");

      // 1. Create sequence
      const { data: seq, error: seqErr } = await sb
        .from("email_sequences")
        .insert({
          workspace_id: wid,
          name: "Recuperação de Carrinho",
          description: "Sequência automática de 3 emails para recuperação de carrinhos abandonados (1h, 24h, 72h)",
          sequence_type: "recovery",
          is_active: true,
          tags: ["recovery", "cart"],
        })
        .select("id")
        .single();
      if (seqErr) throw seqErr;

      // 2. Create steps
      const stepsPayload = STEPS.map((s) => ({
        workspace_id: wid,
        sequence_id: seq.id,
        step_order: s.step_order,
        step_type: "email",
        delay_hours: s.delay_hours,
        delay_days: s.delay_days,
        subject: s.subject,
        body: s.body,
        is_active: true,
      }));

      const { error: stepsErr } = await sb
        .from("email_sequence_steps")
        .insert(stepsPayload);
      if (stepsErr) throw stepsErr;

      return seq.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-sequences"] });
      toast.success("Sequência de recuperação criada com 3 steps");
    },
    onError: (e: any) => toast.error("Erro ao criar sequência: " + e.message),
  });
}
