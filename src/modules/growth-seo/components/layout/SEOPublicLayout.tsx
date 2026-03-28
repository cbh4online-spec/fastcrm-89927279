import { ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { SEOHeader } from './SEOHeader';
import { SEOFooter } from './SEOFooter';
import { GDPRBanner } from '../consent/GDPRBanner';
import { useSeoUxTracker } from '@/hooks/useSeoUxTracker';

interface SEOPublicLayoutProps {
  children: ReactNode;
}

function getPageTypeFromPath(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  return segments[0] || 'home';
}

export function SEOPublicLayout({ children }: SEOPublicLayoutProps) {
  const location = useLocation();
  const pageType = getPageTypeFromPath(location.pathname);

  // Activate UX tracking for all public SEO pages
  useSeoUxTracker({
    pageType,
    enabled: true,
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <SEOHeader />
      <main className="flex-1">
        {children}
      </main>
      <SEOFooter />
      <GDPRBanner />
    </div>
  );
}
