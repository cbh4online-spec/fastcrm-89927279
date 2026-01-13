import { useParams } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { LandingPagePreview } from "@/components/landing-pages/LandingPagePreview";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

interface Feature {
  title: string;
  description: string;
}

interface LandingPageData {
  id: string;
  workspace_id: string;
  headline: string | null;
  subheadline: string | null;
  cta_text: string | null;
  cta_color: string | null;
  form_enabled: boolean | null;
  form_title: string | null;
  features: Json;
}

export default function PublicLandingPage() {
  const { workspaceSlug, pageSlug } = useParams<{
    workspaceSlug: string;
    pageSlug: string;
  }>();

  const { data: page, isLoading, error } = useQuery({
    queryKey: ["public-landing-page", workspaceSlug, pageSlug],
    queryFn: async () => {
      // First get workspace by slug
      const { data: workspace, error: workspaceError } = await supabase
        .from("workspaces")
        .select("id")
        .eq("slug", workspaceSlug)
        .single();

      if (workspaceError || !workspace) {
        throw new Error("Workspace not found");
      }

      // Then get the landing page
      const { data: landingPage, error: pageError } = await supabase
        .from("landing_pages")
        .select("*")
        .eq("workspace_id", workspace.id)
        .eq("slug", pageSlug)
        .eq("is_published", true)
        .single();

      if (pageError || !landingPage) {
        throw new Error("Page not found");
      }

      return { ...landingPage, workspace_id: workspace.id } as LandingPageData;
    },
    enabled: !!workspaceSlug && !!pageSlug,
  });

  const createLead = useMutation({
    mutationFn: async (formData: { name: string; email: string; phone: string }) => {
      if (!page) throw new Error("Page not loaded");

      // Create lead via edge function to bypass RLS
      const { data, error } = await supabase.functions.invoke("create-public-lead", {
        body: {
          workspace_id: page.workspace_id,
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          source: `Landing Page: ${pageSlug}`,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Thank you! We'll be in touch soon.");
    },
    onError: (error) => {
      toast.error("Failed to submit. Please try again.");
      console.error("Lead submission error:", error);
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !page) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <h1 className="text-2xl font-bold mb-2">Page Not Found</h1>
        <p className="text-muted-foreground">
          This landing page doesn't exist or is not published.
        </p>
      </div>
    );
  }

  return (
    <LandingPagePreview
      data={{
        headline: page.headline || "",
        subheadline: page.subheadline || "",
        cta_text: page.cta_text || "Get Started",
        cta_color: page.cta_color || "#3b82f6",
        form_enabled: page.form_enabled ?? true,
        form_title: page.form_title || "Get in Touch",
        features: (Array.isArray(page.features) ? page.features : []) as unknown as Feature[],
        workspaceSlug: workspaceSlug || "",
      }}
      isPublic
      onFormSubmit={async (formData) => {
        await createLead.mutateAsync(formData);
      }}
    />
  );
}
