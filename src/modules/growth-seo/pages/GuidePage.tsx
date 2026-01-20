import { useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { SEOPublicLayout } from '../components/layout/SEOPublicLayout';
import { SEOHead, generateBreadcrumbs } from '../components/seo/SEOHead';
import { Breadcrumbs } from '../components/seo/Breadcrumbs';
import { ContentSections } from '../components/shared/ContentSections';
import { FAQSection } from '../components/pages/shared/FAQSection';
import { CTASection } from '../components/pages/shared/CTASection';
import { PageSkeleton } from '../components/shared/PageSkeleton';
import { useSEOEntity } from '../hooks/useSEOEntity';
import { useTracking } from '../hooks/useTracking';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import NotFound from '@/pages/NotFound';

export default function GuidePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: entity, isLoading } = useSEOEntity('guide', slug || '');
  const { trackPageView } = useTracking();
  const [activeSection, setActiveSection] = useState<string | null>(null);

  useEffect(() => {
    if (entity) {
      trackPageView({
        page_type: 'guide',
        entity_slug: slug,
        intent: entity.intent || undefined,
      });
    }
  }, [entity, slug]);

  // Track active section on scroll
  useEffect(() => {
    if (!entity?.content?.sections) return;

    const handleScroll = () => {
      const sections = entity.content?.sections || [];
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(`section-${sections[i].id}`);
        if (el && el.getBoundingClientRect().top <= 100) {
          setActiveSection(sections[i].id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [entity]);

  if (isLoading) {
    return (
      <SEOPublicLayout>
        <PageSkeleton variant="detail" />
      </SEOPublicLayout>
    );
  }

  if (!entity) {
    return <NotFound />;
  }

  const breadcrumbs = generateBreadcrumbs(entity);
  const sections = entity.content?.sections || [];

  return (
    <SEOPublicLayout>
      <SEOHead entity={entity} breadcrumbs={breadcrumbs} />
      
      <div className="container py-8">
        <Breadcrumbs items={breadcrumbs} />

        <div className="grid lg:grid-cols-[250px_1fr_250px] gap-8 mt-6">
          {/* Table of Contents */}
          <aside className="hidden lg:block">
            <Card className="sticky top-24">
              <CardContent className="p-4">
                <h3 className="font-semibold mb-4">Índice</h3>
                <nav className="space-y-2">
                  {sections.map((section, index) => (
                    <a
                      key={section.id}
                      href={`#section-${section.id}`}
                      className={`flex items-center gap-2 text-sm py-1 px-2 rounded transition-colors ${
                        activeSection === section.id
                          ? 'bg-primary/10 text-primary font-medium'
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                        {index + 1}
                      </span>
                      <span className="line-clamp-1">{section.heading}</span>
                    </a>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <article>
            <h1 className="text-3xl font-bold mb-4">{entity.h1 || entity.title}</h1>

            {entity.tldr && (
              <div className="bg-muted/50 border rounded-lg p-4 mb-8">
                <p className="text-lg text-muted-foreground">{entity.tldr}</p>
              </div>
            )}

            <div className="space-y-12">
              {sections.map((section, index) => (
                <section key={section.id} id={`section-${section.id}`} className="scroll-mt-24">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <h2 className="text-xl font-semibold">{section.heading}</h2>
                  </div>

                  {section.type === 'text' && (
                    <div
                      className="text-muted-foreground leading-relaxed pl-11"
                      dangerouslySetInnerHTML={{ __html: section.content }}
                    />
                  )}

                  {section.type === 'steps' && section.items && (
                    <div className="pl-11 space-y-3">
                      {section.items.map((item, i) => (
                        <div key={i} className="flex items-start gap-3">
                          <Check className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-muted-foreground">{item}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.type === 'list' && section.items && (
                    <ul className="pl-11 space-y-2">
                      {section.items.map((item, i) => (
                        <li key={i} className="text-muted-foreground list-disc list-inside">
                          {item}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </div>

            {entity.content?.faqs && entity.content.faqs.length > 0 && (
              <div className="mt-12">
                <FAQSection faqs={entity.content.faqs} />
              </div>
            )}

            <div className="mt-12">
              <CTASection
                cta={entity.content?.cta}
                pageType="guide"
                entitySlug={slug}
              />
            </div>
          </article>

          {/* Sidebar */}
          <aside className="space-y-6">
            <CTASection variant="sidebar" pageType="guide" entitySlug={slug} />
          </aside>
        </div>
      </div>
    </SEOPublicLayout>
  );
}
