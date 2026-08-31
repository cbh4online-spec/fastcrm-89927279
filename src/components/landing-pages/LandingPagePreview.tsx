import { useState } from "react";
import { WhatsAppConsentCheckbox } from "@/components/whatsapp-pro/WhatsAppConsentCheckbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import type { BuilderBlock, BuilderBlockType } from "@/lib/figmaSectionMapper";

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
  sections?: BuilderBlock[];
  isPublic?: boolean;
  onFormSubmit?: (formData: { name: string; email: string; phone: string; whatsappConsent: boolean }) => Promise<void>;
}

export function LandingPagePreview({ data, sections, isPublic, onFormSubmit }: LandingPagePreviewProps) {
  const hasSections = sections && sections.length > 0;

  if (hasSections) {
    return (
      <div className="min-h-screen bg-background">
        {sections.map((sec) => (
          <SectionPreview key={sec.id} section={sec} ctaColor={data.cta_color} />
        ))}
        <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} All rights reserved.</p>
        </footer>
      </div>
    );
  }

  // Flat preview (backward compat)
  return <FlatPreview data={data} isPublic={isPublic} onFormSubmit={onFormSubmit} />;
}

function SectionPreview({ section, ctaColor }: { section: BuilderBlock; ctaColor: string }) {
  const c = section.content as Record<string, unknown>;
  const bt = section.block_type as BuilderBlockType;

  switch (bt) {
    case "hero":
      return (
        <section className="relative py-20 px-4 sm:px-6 lg:px-8">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              {(c.headline as string) || "Your Headline Here"}
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              {(c.subheadline as string) || ""}
            </p>
            {(c.primary_cta as Record<string, string>)?.label && (
              <Button size="lg" className="text-lg px-8 py-6" style={{ backgroundColor: ctaColor }}>
                {(c.primary_cta as Record<string, string>).label}
              </Button>
            )}
          </div>
        </section>
      );
    case "features_grid":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{(c.title as string) || "Features"}</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {((c.items as Array<Record<string, string>>) || []).map((item, i) => (
                <div key={i} className="bg-background rounded-lg p-6 shadow-sm border">
                  <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: `${ctaColor}20` }}>
                    <CheckCircle2 className="h-6 w-6" style={{ color: ctaColor }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{item.title || `Feature ${i + 1}`}</h3>
                  <p className="text-muted-foreground">{item.description || ""}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "cta_banner":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8" style={{ backgroundColor: `${ctaColor}10` }}>
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">{(c.headline as string) || ""}</h2>
            <p className="text-lg text-muted-foreground mb-8">{(c.supporting_text as string) || ""}</p>
            <Button size="lg" style={{ backgroundColor: ctaColor }}>{(c.button_label as string) || "Learn More"}</Button>
          </div>
        </section>
      );
    case "testimonials":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{(c.title as string) || "Testimonials"}</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {((c.items as Array<Record<string, string>>) || []).map((item, i) => (
                <div key={i} className="bg-muted/30 rounded-lg p-6 border">
                  <p className="text-muted-foreground italic mb-4">"{item.quote || ""}"</p>
                  <div className="font-semibold">{item.name || ""}</div>
                  {item.role && <div className="text-sm text-muted-foreground">{item.role}</div>}
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "faq_accordion": {
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{(c.title as string) || "FAQ"}</h2>
            <div className="space-y-4">
              {((c.items as Array<Record<string, string>>) || []).map((item, i) => (
                <FAQItem key={i} question={item.question} answer={item.answer} />
              ))}
            </div>
          </div>
        </section>
      );
    }
    case "pricing_cards":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">{(c.title as string) || "Pricing"}</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {((c.plans as Array<Record<string, unknown>>) || []).map((plan, i) => (
                <div key={i} className="bg-background rounded-lg p-6 shadow-sm border text-center">
                  <h3 className="text-xl font-semibold mb-2">{(plan.name as string) || `Plan ${i + 1}`}</h3>
                  <div className="text-3xl font-bold mb-4">{(plan.price as string) || ""}</div>
                  <Button className="w-full" style={{ backgroundColor: ctaColor }}>{(plan.cta as string) || "Select"}</Button>
                </div>
              ))}
            </div>
          </div>
        </section>
      );
    case "lead_form":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-background rounded-xl p-8 shadow-lg border">
              <h2 className="text-2xl font-bold text-center mb-4">{(c.title as string) || "Get in Touch"}</h2>
              {(c.description as string) && <p className="text-muted-foreground text-center mb-6">{c.description as string}</p>}
              <div className="space-y-4">
                {((c.form_fields as string[]) || ["name", "email"]).map((field) => (
                  <div key={field} className="space-y-1">
                    <Label className="capitalize">{field}</Label>
                    <Input placeholder={field} disabled />
                  </div>
                ))}
                <Button className="w-full" style={{ backgroundColor: ctaColor }}>{(c.cta as string) || "Submit"}</Button>
              </div>
            </div>
          </div>
        </section>
      );
    case "split_content":
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-4">{(c.headline as string) || ""}</h2>
              <p className="text-muted-foreground mb-6">{(c.body as string) || ""}</p>
              {(c.cta as Record<string, string>)?.label && (
                <Button style={{ backgroundColor: ctaColor }}>{(c.cta as Record<string, string>).label}</Button>
              )}
            </div>
            <div className="bg-muted rounded-lg aspect-video flex items-center justify-center text-muted-foreground">
              {(c.media as string) ? <img src={c.media as string} alt="" className="rounded-lg object-cover w-full h-full" /> : "Media"}
            </div>
          </div>
        </section>
      );
    case "rich_text":
    default:
      return (
        <section className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mx-auto">
            {(c.title as string) && <h2 className="text-3xl font-bold mb-4">{c.title as string}</h2>}
            {(c.body as string) && <p className="text-muted-foreground whitespace-pre-wrap">{c.body as string}</p>}
          </div>
        </section>
      );
  }
}

