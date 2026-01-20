import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileText, 
  Search, 
  Clock, 
  Phone, 
  Mail, 
  Calendar, 
  RefreshCw,
  TrendingUp,
  UserPlus,
  HelpCircle,
  Briefcase,
  CheckSquare,
  MoreHorizontal
} from "lucide-react";
import { cn } from "@/lib/utils";
import { 
  TaskTemplate, 
  TaskCategory,
  DEFAULT_TASK_TEMPLATES,
  TASK_CATEGORY_LABELS,
  TASK_PRIORITY_COLORS,
  TASK_PRIORITY_LABELS,
  applyTemplateVariables
} from "@/types/taskTemplate";

interface TaskTemplateSelectorProps {
  entityName: string;
  onSelectTemplate: (template: TaskTemplate, title: string) => void;
}

const categoryIcons: Record<TaskCategory, React.ReactNode> = {
  follow_up: <RefreshCw className="w-4 h-4" />,
  meeting: <Calendar className="w-4 h-4" />,
  call: <Phone className="w-4 h-4" />,
  email: <Mail className="w-4 h-4" />,
  proposal: <FileText className="w-4 h-4" />,
  review: <CheckSquare className="w-4 h-4" />,
  administrative: <Briefcase className="w-4 h-4" />,
  upsell: <TrendingUp className="w-4 h-4" />,
  onboarding: <UserPlus className="w-4 h-4" />,
  support: <HelpCircle className="w-4 h-4" />,
  other: <MoreHorizontal className="w-4 h-4" />
};

export function TaskTemplateSelector({
  entityName,
  onSelectTemplate
}: TaskTemplateSelectorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TaskCategory | 'all'>('all');

  const categories: Array<TaskCategory | 'all'> = ['all', ...Object.keys(TASK_CATEGORY_LABELS) as TaskCategory[]];

  const filteredTemplates = DEFAULT_TASK_TEMPLATES.filter(template => {
    const matchesSearch = 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleSelectTemplate = (template: TaskTemplate) => {
    const title = applyTemplateVariables(template.suggestedTitle, {
      nome_cliente: entityName
    });
    onSelectTemplate(template, title);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/10">
            <FileText className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <CardTitle className="text-lg">Templates de Tarefas</CardTitle>
            <CardDescription>
              Modelos prontos para criar tarefas rapidamente
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Pesquisar templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Category Filter */}
        <div className="flex gap-2 flex-wrap">
          {categories.map((cat) => (
            <Button
              key={cat}
              variant={selectedCategory === cat ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(cat)}
              className="text-xs"
            >
              {cat === 'all' ? 'Todos' : TASK_CATEGORY_LABELS[cat]}
            </Button>
          ))}
        </div>

        {/* Templates List */}
        <ScrollArea className="h-[300px]">
          <div className="space-y-2 pr-2">
            {filteredTemplates.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Nenhum template encontrado</p>
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <button
                  key={template.id}
                  onClick={() => handleSelectTemplate(template)}
                  className="w-full p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors text-left"
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg shrink-0",
                      template.priority === 'high' && "bg-red-500/10 text-red-600",
                      template.priority === 'medium' && "bg-amber-500/10 text-amber-600",
                      template.priority === 'low' && "bg-green-500/10 text-green-600"
                    )}>
                      {categoryIcons[template.category]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-sm">{template.name}</span>
                        <Badge 
                          variant="outline" 
                          className={cn("text-xs", TASK_PRIORITY_COLORS[template.priority])}
                        >
                          {TASK_PRIORITY_LABELS[template.priority]}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2">
                        {template.description}
                      </p>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        <span>Prazo sugerido: {template.defaultDueDays} dias</span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
