import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCourses } from "@/hooks/useStudentJourney";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Copy, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { SJProfile } from "@/types/studentJourney";

type MessageType = "general" | "course_invite" | "reactivation" | "followup";

interface GenerateMessageDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: SJProfile | null;
}

export function GenerateMessageDialog({
  open,
  onOpenChange,
  profile,
}: GenerateMessageDialogProps) {
  const { currentWorkspace } = useWorkspace();
  const { courses } = useCourses();
  const [messageType, setMessageType] = useState<MessageType>("general");
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState(false);
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [cta, setCta] = useState("");

  const activeCourses = courses.filter((c) => c.is_active);

  const resetForm = () => {
    setMessageType("general");
    setSelectedCourseId("");
    setSubject("");
    setMessage("");
    setCta("");
  };

  const handleGenerate = async () => {
    if (!profile || !currentWorkspace?.id) return;

    setIsGenerating(true);
    try {
      // If course is selected, use existing generate_message action
      if (messageType === "course_invite" && selectedCourseId) {
        const { data, error } = await supabase.functions.invoke(
          "sj-course-recommendations",
          {
            body: {
              workspaceId: currentWorkspace.id,
              action: "generate_message",
              profileId: profile.id,
              courseId: selectedCourseId,
            },
          }
        );

        if (error) throw error;

        setSubject(data.subject || "");
        setMessage(data.message || "");
        setCta(data.cta || "");
      } else {
        // Use new generate_contact_message action
        const { data, error } = await supabase.functions.invoke(
          "sj-course-recommendations",
          {
            body: {
              workspaceId: currentWorkspace.id,
              action: "generate_contact_message",
              profileId: profile.id,
              messageType,
            },
          }
        );

        if (error) throw error;

        setSubject(data.subject || "");
        setMessage(data.message || "");
        setCta(data.cta || "");
      }

      toast.success("Mensagem gerada com sucesso");
    } catch (error) {
      console.error("Error generating message:", error);
      toast.error("Erro ao gerar mensagem");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = () => {
    const fullMessage = `${subject ? `Assunto: ${subject}\n\n` : ""}${message}${cta ? `\n\n${cta}` : ""}`;
    navigator.clipboard.writeText(fullMessage);
    toast.success("Mensagem copiada!");
  };

  const handleClose = (open: boolean) => {
    if (!open) resetForm();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Gerar Mensagem para {profile?.full_name || "Aluno"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-3">
            <Label>Tipo de mensagem</Label>
            <RadioGroup
              value={messageType}
              onValueChange={(v) => setMessageType(v as MessageType)}
              className="grid grid-cols-2 gap-2"
            >
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="general" id="general" />
                <Label htmlFor="general" className="cursor-pointer text-sm">
                  Contacto geral
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="course_invite" id="course_invite" />
                <Label htmlFor="course_invite" className="cursor-pointer text-sm">
                  Convite para curso
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="reactivation" id="reactivation" />
                <Label htmlFor="reactivation" className="cursor-pointer text-sm">
                  Reativação
                </Label>
              </div>
              <div className="flex items-center space-x-2 border rounded-md p-3">
                <RadioGroupItem value="followup" id="followup" />
                <Label htmlFor="followup" className="cursor-pointer text-sm">
                  Follow-up
                </Label>
              </div>
            </RadioGroup>
          </div>

          {messageType === "course_invite" && (
            <div className="space-y-2">
              <Label>Selecionar Curso</Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger>
                  <SelectValue placeholder="Escolha um curso..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCourses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (messageType === "course_invite" && !selectedCourseId)}
            className="w-full gap-2"
          >
            {isGenerating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Gerar com IA
          </Button>

          {(subject || message) && (
            <>
              <div className="space-y-2">
                <Label>Assunto</Label>
                <Input
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Assunto do email..."
                />
              </div>

              <div className="space-y-2">
                <Label>Mensagem</Label>
                <Textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  rows={5}
                  placeholder="Corpo da mensagem..."
                />
              </div>

              <div className="space-y-2">
                <Label>Call to Action</Label>
                <Input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder="CTA..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            Cancelar
          </Button>
          {message && (
            <Button onClick={handleCopy} className="gap-2">
              <Copy className="h-4 w-4" />
              Copiar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
