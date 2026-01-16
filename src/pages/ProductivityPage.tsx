import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { ProductivityDashboard } from '@/components/productivity/ProductivityDashboard';

export default function ProductivityPage() {
  return (
    <DashboardLayout>
      <ProductivityDashboard />
    </DashboardLayout>
  );
}
