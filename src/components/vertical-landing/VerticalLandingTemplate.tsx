import { VerticalStickyHeader } from "./VerticalStickyHeader";
import { VerticalHero } from "./VerticalHero";
import { VerticalProblems } from "./VerticalProblems";
import { VerticalSolution } from "./VerticalSolution";
import { VerticalTransformation } from "./VerticalTransformation";
import { VerticalAuthority } from "./VerticalAuthority";
import { VerticalROI } from "./VerticalROI";
import { VerticalTestimonials } from "./VerticalTestimonials";
import { VerticalVideo } from "./VerticalVideo";
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
        <div data-section="hero"><VerticalHero config={config} /></div>
        <div data-section="problems"><VerticalProblems config={config} /></div>
        <div data-section="solution"><VerticalSolution config={config} /></div>
        <div data-section="transformation"><VerticalTransformation config={config} /></div>
        <div data-section="testimonials"><VerticalTestimonials config={config} /></div>
        <div data-section="video"><VerticalVideo config={config} /></div>
        <div data-section="authority"><VerticalAuthority /></div>
        <div data-section="roi"><VerticalROI config={config} /></div>
        <div data-section="cta-form"><VerticalCTAForm config={config} /></div>
      </main>
      <VerticalFooter config={config} />
      <VerticalFloatingCTA config={config} />
    </div>
  );
}
