import { useIntelligentOnboarding, BUSINESS_TO_PROFILE_MAP } from "@/hooks/useIntelligentOnboarding";
import { BusinessTypeStep } from "./steps/BusinessTypeStep";
import { ActivityProfileStep } from "./steps/ActivityProfileStep";
import { SuccessDefinitionStep } from "./steps/SuccessDefinitionStep";
import { ProcessDescriptionStep } from "./steps/ProcessDescriptionStep";
import { ChannelsStep } from "./steps/ChannelsStep";
import { GeneratingStep } from "./steps/GeneratingStep";
import { PreviewStep } from "./steps/PreviewStep";
import { ApplyingStep } from "./steps/ApplyingStep";
import { CompleteStep } from "./steps/CompleteStep";
import { Progress } from "@/components/ui/progress";
import { Sparkles } from "lucide-react";
import { ActivityProfileType } from "@/types/activityProfile";

interface IntelligentOnboardingProps {
  workspaceName: string;
  onComplete: () => void;
  onSkip: () => void;
}

export function IntelligentOnboarding({ workspaceName, onComplete, onSkip }: IntelligentOnboardingProps) {
  const onboarding = useIntelligentOnboarding();

  // Get suggested profile based on business type
  const getSuggestedProfile = (): ActivityProfileType | undefined => {
    const businessType = onboarding.answers.businessType?.toLowerCase() || "";
    const customType = onboarding.answers.customBusinessType?.toLowerCase() || "";
    
    for (const [keyword, profile] of Object.entries(BUSINESS_TO_PROFILE_MAP)) {
      if (businessType.includes(keyword) || customType.includes(keyword)) {
        return profile;
      }
    }
    return "generico";
  };

  const getProgress = () => {
    const progressMap = {
      business: 12,
      activity_profile: 25,
      success: 40,
      process: 55,
      channels: 70,
      generating: 80,
      preview: 90,
      applying: 95,
      complete: 100,
    };
    return progressMap[onboarding.step] || 0;
  };

  const getStepTitle = () => {
    const titles = {
      business: "1/5 — Tipo de Negócio",
      activity_profile: "2/5 — Perfil de Atividade",
      success: "3/5 — Definição de Sucesso",
      process: "4/5 — Processo de Vendas",
      channels: "5/5 — Canais de Entrada",
      generating: "A Criar Configuração",
      preview: "Rever Configuração",
      applying: "A Aplicar",
      complete: "Concluído",
    };
    return titles[onboarding.step] || "";
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">Configuração Inteligente</h1>
              <p className="text-sm text-muted-foreground">{workspaceName}</p>
            </div>
          </div>
          
          {onboarding.step !== "complete" && onboarding.step !== "applying" && (
            <button
              onClick={onSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Saltar configuração
            </button>
          )}
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">{getStepTitle()}</span>
            <span className="text-sm text-muted-foreground">{getProgress()}%</span>
          </div>
          <Progress value={getProgress()} className="h-2" />
        </div>

        {/* Step Content */}
        <div className="animate-fade-in">
          {onboarding.step === "business" && (
            <BusinessTypeStep
              value={onboarding.answers.businessType}
              customValue={onboarding.answers.customBusinessType || ""}
              onChange={(value) => onboarding.updateAnswer("businessType", value)}
              onCustomChange={(value) => onboarding.updateAnswer("customBusinessType", value)}
              onNext={onboarding.nextStep}
            />
          )}

          {onboarding.step === "activity_profile" && (
            <ActivityProfileStep
              value={onboarding.answers.activityProfileType}
              suggestedProfile={getSuggestedProfile()}
              onChange={(value) => onboarding.updateAnswer("activityProfileType", value)}
              onNext={onboarding.nextStep}
              onBack={onboarding.prevStep}
            />
          )}

          {onboarding.step === "success" && (
            <SuccessDefinitionStep
              value={onboarding.answers.successDefinition}
              businessType={onboarding.answers.businessType}
              onChange={(value) => onboarding.updateAnswer("successDefinition", value)}
              onNext={onboarding.nextStep}
              onBack={onboarding.prevStep}
            />
          )}

          {onboarding.step === "process" && (
            <ProcessDescriptionStep
              value={onboarding.answers.processDescription}
              onChange={(value) => onboarding.updateAnswer("processDescription", value)}
              onNext={onboarding.nextStep}
              onBack={onboarding.prevStep}
            />
          )}

          {onboarding.step === "channels" && (
            <ChannelsStep
              value={onboarding.answers.channels}
              onChange={(value) => onboarding.updateAnswer("channels", value)}
              onNext={onboarding.generateConfig}
              onBack={onboarding.prevStep}
            />
          )}

          {onboarding.step === "generating" && <GeneratingStep />}

          {onboarding.step === "preview" && onboarding.config && (
            <PreviewStep
              config={onboarding.config}
              onUpdateConfig={onboarding.updateConfig}
              onRemoveStage={onboarding.removeStage}
              onRemoveCustomField={onboarding.removeCustomField}
              onRemoveForm={onboarding.removeForm}
              onRemoveAutomation={onboarding.removeAutomation}
              onRemoveKPI={onboarding.removeKPI}
              onApply={() => onboarding.setStep("applying")}
              onBack={() => onboarding.setStep("channels")}
            />
          )}

          {onboarding.step === "applying" && onboarding.config && (
            <ApplyingStep
              config={onboarding.config}
              answers={onboarding.answers}
              onComplete={() => onboarding.setStep("complete")}
            />
          )}

          {onboarding.step === "complete" && (
            <CompleteStep onContinue={onComplete} />
          )}
        </div>
      </div>
    </div>
  );
}
