import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2 } from "lucide-react";

interface Feature {
  title: string;
  description: string;
}

interface PreviewData {
  headline: string;
  subheadline: string;
  cta_text: string;
  cta_color: string;
  form_enabled: boolean;
  form_title: string;
  features: Feature[];
  workspaceSlug: string;
}

interface LandingPagePreviewProps {
  data: PreviewData;
  isPublic?: boolean;
  onFormSubmit?: (formData: { name: string; email: string; phone: string }) => Promise<void>;
}

export function LandingPagePreview({ data, isPublic, onFormSubmit }: LandingPagePreviewProps) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onFormSubmit) return;

    setIsSubmitting(true);
    try {
      await onFormSubmit(formData);
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
            {data.headline || "Your Compelling Headline Here"}
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            {data.subheadline || "Add a supporting subheadline that explains your value proposition."}
          </p>
          <Button
            size="lg"
            className="text-lg px-8 py-6"
            style={{ backgroundColor: data.cta_color }}
            onClick={() => {
              const formSection = document.getElementById("lead-form");
              formSection?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            {data.cta_text || "Get Started"}
          </Button>
        </div>
      </section>

      {/* Features Section */}
      {data.features.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {data.features.map((feature, index) => (
                <div
                  key={index}
                  className="bg-background rounded-lg p-6 shadow-sm border"
                >
                  <div
                    className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center"
                    style={{ backgroundColor: `${data.cta_color}20` }}
                  >
                    <CheckCircle2
                      className="h-6 w-6"
                      style={{ color: data.cta_color }}
                    />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">
                    {feature.title || `Feature ${index + 1}`}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description || "Feature description goes here."}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Lead Form Section */}
      {data.form_enabled && (
        <section id="lead-form" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-background rounded-xl p-8 shadow-lg border">
              <h2 className="text-2xl font-bold text-center mb-6">
                {data.form_title || "Get in Touch"}
              </h2>

              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle2
                    className="h-16 w-16 mx-auto mb-4"
                    style={{ color: data.cta_color }}
                  />
                  <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                  <p className="text-muted-foreground">
                    We've received your information and will be in touch soon.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="Your name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, email: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="Your phone number"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, phone: e.target.value }))
                      }
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full"
                    style={{ backgroundColor: data.cta_color }}
                    disabled={isSubmitting || !isPublic}
                  >
                    {isSubmitting ? "Submitting..." : data.cta_text || "Submit"}
                  </Button>
                  {!isPublic && (
                    <p className="text-xs text-center text-muted-foreground">
                      Form submission is disabled in preview mode
                    </p>
                  )}
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}