function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border rounded-lg">
      <button className="w-full flex items-center justify-between p-4 text-left font-medium" onClick={() => setOpen(!open)}>
        {question || "Question?"}
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && <div className="px-4 pb-4 text-muted-foreground">{answer || ""}</div>}
    </div>
  );
}

function FlatPreview({ data, isPublic, onFormSubmit }: { data: PreviewData; isPublic?: boolean; onFormSubmit?: (formData: { name: string; email: string; phone: string; whatsappConsent: boolean }) => Promise<void> }) {
  const [formData, setFormData] = useState({ name: "", email: "", phone: "" });
  const [whatsappConsent, setWhatsappConsent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onFormSubmit) return;
    setIsSubmitting(true);
    try {
      await onFormSubmit({ ...formData, whatsappConsent });
      setIsSubmitted(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
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
            onClick={() => document.getElementById("lead-form")?.scrollIntoView({ behavior: "smooth" })}
          >
            {data.cta_text || "Get Started"}
          </Button>
        </div>
      </section>

      {data.features.length > 0 && (
        <section className="py-16 px-4 sm:px-6 lg:px-8 bg-muted/50">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
              {data.features.map((feature, index) => (
                <div key={index} className="bg-background rounded-lg p-6 shadow-sm border">
                  <div className="w-12 h-12 rounded-lg mb-4 flex items-center justify-center" style={{ backgroundColor: `${data.cta_color}20` }}>
                    <CheckCircle2 className="h-6 w-6" style={{ color: data.cta_color }} />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title || `Feature ${index + 1}`}</h3>
                  <p className="text-muted-foreground">{feature.description || "Feature description goes here."}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {data.form_enabled && (
        <section id="lead-form" className="py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-md mx-auto">
            <div className="bg-background rounded-xl p-8 shadow-lg border">
              <h2 className="text-2xl font-bold text-center mb-6">{data.form_title || "Get in Touch"}</h2>
              {isSubmitted ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-16 w-16 mx-auto mb-4" style={{ color: data.cta_color }} />
                  <h3 className="text-xl font-semibold mb-2">Thank You!</h3>
                  <p className="text-muted-foreground">We've received your information and will be in touch soon.</p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" placeholder="Your name" value={formData.name} onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" placeholder="your@email.com" value={formData.email} onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone (optional)</Label>
                    <Input id="phone" type="tel" placeholder="Your phone number" value={formData.phone} onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))} />
                  </div>
                  {formData.phone.trim().length > 0 && (
                    <WhatsAppConsentCheckbox checked={whatsappConsent} onCheckedChange={setWhatsappConsent} id="lp-whatsapp-consent" />
                  )}
                  <Button type="submit" className="w-full" style={{ backgroundColor: data.cta_color }} disabled={isSubmitting || !isPublic}>
                    {isSubmitting ? "Submitting..." : data.cta_text || "Submit"}
                  </Button>
                  {!isPublic && <p className="text-xs text-center text-muted-foreground">Form submission is disabled in preview mode</p>}
                </form>
              )}
            </div>
          </div>
        </section>
      )}

      <footer className="py-8 px-4 border-t text-center text-sm text-muted-foreground">
        <p>© {new Date().getFullYear()} All rights reserved.</p>
      </footer>
    </div>
  );
}
