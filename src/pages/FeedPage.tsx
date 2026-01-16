import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { FeedDashboard } from '@/components/feed/FeedDashboard';

export default function FeedPage() {
  return (
    <DashboardLayout>
      <FeedDashboard />
    </DashboardLayout>
  );
}
