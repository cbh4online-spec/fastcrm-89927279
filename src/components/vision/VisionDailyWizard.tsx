import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Play, Pause, ChevronRight, ChevronLeft, CheckCircle, Clock, Sparkles, Plus, X } from "lucide-react";

const STEPS = [
  { key: "energy", title: "Nível de Energia", description: "Como te sentes hoje? (1-10)" },
  { key: "intentions", title: "Intenções do Dia", description: "Que compromissos assumes contigo hoje?" },
  { key: "focus", title: "Foco Principal", description: "Quais são as 3 tarefas mais importantes?" },
  { key: "blockers", title: "Possíveis Bloqueios", description: "O que pode impedir o teu progresso?" },
  { key: "reflection", title: "Reflexão & Fecho", description: "Algo mais que queiras registar?" },
];

export function VisionDailyWizard() {
  const [started, setStarted] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [timer, setTimer] = useState(50 * 60); // 50 min
  const [running, setRunning] = useState(false);
  const [energy, setEnergy] = useState(7);
  const [focusItems, setFocusItems] = useState<string[]>([""]);
  const [intentions, setIntentions] = useState<string[]>([""]);
  const [blockers, setBlockers] = useState<string[]>([""]);
  const [reflection, setReflection] = useState("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (running && timer > 0) {
      intervalRef.current = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running, timer]);

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  const addItem = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, ""]);
  };

  const updateItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => i === index ? value : item));
  };

  const removeItem = (setter: React.Dispatch<React.SetStateAction<string[]>>, index: number) => {
    setter(prev => prev.filter((_, i) => i !== index));
  };

  if (!started) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md w-full border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-purple-600/5">
          <CardContent className="p-8 text-center space-y-6">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Briefing Diário</h2>
              <p className="text-sm text-muted-foreground mt-2">
                Sessão guiada de 50 minutos para definir foco, intenções e bloqueios do dia.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => { setStarted(true); setRunning(true); }}
              className="gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700"
            >
              <Play className="h-4 w-4" />Iniciar Sessão
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const step = STEPS[currentStep];

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Timer bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="text-xs gap-1">
            <Clock className="h-3 w-3" />{formatTime(timer)}
          </Badge>
          <Button variant="ghost" size="sm" onClick={() => setRunning(!running)}>
            {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
          </Button>
        </div>
        <div className="flex items-center gap-1">
          {STEPS.map((s, i) => (
            <div
              key={s.key}
              className={`w-2 h-2 rounded-full ${i <= currentStep ? "bg-violet-500" : "bg-muted"}`}
            />
          ))}
        </div>
      </div>

      {/* Step Content */}
      <Card className="border-border/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Badge className="bg-violet-500/10 text-violet-400 border-violet-500/30 text-xs">
              Passo {currentStep + 1}/{STEPS.length}
            </Badge>
          </div>
          <CardTitle className="text-lg">{step.title}</CardTitle>
          <p className="text-sm text-muted-foreground">{step.description}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {step.key === "energy" && (
            <div className="space-y-4">
              <div className="text-center">
                <span className="text-4xl font-bold text-foreground">{energy}</span>
                <span className="text-lg text-muted-foreground">/10</span>
              </div>
              <Slider value={[energy]} onValueChange={([v]) => setEnergy(v)} min={1} max={10} step={1} />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Exausto</span><span>Energético</span>
              </div>
            </div>
          )}

          {(step.key === "focus" || step.key === "intentions" || step.key === "blockers") && (
            <div className="space-y-2">
              {(step.key === "focus" ? focusItems : step.key === "intentions" ? intentions : blockers).map((item, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={item}
                    onChange={(e) => updateItem(
                      step.key === "focus" ? setFocusItems : step.key === "intentions" ? setIntentions : setBlockers,
                      i, e.target.value
                    )}
                    placeholder={`${step.key === "focus" ? "Tarefa" : step.key === "intentions" ? "Intenção" : "Bloqueio"} ${i + 1}...`}
                    className="bg-background"
                  />
                  <Button variant="ghost" size="icon" onClick={() => removeItem(
                    step.key === "focus" ? setFocusItems : step.key === "intentions" ? setIntentions : setBlockers, i
                  )}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => addItem(step.key === "focus" ? setFocusItems : step.key === "intentions" ? setIntentions : setBlockers)}
                className="gap-1 text-xs"
              >
                <Plus className="h-3 w-3" />Adicionar
              </Button>
            </div>
          )}

          {step.key === "reflection" && (
            <Textarea
              value={reflection}
              onChange={(e) => setReflection(e.target.value)}
              placeholder="Escreve a tua reflexão do dia..."
              className="min-h-[150px] bg-background"
            />
          )}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ChevronLeft className="h-4 w-4" />Anterior
        </Button>
        {currentStep < STEPS.length - 1 ? (
          <Button onClick={() => setCurrentStep(currentStep + 1)} className="gap-1">
            Seguinte<ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button className="gap-2 bg-gradient-to-r from-green-500 to-emerald-600">
            <CheckCircle className="h-4 w-4" />Concluir Sessão
          </Button>
        )}
      </div>
    </div>
  );
}
