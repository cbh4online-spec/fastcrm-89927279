import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Award,
  Plus,
  X,
  Quote,
  Briefcase,
  Image as ImageIcon,
  Medal,
  Star,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SectionAIAssistButton } from "./SectionAIAssistButton";
import { AISuggestionIndicator } from "@/components/ai/AIConfidenceDisplay";

export interface ProjectReference {
  id: string;
  title: string;
  description: string;
  imageUrl?: string;
}

export interface Testimonial {
  quote: string;
  author: string;
  company: string;
  role?: string;
}

export interface ReferencesData {
  projects: ProjectReference[];
  testimonial: Testimonial;
  certifications: string[];
  isAIGenerated?: boolean;
}

interface ProposalReferencesSectionProps {
  data: ReferencesData;
  onChange: (data: ReferencesData) => void;
  disabled?: boolean;
  onGenerateWithAI?: () => void;
  isGenerating?: boolean;
}

const generateId = () => Math.random().toString(36).substring(2, 9);

export function ProposalReferencesSection({
  data,
  onChange,
  disabled = false,
  onGenerateWithAI,
  isGenerating = false,
}: ProposalReferencesSectionProps) {
  const [newCertification, setNewCertification] = useState("");

  const addProject = () => {
    const newProject: ProjectReference = {
      id: generateId(),
      title: "",
      description: "",
    };
    onChange({
      ...data,
      projects: [...data.projects, newProject],
    });
  };

  const updateProject = (id: string, updates: Partial<ProjectReference>) => {
    onChange({
      ...data,
      projects: data.projects.map((p) =>
        p.id === id ? { ...p, ...updates } : p
      ),
    });
  };

  const removeProject = (id: string) => {
    onChange({
      ...data,
      projects: data.projects.filter((p) => p.id !== id),
    });
  };

  const updateTestimonial = (updates: Partial<Testimonial>) => {
    onChange({
      ...data,
      testimonial: { ...data.testimonial, ...updates },
    });
  };

  const addCertification = () => {
    if (!newCertification.trim()) return;
    onChange({
      ...data,
      certifications: [...data.certifications, newCertification.trim()],
    });
    setNewCertification("");
  };

  const removeCertification = (index: number) => {
    onChange({
      ...data,
      certifications: data.certifications.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      {/* AI Generate Button */}
      {onGenerateWithAI && !disabled && (
        <div className="flex items-center justify-between p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5 border-primary/20">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Sugerir referências relevantes</span>
          </div>
          <SectionAIAssistButton
            onClick={onGenerateWithAI}
            isLoading={isGenerating}
            label="Sugerir com IA"
            tooltip="A IA irá sugerir projectos, testemunhos e certificações relevantes"
          />
        </div>
      )}

      {/* AI Generated Badge */}
      {data.isAIGenerated && (
        <AISuggestionIndicator isAIGenerated={true} />
      )}
      {/* Projects */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Projectos Similares
              <Badge variant="secondary">{data.projects.length}</Badge>
            </span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addProject}
              disabled={disabled}
            >
              <Plus className="h-4 w-4 mr-1" />
              Adicionar
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.projects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.projects.map((project) => (
                <div
                  key={project.id}
                  className="border rounded-lg p-4 space-y-3 bg-card hover:shadow-md transition-shadow"
                >
                  {/* Image placeholder */}
                  <div className="aspect-video bg-muted rounded-md flex items-center justify-center border-2 border-dashed">
                    {project.imageUrl ? (
                      <img
                        src={project.imageUrl}
                        alt={project.title}
                        className="w-full h-full object-cover rounded-md"
                      />
                    ) : (
                      <div className="text-center text-muted-foreground">
                        <ImageIcon className="h-8 w-8 mx-auto mb-1 opacity-50" />
                        <p className="text-xs">Sem imagem</p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Input
                      value={project.title}
                      onChange={(e) =>
                        updateProject(project.id, { title: e.target.value })
                      }
                      placeholder="Nome do projecto"
                      disabled={disabled}
                      className="font-medium"
                    />
                    <Textarea
                      value={project.description}
                      onChange={(e) =>
                        updateProject(project.id, {
                          description: e.target.value,
                        })
                      }
                      placeholder="Breve descrição..."
                      disabled={disabled}
                      rows={2}
                      className="resize-none text-sm"
                    />
                    <Input
                      value={project.imageUrl || ""}
                      onChange={(e) =>
                        updateProject(project.id, { imageUrl: e.target.value })
                      }
                      placeholder="URL da imagem (opcional)"
                      disabled={disabled}
                      className="text-xs"
                    />
                  </div>

                  {!disabled && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="w-full text-destructive hover:text-destructive"
                      onClick={() => removeProject(project.id)}
                    >
                      <X className="h-4 w-4 mr-1" />
                      Remover
                    </Button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed rounded-lg text-muted-foreground">
              <Briefcase className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">Nenhum projecto de referência</p>
              <p className="text-xs mt-1">
                Adicione projectos similares para credibilidade
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Testimonial */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Quote className="h-4 w-4" />
            Testemunho
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Quote className="absolute -top-1 -left-1 h-6 w-6 text-primary/20" />
            <Textarea
              value={data.testimonial.quote}
              onChange={(e) => updateTestimonial({ quote: e.target.value })}
              placeholder="O que um cliente disse sobre o seu trabalho..."
              disabled={disabled}
              rows={3}
              className="resize-none pl-6 italic"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Autor</Label>
              <Input
                value={data.testimonial.author}
                onChange={(e) => updateTestimonial({ author: e.target.value })}
                placeholder="Nome do autor"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input
                value={data.testimonial.role || ""}
                onChange={(e) => updateTestimonial({ role: e.target.value })}
                placeholder="Ex: CEO, Director"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={data.testimonial.company}
                onChange={(e) => updateTestimonial({ company: e.target.value })}
                placeholder="Nome da empresa"
                disabled={disabled}
              />
            </div>
          </div>

          {(data.testimonial.quote || data.testimonial.author) && (
            <div className="mt-4 p-4 bg-primary/5 rounded-lg border">
              <div className="flex items-start gap-3">
                <Star className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm italic text-muted-foreground">
                    "{data.testimonial.quote || "..."}"
                  </p>
                  <p className="text-sm font-medium mt-2">
                    — {data.testimonial.author || "Autor"}
                    {data.testimonial.role && `, ${data.testimonial.role}`}
                    {data.testimonial.company &&
                      ` @ ${data.testimonial.company}`}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Certifications */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Medal className="h-4 w-4" />
            Certificações e Parcerias
            <Badge variant="secondary" className="ml-auto">
              {data.certifications.length}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add certification */}
          <div className="flex gap-2">
            <Input
              value={newCertification}
              onChange={(e) => setNewCertification(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addCertification();
                }
              }}
              placeholder="Ex: Google Partner, ISO 9001, Meta Business..."
              disabled={disabled}
              className="flex-1"
            />
            <Button
              type="button"
              size="icon"
              onClick={addCertification}
              disabled={disabled || !newCertification.trim()}
              variant="secondary"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Certifications list */}
          {data.certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {data.certifications.map((cert, index) => (
                <Badge
                  key={index}
                  variant="outline"
                  className="px-3 py-1.5 text-sm gap-2 hover:bg-accent transition-colors"
                >
                  <Award className="h-3.5 w-3.5 text-primary" />
                  {cert}
                  {!disabled && (
                    <button
                      type="button"
                      onClick={() => removeCertification(index)}
                      className="ml-1 hover:text-destructive transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </Badge>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center p-6 border-2 border-dashed rounded-lg text-muted-foreground">
              <p className="text-sm">Nenhuma certificação adicionada</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
