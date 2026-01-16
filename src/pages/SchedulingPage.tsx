import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { SchedulingHub } from '@/components/scheduling/SchedulingHub';

export default function SchedulingPage() {
  return (
    <DashboardLayout>
      <SchedulingHub />
    </DashboardLayout>
  );
}
