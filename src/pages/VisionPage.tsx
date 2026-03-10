import { ModuleGuard } from "@/components/guards/ModuleGuard";
import { VisionDashboard } from "@/components/vision/VisionDashboard";

export default function VisionPage() {
  return (
    <ModuleGuard moduleSlug="metodo-vision" moduleName="Método Vision">
      <VisionDashboard />
    </ModuleGuard>
  );
}
