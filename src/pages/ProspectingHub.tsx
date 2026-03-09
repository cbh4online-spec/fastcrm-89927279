import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Globe, Search, Users, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const modules = [
  {
    title: "Google Local",
    description: "Encontre negócios locais através do Google Maps e diretórios locais.",
    icon: Globe,
    path: "/dashboard/prospecting/google-local",
  },
  {
    title: "Web Search",
    description: "Pesquise profissionais e empresas na web com critérios avançados.",
    icon: Search,
    path: "/dashboard/prospecting/web-search",
  },
  {
    title: "Profissionais",
    description: "Descubra profissionais em redes sociais e plataformas especializadas.",
    icon: Users,
    path: "/dashboard/prospecting/professionals",
  },
];

export default function ProspectingHub() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prospecção"
        description="Escolha um módulo de prospecção para encontrar novos leads e oportunidades."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {modules.map((mod) => (
          <Card
            key={mod.path}
            className="group cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
            onClick={() => navigate(mod.path)}
          >
            <CardContent className="p-6 flex flex-col gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <mod.icon className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{mod.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{mod.description}</p>
              </div>
              <Button variant="ghost" size="sm" className="w-fit gap-1 mt-auto">
                Aceder <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
