import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { 
  FlaskConical, 
  BookOpen, 
  Target, 
  Clock, 
  Pill,
  FileText 
} from "lucide-react";

interface ProductSpecifications {
  composition?: string | string[];
  usage?: string;
  active_ingredients?: string[];
  expected_results?: string;
  duration?: string;
  contraindications?: string;
  storage?: string;
  [key: string]: unknown;
}

interface ProductTechnicalInfoProps {
  specifications: ProductSpecifications | null;
  commercialDescription: string | null;
}

export function ProductTechnicalInfo({ 
  specifications, 
  commercialDescription 
}: ProductTechnicalInfoProps) {
  const specs = specifications || {};
  
  // Helper to format composition
  const formatComposition = (composition: string | string[] | undefined) => {
    if (!composition) return null;
    if (Array.isArray(composition)) return composition;
    return [composition];
  };

  const compositionList = formatComposition(specs.composition);
  const ingredientsList = specs.active_ingredients;

  const hasContent = commercialDescription || 
    compositionList?.length || 
    ingredientsList?.length || 
    specs.usage || 
    specs.expected_results;

  if (!hasContent) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>Informação técnica não disponível</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Commercial Description */}
      {commercialDescription && (
        <div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            Descrição
          </h4>
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {commercialDescription}
          </p>
        </div>
      )}

      {/* Composition / Active Ingredients */}
      {(compositionList?.length || ingredientsList?.length) && (
        <>
          {commercialDescription && <Separator />}
          <div>
            <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
              <FlaskConical className="h-4 w-4 text-primary" />
              Composição / Ativos
            </h4>
            <div className="flex flex-wrap gap-2">
              {compositionList?.map((item, index) => (
                <Badge 
                  key={`comp-${index}`} 
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <Pill className="h-3 w-3 mr-1" />
                  {item}
                </Badge>
              ))}
              {ingredientsList?.map((item, index) => (
                <Badge 
                  key={`ing-${index}`} 
                  variant="outline"
                  className="bg-emerald-50 text-emerald-700 border-emerald-200"
                >
                  <Pill className="h-3 w-3 mr-1" />
                  {item}
                </Badge>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Usage Instructions */}
      {specs.usage && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Modo de Uso
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {specs.usage}
            </p>
          </div>
        </>
      )}

      {/* Expected Results */}
      {specs.expected_results && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              Resultados Esperados
            </h4>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {specs.expected_results}
            </p>
          </div>
        </>
      )}

      {/* Duration / Treatment Time */}
      {specs.duration && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Duração do Tratamento
            </h4>
            <p className="text-sm text-muted-foreground">
              {specs.duration}
            </p>
          </div>
        </>
      )}

      {/* Contraindications */}
      {specs.contraindications && (
        <>
          <Separator />
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <h4 className="text-sm font-semibold mb-2 text-amber-800">
              ⚠️ Contraindicações
            </h4>
            <p className="text-sm text-amber-700 whitespace-pre-wrap">
              {specs.contraindications}
            </p>
          </div>
        </>
      )}

      {/* Storage */}
      {specs.storage && (
        <>
          <Separator />
          <div>
            <h4 className="text-sm font-semibold mb-2">
              Conservação
            </h4>
            <p className="text-sm text-muted-foreground">
              {specs.storage}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
