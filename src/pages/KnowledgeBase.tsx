import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { KnowledgeBaseModule } from '@/components/knowledge-base/KnowledgeBaseModule';

export default function KnowledgeBase() {
  return (
    <DashboardLayout>
      <KnowledgeBaseModule />
    </DashboardLayout>
  );
}
