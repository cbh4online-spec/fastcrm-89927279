import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ProposalCopyContext {
  contactName?: string;
  companyName?: string;
  dealValue?: number;
  dealTitle?: string;
  channel?: string;
  existingContent?: string;
  offerDescription?: string;
}

export interface IntroSection {
  title: string;
  body: string;
}

export interface OfferSection {
  title: string;
  description: string;
  features: string[];
}

export interface BenefitsSection {
  title: string;
  items: { title: string; description: string }[];
}

export interface CTASection {
  text: string;
  urgencyText?: string;
}

export interface TestimonialSection {
  quote: string;
  author: string;
  role: string;
}

export interface GeneratedProposalCopy {
  intro?: IntroSection;
  offer?: OfferSection;
  benefits?: BenefitsSection;
  cta?: CTASection;
  testimonial?: TestimonialSection;
}

export interface AdaptedText {
  adaptedText: string;
  changes: string;
}

export type ProposalTone = "formal" | "comercial" | "casual" | "curto";
export type ProposalSection = "intro" | "offer" | "benefits" | "pricing" | "cta" | "testimonial";

export function useGenerateProposalCopy() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateCopy = useCallback(
    async (
      context: ProposalCopyContext,
      tone?: ProposalTone,
      sections?: ProposalSection[]
    ): Promise<GeneratedProposalCopy | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-proposal-copy",
          {
            body: {
              action: "generate_copy",
              context,
              tone: tone || "comercial",
              sections: sections || ["intro", "offer", "benefits", "cta"],
            },
          }
        );

        if (fnError) throw new Error(fnError.message);

        if (data?.error) {
          toast.error(data.error);
          setError(data.error);
          return null;
        }

        return data?.result as GeneratedProposalCopy;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao gerar conteúdo";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const adaptTone = useCallback(
    async (
      existingContent: string,
      tone: ProposalTone
    ): Promise<AdaptedText | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-proposal-copy",
          {
            body: {
              action: "adapt_tone",
              context: { existingContent },
              tone,
            },
          }
        );

        if (fnError) throw new Error(fnError.message);

        if (data?.error) {
          toast.error(data.error);
          setError(data.error);
          return null;
        }

        return data?.result as AdaptedText;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao adaptar tom";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const expandText = useCallback(
    async (existingContent: string): Promise<AdaptedText | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-proposal-copy",
          {
            body: {
              action: "expand",
              context: { existingContent },
            },
          }
        );

        if (fnError) throw new Error(fnError.message);

        if (data?.error) {
          toast.error(data.error);
          setError(data.error);
          return null;
        }

        return data?.result as AdaptedText;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao expandir texto";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const shortenText = useCallback(
    async (existingContent: string): Promise<AdaptedText | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "generate-proposal-copy",
          {
            body: {
              action: "shorten",
              context: { existingContent },
            },
          }
        );

        if (fnError) throw new Error(fnError.message);

        if (data?.error) {
          toast.error(data.error);
          setError(data.error);
          return null;
        }

        return data?.result as AdaptedText;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erro ao encurtar texto";
        setError(message);
        toast.error(message);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    isLoading,
    error,
    generateCopy,
    adaptTone,
    expandText,
    shortenText,
  };
}
