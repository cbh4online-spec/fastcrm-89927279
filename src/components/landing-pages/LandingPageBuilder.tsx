import { useState, useEffect } from "react";
import type { Json } from "@/integrations/supabase/types";
import { ArrowLeft, Sparkles, Eye, Save, Globe, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLandingPage, useUpdateLandingPage, usePublishLandingPage } from "@/hooks/useLandingPages";
import { useLandingPageCopy, CopyType } from "@/hooks/useLandingPageCopy";
import { LandingPagePreview } from "./LandingPagePreview";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Feature {
  title: string;
  description: string;
}

interface LandingPageBuilderProps {
  pageId: string;
  onBack: () => void;
}

export function LandingPageBuilder({ pageId, onBack }: LandingPageBuilderProps) {
  const { data: page, isLoading } = useLandingPage(pageId);
  const updatePage = useUpdateLandingPage();
  const publishPage = usePublishLandingPage();
  const { generateCopy, isLoading: isGenerating } = useLandingPageCopy();
  const { currentWorkspace } = useWorkspace();

  const [showPreview, setShowPreview] = useState(false);
  const [generatingField, setGeneratingField] = useState<CopyType | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    headline: "",
    subheadline: "",
    cta_text: "",
    cta_color: "#3b82f6",
    form_enabled: true,
    form_title: "",
    features: [] as Feature[],
  });

  const [businessContext, setBusinessContext] = useState({
    businessType: "",
    targetAudience: "",
    productName: "",
  });

  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        slug: page.slug,
        headline: page.headline || "",
        subheadline: page.subheadline || "",
        cta_text: page.cta_text || "Get Started",
        cta_color: page.cta_color || "#3b82f6",
        form_enabled: page.form_enabled ?? true,
        form_title: page.form_title || "Get in Touch",
        features: (Array.isArray(page.features) ? page.features : []) as unknown as Feature[],
      });
      setBusinessContext((prev) => ({
        ...prev,
        productName: page.title,
      }));
    }
  }, [page]);

  const handleSave = () => {
    updatePage.mutate({
      id: pageId,
      ...formData,
      features: formData.features as unknown as Json,
    });
  };

  const handlePublish = () => {
    publishPage.mutate({ id: pageId, publish: !page?.is_published });
  };

  const handleGenerateCopy = async (type: CopyType) => {
    setGeneratingField(type);
    const result = await generateCopy(type, {
      ...businessContext,
      existingCopy: type === "subheadline" ? formData.headline : undefined,
    });

    if (result) {
      if (type === "headline" && result.headline) {
        setFormData((prev) => ({ ...prev, headline: result.headline! }));
        toast.success("Headline generated! Review and edit as needed.");
      } else if (type === "subheadline" && result.subheadline) {
        setFormData((prev) => ({ ...prev, subheadline: result.subheadline! }));
        toast.success("Subheadline generated! Review and edit as needed.");
      } else if (type === "cta" && result.cta) {
        setFormData((prev) => ({ ...prev, cta_text: result.cta! }));
        toast.success("CTA generated! Review and edit as needed.");
      } else if (type === "features" && result.features) {
        setFormData((prev) => ({ ...prev, features: result.features! }));
        toast.success("Features generated! Review and edit as needed.");
      }
    }
    setGeneratingField(null);
  };

  const updateFeature = (index: number, field: keyof Feature, value: string) => {
    const newFeatures = [...formData.features];
    newFeatures[index] = { ...newFeatures[index], [field]: value };
    setFormData((prev) => ({ ...prev, features: newFeatures }));
  };

  const addFeature = () => {
    setFormData((prev) => ({
      ...prev,
      features: [...prev.features, { title: "", description: "" }],
    }));
  };

  const removeFeature = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (showPreview) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => setShowPreview(false)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Editor
          </Button>
        </div>
        <LandingPagePreview
          data={{
            ...formData,
            workspaceSlug: currentWorkspace?.slug || "",
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold">{formData.title}</h1>
            <p className="text-sm text-muted-foreground">/{formData.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => setShowPreview(true)}>
            <Eye className="h-4 w-4 mr-2" />
            Preview
          </Button>
          <Button variant="outline" onClick={handleSave} disabled={updatePage.isPending}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>
          <Button onClick={handlePublish} disabled={publishPage.isPending}>
            <Globe className="h-4 w-4 mr-2" />
            {page?.is_published ? "Unpublish" : "Publish"}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="content" className="space-y-4">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
          <TabsTrigger value="form">Lead Form</TabsTrigger>
          <TabsTrigger value="ai">AI Assistant</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="headline">Headline</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateCopy("headline")}
                    disabled={isGenerating}
                  >
                    {generatingField === "headline" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Generate
                  </Button>
                </div>
                <Input
                  id="headline"
                  placeholder="Transform Your Business Today"
                  value={formData.headline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, headline: e.target.value }))}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="subheadline">Subheadline</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleGenerateCopy("subheadline")}
                    disabled={isGenerating}
                  >
                    {generatingField === "subheadline" ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-1" />
                    ) : (
                      <Sparkles className="h-4 w-4 mr-1" />
                    )}
                    Generate
                  </Button>
                </div>
                <Textarea
                  id="subheadline"
                  placeholder="Join thousands of satisfied customers..."
                  value={formData.subheadline}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subheadline: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="cta">CTA Button Text</Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleGenerateCopy("cta")}
                      disabled={isGenerating}
                    >
                      {generatingField === "cta" ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Sparkles className="h-4 w-4 mr-1" />
                      )}
                      Generate
                    </Button>
                  </div>
                  <Input
                    id="cta"
                    placeholder="Get Started"
                    value={formData.cta_text}
                    onChange={(e) => setFormData((prev) => ({ ...prev, cta_text: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cta_color">CTA Color</Label>
                  <div className="flex gap-2">
                    <Input
                      id="cta_color"
                      type="color"
                      value={formData.cta_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cta_color: e.target.value }))}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.cta_color}
                      onChange={(e) => setFormData((prev) => ({ ...prev, cta_color: e.target.value }))}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Features</CardTitle>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleGenerateCopy("features")}
                  disabled={isGenerating}
                >
                  {generatingField === "features" ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-1" />
                  ) : (
                    <Sparkles className="h-4 w-4 mr-1" />
                  )}
                  Generate Features
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={addFeature}>
                  Add Feature
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {formData.features.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No features added yet. Add features or use AI to generate them.
                </p>
              ) : (
                formData.features.map((feature, index) => (
                  <div key={index} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <Label>Feature {index + 1}</Label>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFeature(index)}
                        className="text-destructive"
                      >
                        Remove
                      </Button>
                    </div>
                    <Input
                      placeholder="Feature Title"
                      value={feature.title}
                      onChange={(e) => updateFeature(index, "title", e.target.value)}
                    />
                    <Textarea
                      placeholder="Feature description..."
                      value={feature.description}
                      onChange={(e) => updateFeature(index, "description", e.target.value)}
                      rows={2}
                    />
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="form" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Lead Capture Form</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="form_enabled">Enable Form</Label>
                  <p className="text-sm text-muted-foreground">
                    Show a lead capture form on the landing page
                  </p>
                </div>
                <Switch
                  id="form_enabled"
                  checked={formData.form_enabled}
                  onCheckedChange={(checked) =>
                    setFormData((prev) => ({ ...prev, form_enabled: checked }))
                  }
                />
              </div>

              {formData.form_enabled && (
                <div className="space-y-2">
                  <Label htmlFor="form_title">Form Title</Label>
                  <Input
                    id="form_title"
                    placeholder="Get in Touch"
                    value={formData.form_title}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, form_title: e.target.value }))
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    Form submissions will create leads in your CRM automatically.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="ai" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                AI Copy Assistant
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Provide context about your business to generate better copy. All AI suggestions require your review before applying.
              </p>

              <div className="space-y-2">
                <Label htmlFor="businessType">Business Type</Label>
                <Input
                  id="businessType"
                  placeholder="e.g., SaaS, E-commerce, Consulting"
                  value={businessContext.businessType}
                  onChange={(e) =>
                    setBusinessContext((prev) => ({ ...prev, businessType: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="targetAudience">Target Audience</Label>
                <Input
                  id="targetAudience"
                  placeholder="e.g., Small business owners, Marketing teams"
                  value={businessContext.targetAudience}
                  onChange={(e) =>
                    setBusinessContext((prev) => ({ ...prev, targetAudience: e.target.value }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="productName">Product/Service Name</Label>
                <Input
                  id="productName"
                  placeholder="e.g., TaskMaster Pro"
                  value={businessContext.productName}
                  onChange={(e) =>
                    setBusinessContext((prev) => ({ ...prev, productName: e.target.value }))
                  }
                />
              </div>

              <div className="border-t pt-4 mt-4">
                <p className="text-sm font-medium mb-3">Quick Generate</p>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCopy("headline")}
                    disabled={isGenerating}
                  >
                    {generatingField === "headline" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Headline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCopy("subheadline")}
                    disabled={isGenerating}
                  >
                    {generatingField === "subheadline" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Subheadline
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCopy("cta")}
                    disabled={isGenerating}
                  >
                    {generatingField === "cta" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    CTA
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleGenerateCopy("features")}
                    disabled={isGenerating}
                  >
                    {generatingField === "features" && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Features
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
