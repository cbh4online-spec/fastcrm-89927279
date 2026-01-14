import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Sparkles, Send, Bot, User } from 'lucide-react';
import { BlueprintClarifyingQuestion } from '@/types/blueprint';

interface ConversationalQuestionsProps {
  questions: BlueprintClarifyingQuestion[];
  onSubmit: (answers: Record<string, string | string[]>) => void;
  isLoading: boolean;
}

interface Message {
  id: string;
  type: 'question' | 'answer';
  content: string;
  questionId?: string;
}

export function ConversationalQuestions({
  questions,
  onSubmit,
  isLoading,
}: ConversationalQuestionsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentAnswer, setCurrentAnswer] = useState<string | string[]>('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const currentQuestion = questions[currentIndex];
  const isLastQuestion = currentIndex === questions.length - 1;
  const allAnswered = currentIndex >= questions.length;

  // Initialize first question
  useEffect(() => {
    if (questions.length > 0 && messages.length === 0) {
      setMessages([
        {
          id: `q-${questions[0].id}`,
          type: 'question',
          content: questions[0].question,
          questionId: questions[0].id,
        },
      ]);
    }
  }, [questions, messages.length]);

  // Scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmitAnswer = () => {
    if (!currentQuestion || !currentAnswer || (Array.isArray(currentAnswer) && currentAnswer.length === 0)) return;

    // Get display text for the answer
    let answerDisplay = '';
    if (currentQuestion.type === 'text') {
      answerDisplay = currentAnswer as string;
    } else if (currentQuestion.options) {
      if (Array.isArray(currentAnswer)) {
        answerDisplay = currentAnswer
          .map((v) => currentQuestion.options?.find((o) => o.value === v)?.label || v)
          .join(', ');
      } else {
        answerDisplay = currentQuestion.options.find((o) => o.value === currentAnswer)?.label || (currentAnswer as string);
      }
    }

    // Save answer
    const newAnswers = { ...answers, [currentQuestion.id]: currentAnswer };
    setAnswers(newAnswers);

    // Add answer message
    const newMessages: Message[] = [
      ...messages,
      {
        id: `a-${currentQuestion.id}`,
        type: 'answer',
        content: answerDisplay,
        questionId: currentQuestion.id,
      },
    ];

    // Add next question if not last
    const nextIndex = currentIndex + 1;
    if (nextIndex < questions.length) {
      newMessages.push({
        id: `q-${questions[nextIndex].id}`,
        type: 'question',
        content: questions[nextIndex].question,
        questionId: questions[nextIndex].id,
      });
    }

    setMessages(newMessages);
    setCurrentIndex(nextIndex);
    setCurrentAnswer('');
  };

  const handleSingleSelect = (value: string) => {
    setCurrentAnswer(value);
  };

  const handleMultipleSelect = (value: string, checked: boolean) => {
    const current = (Array.isArray(currentAnswer) ? currentAnswer : []) as string[];
    if (checked) {
      setCurrentAnswer([...current, value]);
    } else {
      setCurrentAnswer(current.filter((v) => v !== value));
    }
  };

  const handleFinish = () => {
    onSubmit(answers);
  };

  const hasValidAnswer = () => {
    if (!currentQuestion) return false;
    if (currentQuestion.type === 'text') return typeof currentAnswer === 'string' && currentAnswer.trim().length > 0;
    if (currentQuestion.type === 'multiple') return Array.isArray(currentAnswer) && currentAnswer.length > 0;
    return typeof currentAnswer === 'string' && currentAnswer.length > 0;
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-primary/5 to-primary/10">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Vamos refinar o teu Blueprint
          </CardTitle>
          <Badge variant="secondary" className="font-normal">
            {Math.min(currentIndex + 1, questions.length)} de {questions.length}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Responde a algumas perguntas rápidas para personalizar o CRM ao teu negócio.
        </p>
      </CardHeader>

      <CardContent className="p-0">
        {/* Chat messages */}
        <ScrollArea className="h-[300px] p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex gap-3 ${message.type === 'answer' ? 'justify-end' : ''}`}
              >
                {message.type === 'question' && (
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Bot className="h-4 w-4 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${
                    message.type === 'question'
                      ? 'bg-muted text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                  }`}
                >
                  <p className="text-sm">{message.content}</p>
                </div>
                {message.type === 'answer' && (
                  <div className="h-8 w-8 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary-foreground" />
                  </div>
                )}
              </div>
            ))}

            {/* Typing indicator when loading */}
            {isLoading && allAnswered && (
              <div className="flex gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Bot className="h-4 w-4 text-primary" />
                </div>
                <div className="bg-muted rounded-2xl rounded-tl-sm px-4 py-2.5">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
                    <span className="w-2 h-2 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Input area */}
        <div className="border-t p-4 bg-muted/30">
          {!allAnswered && currentQuestion ? (
            <div className="space-y-3">
              {/* Single select options */}
              {currentQuestion.type === 'single' && currentQuestion.options && (
                <RadioGroup
                  value={currentAnswer as string}
                  onValueChange={handleSingleSelect}
                  className="grid grid-cols-1 sm:grid-cols-2 gap-2"
                >
                  {currentQuestion.options.map((option) => (
                    <div
                      key={option.value}
                      className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                        currentAnswer === option.value
                          ? 'border-primary bg-primary/5'
                          : 'hover:bg-muted/50'
                      }`}
                      onClick={() => handleSingleSelect(option.value)}
                    >
                      <RadioGroupItem value={option.value} id={option.value} />
                      <Label htmlFor={option.value} className="cursor-pointer flex-1 text-sm">
                        {option.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {/* Multiple select options */}
              {currentQuestion.type === 'multiple' && currentQuestion.options && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {currentQuestion.options.map((option) => {
                    const isChecked = Array.isArray(currentAnswer) && currentAnswer.includes(option.value);
                    return (
                      <div
                        key={option.value}
                        className={`flex items-center space-x-2 p-3 border rounded-lg cursor-pointer transition-colors ${
                          isChecked ? 'border-primary bg-primary/5' : 'hover:bg-muted/50'
                        }`}
                        onClick={() => handleMultipleSelect(option.value, !isChecked)}
                      >
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={(checked) => handleMultipleSelect(option.value, !!checked)}
                        />
                        <Label className="cursor-pointer flex-1 text-sm">{option.label}</Label>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Text input */}
              {currentQuestion.type === 'text' && (
                <Textarea
                  value={currentAnswer as string}
                  onChange={(e) => setCurrentAnswer(e.target.value)}
                  placeholder="Escreve a tua resposta..."
                  className="min-h-[80px] resize-none"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && hasValidAnswer()) {
                      e.preventDefault();
                      handleSubmitAnswer();
                    }
                  }}
                />
              )}

              <Button
                onClick={handleSubmitAnswer}
                disabled={!hasValidAnswer()}
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {isLastQuestion ? 'Finalizar' : 'Enviar'}
              </Button>
            </div>
          ) : allAnswered ? (
            <Button onClick={handleFinish} disabled={isLoading} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  A gerar Blueprint...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Blueprint Personalizado
                </>
              )}
            </Button>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
