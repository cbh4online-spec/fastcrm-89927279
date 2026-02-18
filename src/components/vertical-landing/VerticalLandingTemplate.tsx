import { VerticalStickyHeader } from "./VerticalStickyHeader";
import { VerticalHero } from "./VerticalHero";
import { VerticalProblems } from "./VerticalProblems";
import { VerticalSolution } from "./VerticalSolution";
import { VerticalTransformation } from "./VerticalTransformation";
import { VerticalAuthority } from "./VerticalAuthority";
import { VerticalROI } from "./VerticalROI";
import { VerticalCTAForm } from "./VerticalCTAForm";
import { VerticalFooter } from "./VerticalFooter";
import { VerticalLandingTracker } from "./VerticalLandingTracker";
import { VerticalFloatingCTA } from "./VerticalFloatingCTA";
import type { VerticalConfig } from "@/config/verticalConfigs";

interface Props {
  config: VerticalConfig;
  templateId?: string;
  workspaceId?: string;
}

export function VerticalLandingTemplate({ config, templateId, workspaceId }: Props) {
  return (
    <div className="min-h-screen bg-[hsl(222,47%,4%)] text-[hsl(210,40%,98%)] overflow-x-hidden w-full">
      <VerticalLandingTracker slug={config.slug} templateId={templateId} workspaceId={workspaceId} />
      <VerticalStickyHeader config={config} />
      <main>
        <VerticalHero config={config} />
        <VerticalProblems config={config} />
        <VerticalSolution config={config} />
        <VerticalTransformation config={config} />
        <VerticalAuthority />
        <VerticalROI config={config} />
        <VerticalCTAForm config={config} />
      </main>
      <VerticalFooter config={config} />
      <VerticalFloatingCTA config={config} />
    </div>
  );
}
