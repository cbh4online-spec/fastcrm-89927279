import { useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { PitchEditor } from '@/components/pitch/PitchEditor';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { OwnerOnlyRoute } from '@/components/auth/OwnerOnlyRoute';
import { Smartphone } from 'lucide-react';

export default function PitchPage() {
  const isMobile = useIsMobile();

  useEffect(() => {
    document.title = 'Apresentação Comercial — FastCRM';
  }, []);

  if (isMobile) {
    return (
      <DashboardLayout>
        <OwnerOnlyRoute>
          <div className="flex flex-col items-center justify-center text-center p-10 min-h-[70vh]">
            <Smartphone className="h-12 w-12 text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Melhor em desktop</h1>
            <p className="text-muted-foreground max-w-sm">
              A apresentação comercial foi pensada para ser editada e mostrada em ecrã grande. Abre esta página num portátil ou desktop.
            </p>
          </div>
        </OwnerOnlyRoute>
      </DashboardLayout>
    );
  }
  return (
    <DashboardLayout>
      <OwnerOnlyRoute>
        <div className="h-[calc(100vh-8rem)] min-h-[680px] overflow-hidden rounded-xl border bg-muted/30">
          <PitchEditor />
        </div>
      </OwnerOnlyRoute>
    </DashboardLayout>
  );
}
