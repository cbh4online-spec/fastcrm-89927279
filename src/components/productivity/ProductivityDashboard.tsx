import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Brain, Target, CalendarClock } from 'lucide-react';
import { DailyCoachPanel } from '@/components/productivity/DailyCoachPanel';
import { GoalsManager } from '@/components/productivity/GoalsManager';

export function ProductivityDashboard() {
  return (
    <div className="h-full flex flex-col">
      <Tabs defaultValue="coach" className="flex-1 flex flex-col">
        <div className="border-b px-6 pt-4">
          <TabsList>
            <TabsTrigger value="coach" className="gap-2">
              <Brain className="h-4 w-4" />
              Coach Diário
            </TabsTrigger>
            <TabsTrigger value="goals" className="gap-2">
              <Target className="h-4 w-4" />
              Metas
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <TabsContent value="coach" className="mt-0 h-full">
            <DailyCoachPanel />
          </TabsContent>
          <TabsContent value="goals" className="mt-0 h-full">
            <GoalsManager />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
