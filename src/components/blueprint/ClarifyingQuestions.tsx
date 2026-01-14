import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Loader2, Sparkles, ChevronRight, Check } from 'lucide-react';
import { BlueprintClarifyingQuestion } from '@/types/blueprint';

interface ClarifyingQuestionsProps {
  questions: BlueprintClarifyingQuestion[];
  onSubmit: (answers: Record<string, string | string[]>) => void;
  isLoading: boolean;
}

export function ClarifyingQuestions({ questions, onSubmit, isLoading }: ClarifyingQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});

  const currentQuestion = questions[currentIndex];
  const progress = ((currentIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentIndex === questions.length - 1;
  const hasAnswer = currentQuestion && answers[currentQuestion.id];

  const handleSingleAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleMultipleAnswer = (value: string, checked: boolean) => {
    setAnswers(prev => {
      const current = (prev[currentQuestion.id] as string[]) || [];
      if (checked) {
        return { ...prev, [currentQuestion.id]: [...current, value] };
      }
      return { ...prev, [currentQuestion.id]: current.filter(v => v !== value) };
    });
  };

  const handleTextAnswer = (value: string) => {
    setAnswers(prev => ({ ...prev, [currentQuestion.id]: value }));
  };

  const handleNext = () => {
    if (isLastQuestion) {
      onSubmit(answers);
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentIndex(prev => Math.max(0, prev - 1));
  };

  if (!currentQuestion) return null;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Perguntas de Clarificação
          </CardTitle>
          <Badge variant="secondary">
            {currentIndex + 1} de {questions.length}
          </Badge>
        </div>
        <Progress value={progress} className="h-2" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <p className="text-lg font-medium">{currentQuestion.question}</p>

          {currentQuestion.type === 'single' && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.id] as string || ''}
              onValueChange={handleSingleAnswer}
              className="space-y-2"
            >
              {currentQuestion.options.map(option => (
                <div key={option.value} className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer">
                  <RadioGroupItem value={option.value} id={option.value} />
                  <Label htmlFor={option.value} className="flex-1 cursor-pointer">
                    {option.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}

          {currentQuestion.type === 'multiple' && currentQuestion.options && (
            <div className="space-y-2">
              {currentQuestion.options.map(option => {
                const currentAnswers = (answers[currentQuestion.id] as string[]) || [];
                const isChecked = currentAnswers.includes(option.value);
                return (
                  <div
                    key={option.value}
                    className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
                    onClick={() => handleMultipleAnswer(option.value, !isChecked)}
                  >
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={(checked) => handleMultipleAnswer(option.value, !!checked)}
                    />
                    <Label className="flex-1 cursor-pointer">{option.label}</Label>
                  </div>
                );
              })}
            </div>
          )}

          {currentQuestion.type === 'text' && (
            <Textarea
              value={answers[currentQuestion.id] as string || ''}
              onChange={(e) => handleTextAnswer(e.target.value)}
              placeholder="Escreva a sua resposta..."
              rows={3}
            />
          )}
        </div>

        <div className="flex items-center justify-between pt-4">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentIndex === 0}
          >
            Anterior
          </Button>
          <Button
            onClick={handleNext}
            disabled={!hasAnswer || isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                A gerar...
              </>
            ) : isLastQuestion ? (
              <>
                <Check className="h-4 w-4 mr-2" />
                Gerar Blueprint
              </>
            ) : (
              <>
                Próxima
                <ChevronRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
