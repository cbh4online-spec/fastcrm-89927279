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
