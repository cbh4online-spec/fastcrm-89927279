import { Loader2, Sparkles, Database, Workflow, FormInput, BarChart3 } from "lucide-react";
import { useEffect, useState } from "react";

const steps = [
  { icon: Sparkles, label: "A analisar o teu negócio..." },
  { icon: Database, label: "A criar campos personalizados..." },
  { icon: Workflow, label: "A configurar pipeline..." },
  { icon: FormInput, label: "A gerar formulários..." },
  { icon: BarChart3, label: "A definir KPIs..." },
];

export function GeneratingStep() {
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const CurrentIcon = steps[currentStep].icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 space-y-8">
      <div className="relative">
        <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center animate-pulse">
          <CurrentIcon className="w-12 h-12 text-primary" />
        </div>
        <div className="absolute -bottom-2 -right-2 w-10 h-10 rounded-full bg-background border-2 border-primary flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-primary animate-spin" />
        </div>
      </div>

      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-foreground">
          A criar a tua configuração personalizada
        </h2>
        <p className="text-muted-foreground animate-fade-in" key={currentStep}>
          {steps[currentStep].label}
        </p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2">
        {steps.map((_, index) => (
          <div
            key={index}
            className={`w-2 h-2 rounded-full transition-all duration-300 ${
              index === currentStep
                ? "bg-primary w-6"
                : index < currentStep
                ? "bg-primary/50"
                : "bg-muted"
            }`}
          />
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Isto pode demorar alguns segundos...
      </p>
    </div>
  );
}
