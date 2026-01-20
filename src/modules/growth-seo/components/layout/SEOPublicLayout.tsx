import { ReactNode } from 'react';
import { SEOHeader } from './SEOHeader';
import { SEOFooter } from './SEOFooter';
import { GDPRBanner } from '../consent/GDPRBanner';

interface SEOPublicLayoutProps {
  children: ReactNode;
}

export function SEOPublicLayout({ children }: SEOPublicLayoutProps) {
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
