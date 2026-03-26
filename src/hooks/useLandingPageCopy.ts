import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CopyType = "headline" | "subheadline" | "cta" | "features" | "testimonial";

interface GeneratedCopy {
  headline?: string;
  subheadline?: string;
  cta?: string;
  features?: Array<{ title: string; description: string }>;
  testimonial?: { quote: string; author: string; role: string };
}

export function useLandingPageCopy() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCopy = async (
    type: CopyType,
    context: {
      businessType?: string;
      targetAudience?: string;
      productName?: string;
      existingCopy?: string;
    }
  ): Promise<GeneratedCopy | null> => {
    setIsLoading(true);
    setError(null);

    try {
      // Consume credit for AI copy generation
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Try to get workspace from context - fire and forget credit consumption
        const { data: creditResult } = await (supabase as any).rpc("consume_funnel_credits", {
          p_workspace_id: (context as any).workspaceId || null,
          p_user_id: user.id,
          p_action_key: "funnel_ai_copy",
          p_idempotency_key: null,
          p_reference_type: "landing_page",
          p_reference_id: null,
          p_metadata: {},
        });
        const cr = (creditResult as any)?.[0];
        if (cr && !cr.success) {
          throw new Error(cr.message || "Créditos insuficientes");
        }
      }

      const { data, error: fnError } = await supabase.functions.invoke("landing-page-copy", {
        body: { type, context },
      });

      if (fnError) {
        if (fnError.message?.includes("429")) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }
        if (fnError.message?.includes("402")) {
          throw new Error("AI credits exhausted. Please add more credits.");
        }
        throw fnError;
      }

      return data as GeneratedCopy;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to generate copy";
      setError(message);
      toast.error(message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    error,
    generateCopy,
  };
}
