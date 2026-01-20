import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { toast } from "sonner";
import { 
  MapPin, 
  Search, 
  Star, 
  Phone, 
  Globe, 
  Clock, 
  Building2, 
  UserPlus,
  ExternalLink,
  Loader2,
  Settings,
  CreditCard,
  CheckCircle2,
  History,
  ChevronsUpDown,
  Check
} from "lucide-react";
import { PageBreadcrumbs } from "@/components/layout/PageBreadcrumbs";
import { useCreateLead, useLeads } from "@/hooks/useLeads";
import { useCredits } from "@/hooks/useCredits";
import { cn } from "@/lib/utils";

interface GooglePlaceResult {
  id: string;
  title: string;
  rating: number;
  reviews_count: number;
  address: string;
  phone?: string;
  website?: string;
  category: string;
  hours?: string;
  description?: string;
  services?: string[];
}

const MOCK_DATABASE: Record<string, GooglePlaceResult[]> = {
  health: [
    {
      id: "h1",
      title: "Clínica Médica São Lucas",
      rating: 4.8,
      reviews_count: 312,
      address: "Av. da Liberdade 45, Lisboa",
      phone: "+351 21 345 6789",
      website: "https://clinicasaolucas.pt",
      category: "Clínica Médica",
      hours: "08:00 - 20:00",
      description: "Clínica multidisciplinar com especialidades em medicina geral, cardiologia e dermatologia",
      services: ["Medicina Geral", "Cardiologia", "Dermatologia", "Análises Clínicas"]
    },
    {
      id: "h2",
      title: "Centro de Fisioterapia Lisboa",
      rating: 4.6,
      reviews_count: 187,
      address: "Rua Augusta 123, Lisboa",
      phone: "+351 21 456 7890",
      website: "https://fisioterapialisboa.pt",
      category: "Fisioterapia",
      hours: "09:00 - 19:00",
      description: "Centro especializado em reabilitação física e desportiva",
      services: ["Fisioterapia", "Reabilitação", "Massagem Terapêutica", "Pilates Clínico"]
    },
    {
      id: "h3",
      title: "Clínica Dentária Sorriso Perfeito",
      rating: 4.9,
      reviews_count: 423,
      address: "Praça do Comércio 67, Lisboa",
      phone: "+351 21 567 8901",
      website: "https://sorrisoperfeito.pt",
      category: "Clínica Dentária",
      hours: "09:00 - 19:00",
      description: "Clínica moderna especializada em ortodontia, implantes e estética dentária",
      services: ["Ortodontia", "Implantes", "Branqueamento", "Higiene Oral"]
    },
    {
      id: "h4",
      title: "Hospital Veterinário do Lumiar",
      rating: 4.7,
      reviews_count: 256,
      address: "Alameda das Linhas de Torres 200, Lisboa",
      phone: "+351 21 678 9012",
      website: "https://hvlumiar.pt",
      category: "Veterinário",
      hours: "24 horas",
      description: "Hospital veterinário com serviço de urgência 24 horas",
      services: ["Consultas", "Cirurgia", "Urgências", "Internamento"]
    },
    {
      id: "h5",
      title: "Farmácia Central Lisboa",
      rating: 4.5,
      reviews_count: 178,
      address: "Rossio 45, Lisboa",
      phone: "+351 21 789 0123",
      website: "https://farmaciacentral.pt",
      category: "Farmácia",
      hours: "08:00 - 22:00",
      description: "Farmácia com serviços de aconselhamento farmacêutico e medição de tensão",
      services: ["Medicamentos", "Dermofarmácia", "Ortopedia", "Veterinária"]
    }
  ],
  restaurant: [
    {
      id: "r1",
      title: "Restaurante O Pescador",
      rating: 4.5,
      reviews_count: 234,
      address: "Rua da Praia 123, Lisboa",
      phone: "+351 21 123 4567",
      website: "https://opescador.pt",
      category: "Restaurante",
      hours: "12:00 - 23:00",
      description: "Restaurante de marisco tradicional com vista para o mar",
      services: ["Entrega ao domicílio", "Reservas", "Wi-Fi grátis"]
    },
    {
      id: "r2",
      title: "Tasca do Chico",
      rating: 4.7,
      reviews_count: 567,
      address: "Bairro Alto, Lisboa",
      phone: "+351 21 234 5678",
      website: "https://tascadochico.pt",
      category: "Restaurante Tradicional",
      hours: "19:00 - 02:00",
      description: "Tasca típica portuguesa com fado ao vivo",
      services: ["Fado ao Vivo", "Reservas", "Grupos"]
    }
  ],
  auto: [
    {
      id: "a1",
      title: "Auto Mecânica Lisboa",
      rating: 4.8,
      reviews_count: 156,
      address: "Av. Almirante Reis 456, Lisboa",
      phone: "+351 21 345 6789",
      website: "https://automecanicalisboa.pt",
      category: "Oficina Automóvel",
      hours: "08:00 - 18:00",
      description: "Oficina especializada em manutenção e reparação automóvel",
      services: ["Revisões", "Pneus", "Ar condicionado", "Diagnóstico"]
    },
    {
      id: "a2",
      title: "Centro de Inspeções Lisboa",
      rating: 4.3,
      reviews_count: 890,
      address: "Zona Industrial, Lisboa",
      phone: "+351 21 456 7890",
      category: "Centro de Inspeções",
      hours: "08:00 - 19:00",
      description: "Centro de inspeções automóveis certificado",
      services: ["Inspeção Periódica", "Inspeção Extraordinária"]
    }
  ],
  services: [
    {
      id: "s1",
      title: "Contabilidade & Consultoria Lda",
      rating: 4.3,
      reviews_count: 45,
      address: "Rua do Comércio 321, Lisboa",
      phone: "+351 21 111 2222",
      website: "https://contabilidadeconsultoria.pt",
      category: "Contabilidade",
      hours: "09:00 - 18:00",
      description: "Serviços de contabilidade, fiscalidade e consultoria empresarial",
      services: ["Contabilidade", "IRS", "IRC", "Apoio a empresas"]
    },
    {
      id: "s2",
      title: "Advogados Associados Lisboa",
      rating: 4.6,
      reviews_count: 123,
      address: "Av. da República 100, Lisboa",
      phone: "+351 21 222 3333",
      website: "https://advogadoslisboa.pt",
      category: "Escritório de Advogados",
      hours: "09:00 - 18:00",
      description: "Escritório de advogados especializado em direito comercial e laboral",
      services: ["Direito Comercial", "Direito Laboral", "Contratos", "Litígios"]
    }
  ],
  retail: [
    {
      id: "rt1",
      title: "Loja de Eletrónica TechZone",
      rating: 4.2,
      reviews_count: 234,
      address: "Centro Comercial Colombo, Lisboa",
      phone: "+351 21 333 4444",
      website: "https://techzone.pt",
      category: "Loja de Eletrónica",
      hours: "10:00 - 23:00",
      description: "Loja especializada em eletrónica e informática",
      services: ["Reparações", "Garantia", "Assistência Técnica"]
    }
  ],
  construction: [
    {
      id: "c1",
      title: "Construções Lisboa Lda",
      rating: 4.4,
      reviews_count: 78,
      address: "Zona Industrial Sacavém, Lisboa",
      phone: "+351 21 444 5555",
      website: "https://construcoeslisboa.pt",
      category: "Construção Civil",
      hours: "08:00 - 17:00",
      description: "Empresa de construção civil especializada em remodelações",
      services: ["Construção", "Remodelação", "Pintura", "Canalização"]
    }
  ],
  beauty: [
    {
      id: "b1",
      title: "Cabeleireiro Elegance",
      rating: 4.9,
      reviews_count: 342,
      address: "Av. Roma 156, Lisboa",
      phone: "+351 21 555 6666",
      website: "https://elegancehair.pt",
      category: "Cabeleireiro",
      hours: "09:00 - 20:00",
      description: "Cabeleireiro unisexo especializado em coloração e cortes modernos",
      services: ["Corte", "Coloração", "Madeixas", "Tratamentos Capilares", "Penteados"]
    },
    {
      id: "b2",
      title: "Estética & Beleza Maria",
      rating: 4.8,
      reviews_count: 278,
      address: "Rua Castilho 45, Lisboa",
      phone: "+351 21 666 7777",
      website: "https://esteticamaria.pt",
      category: "Centro de Estética",
      hours: "10:00 - 19:00",
      description: "Centro de estética com tratamentos faciais e corporais",
      services: ["Limpeza de Pele", "Massagens", "Depilação", "Tratamentos Anti-idade", "Manicure"]
    },
    {
      id: "b3",
      title: "Barbearia Clássica",
      rating: 4.7,
      reviews_count: 198,
      address: "Baixa-Chiado, Lisboa",
      phone: "+351 21 777 8888",
      website: "https://barbeiraclassica.pt",
      category: "Barbearia",
      hours: "10:00 - 20:00",
      description: "Barbearia tradicional com serviços premium",
      services: ["Corte de Cabelo", "Barba", "Tratamentos", "Hot Towel"]
    },
    {
      id: "b4",
      title: "Nail Art Studio",
      rating: 4.6,
      reviews_count: 156,
      address: "Centro Comercial Vasco da Gama, Lisboa",
      phone: "+351 21 888 9999",
      website: "https://nailartstudio.pt",
      category: "Manicure & Pedicure",
      hours: "10:00 - 22:00",
      description: "Estúdio especializado em nail art e extensões de unhas",
      services: ["Manicure", "Pedicure", "Gel", "Extensões", "Nail Art"]
    },
    {
      id: "b5",
      title: "SPA Bem-Estar Lisboa",
      rating: 4.9,
      reviews_count: 423,
      address: "Hotel Ritz, Lisboa",
      phone: "+351 21 999 0000",
      website: "https://spabemestar.pt",
      category: "SPA",
      hours: "08:00 - 21:00",
      description: "SPA de luxo com tratamentos relaxantes e terapêuticos",
      services: ["Massagens", "Sauna", "Jacuzzi", "Tratamentos Corporais", "Aromaterapia"]
    },
    {
      id: "b6",
      title: "Clínica Estética Avançada",
      rating: 4.8,
      reviews_count: 312,
      address: "Av. da Liberdade 200, Lisboa",
      phone: "+351 21 000 1111",
      website: "https://clinicaestetica.pt",
      category: "Clínica Estética",
      hours: "09:00 - 19:00",
      description: "Clínica de medicina estética com tratamentos avançados",
      services: ["Botox", "Preenchimentos", "Laser", "Peeling", "Mesoterapia"]
    },
    {
      id: "b7",
      title: "Sobrancelhas Perfeitas",
      rating: 4.5,
      reviews_count: 234,
      address: "Amoreiras Shopping, Lisboa",
      phone: "+351 21 111 2222",
      website: "https://sobrancelhasperfeitas.pt",
      category: "Sobrancelhas & Pestanas",
      hours: "10:00 - 22:00",
      description: "Especialistas em design de sobrancelhas e extensões de pestanas",
      services: ["Design Sobrancelhas", "Micropigmentação", "Extensões Pestanas", "Laminação"]
    },
    {
      id: "b8",
      title: "Centro de Bronzeamento Solar",
      rating: 4.3,
      reviews_count: 145,
      address: "Rua Augusta 89, Lisboa",
      phone: "+351 21 222 3333",
      category: "Solário",
      hours: "09:00 - 21:00",
      description: "Centro de bronzeamento com equipamentos de última geração",
      services: ["Bronzeamento UV", "Spray Tan", "Bronzeamento Natural"]
    }
  ]
};

const CATEGORIES = [
  { value: "all", label: "Todas as categorias" },
  { value: "restaurant", label: "Restaurantes" },
  { value: "auto", label: "Automóvel" },
  { value: "health", label: "Saúde" },
  { value: "beauty", label: "Cabeleireiros & Estética" },
  { value: "services", label: "Serviços" },
  { value: "retail", label: "Retalho" },
  { value: "construction", label: "Construção" },
];

const LOCATIONS = [
  { value: "", label: "Todas as localidades" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE AVEIRO
  // ═══════════════════════════════════════════════════════════════
  { value: "Águeda", label: "Águeda" },
  { value: "Albergaria-a-Velha", label: "Albergaria-a-Velha" },
  { value: "Anadia", label: "Anadia" },
  { value: "Arouca", label: "Arouca" },
  { value: "Aveiro", label: "Aveiro" },
  { value: "Castelo de Paiva", label: "Castelo de Paiva" },
  { value: "Espinho", label: "Espinho" },
  { value: "Estarreja", label: "Estarreja" },
  { value: "Ílhavo", label: "Ílhavo" },
  { value: "Mealhada", label: "Mealhada" },
  { value: "Murtosa", label: "Murtosa" },
  { value: "Oliveira de Azeméis", label: "Oliveira de Azeméis" },
  { value: "Oliveira do Bairro", label: "Oliveira do Bairro" },
  { value: "Ovar", label: "Ovar" },
  { value: "Santa Maria da Feira", label: "Santa Maria da Feira" },
  { value: "São João da Madeira", label: "São João da Madeira" },
  { value: "Sever do Vouga", label: "Sever do Vouga" },
  { value: "Vagos", label: "Vagos" },
  { value: "Vale de Cambra", label: "Vale de Cambra" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE BEJA
  // ═══════════════════════════════════════════════════════════════
  { value: "Aljustrel", label: "Aljustrel" },
  { value: "Almodôvar", label: "Almodôvar" },
  { value: "Alvito", label: "Alvito" },
  { value: "Barrancos", label: "Barrancos" },
  { value: "Beja", label: "Beja" },
  { value: "Castro Verde", label: "Castro Verde" },
  { value: "Cuba", label: "Cuba" },
  { value: "Ferreira do Alentejo", label: "Ferreira do Alentejo" },
  { value: "Mértola", label: "Mértola" },
  { value: "Moura", label: "Moura" },
  { value: "Odemira", label: "Odemira" },
  { value: "Ourique", label: "Ourique" },
  { value: "Serpa", label: "Serpa" },
  { value: "Vidigueira", label: "Vidigueira" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE BRAGA
  // ═══════════════════════════════════════════════════════════════
  { value: "Amares", label: "Amares" },
  { value: "Barcelos", label: "Barcelos" },
  { value: "Braga", label: "Braga" },
  { value: "Cabeceiras de Basto", label: "Cabeceiras de Basto" },
  { value: "Celorico de Basto", label: "Celorico de Basto" },
  { value: "Esposende", label: "Esposende" },
  { value: "Fafe", label: "Fafe" },
  { value: "Guimarães", label: "Guimarães" },
  { value: "Póvoa de Lanhoso", label: "Póvoa de Lanhoso" },
  { value: "Terras de Bouro", label: "Terras de Bouro" },
  { value: "Vieira do Minho", label: "Vieira do Minho" },
  { value: "Vila Nova de Famalicão", label: "Vila Nova de Famalicão" },
  { value: "Vila Verde", label: "Vila Verde" },
  { value: "Vizela", label: "Vizela" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE BRAGANÇA
  // ═══════════════════════════════════════════════════════════════
  { value: "Alfândega da Fé", label: "Alfândega da Fé" },
  { value: "Bragança", label: "Bragança" },
  { value: "Carrazeda de Ansiães", label: "Carrazeda de Ansiães" },
  { value: "Freixo de Espada à Cinta", label: "Freixo de Espada à Cinta" },
  { value: "Macedo de Cavaleiros", label: "Macedo de Cavaleiros" },
  { value: "Miranda do Douro", label: "Miranda do Douro" },
  { value: "Mirandela", label: "Mirandela" },
  { value: "Mogadouro", label: "Mogadouro" },
  { value: "Torre de Moncorvo", label: "Torre de Moncorvo" },
  { value: "Vila Flor", label: "Vila Flor" },
  { value: "Vimioso", label: "Vimioso" },
  { value: "Vinhais", label: "Vinhais" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE CASTELO BRANCO
  // ═══════════════════════════════════════════════════════════════
  { value: "Belmonte", label: "Belmonte" },
  { value: "Castelo Branco", label: "Castelo Branco" },
  { value: "Covilhã", label: "Covilhã" },
  { value: "Fundão", label: "Fundão" },
  { value: "Idanha-a-Nova", label: "Idanha-a-Nova" },
  { value: "Oleiros", label: "Oleiros" },
  { value: "Penamacor", label: "Penamacor" },
  { value: "Proença-a-Nova", label: "Proença-a-Nova" },
  { value: "Sertã", label: "Sertã" },
  { value: "Vila de Rei", label: "Vila de Rei" },
  { value: "Vila Velha de Ródão", label: "Vila Velha de Ródão" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE COIMBRA
  // ═══════════════════════════════════════════════════════════════
  { value: "Arganil", label: "Arganil" },
  { value: "Cantanhede", label: "Cantanhede" },
  { value: "Coimbra", label: "Coimbra" },
  { value: "Condeixa-a-Nova", label: "Condeixa-a-Nova" },
  { value: "Figueira da Foz", label: "Figueira da Foz" },
  { value: "Góis", label: "Góis" },
  { value: "Lousã", label: "Lousã" },
  { value: "Mira", label: "Mira" },
  { value: "Miranda do Corvo", label: "Miranda do Corvo" },
  { value: "Montemor-o-Velho", label: "Montemor-o-Velho" },
  { value: "Oliveira do Hospital", label: "Oliveira do Hospital" },
  { value: "Pampilhosa da Serra", label: "Pampilhosa da Serra" },
  { value: "Penacova", label: "Penacova" },
  { value: "Penela", label: "Penela" },
  { value: "Soure", label: "Soure" },
  { value: "Tábua", label: "Tábua" },
  { value: "Vila Nova de Poiares", label: "Vila Nova de Poiares" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE ÉVORA
  // ═══════════════════════════════════════════════════════════════
  { value: "Alandroal", label: "Alandroal" },
  { value: "Arraiolos", label: "Arraiolos" },
  { value: "Borba", label: "Borba" },
  { value: "Estremoz", label: "Estremoz" },
  { value: "Évora", label: "Évora" },
  { value: "Montemor-o-Novo", label: "Montemor-o-Novo" },
  { value: "Mora", label: "Mora" },
  { value: "Mourão", label: "Mourão" },
  { value: "Portel", label: "Portel" },
  { value: "Redondo", label: "Redondo" },
  { value: "Reguengos de Monsaraz", label: "Reguengos de Monsaraz" },
  { value: "Vendas Novas", label: "Vendas Novas" },
  { value: "Viana do Alentejo", label: "Viana do Alentejo" },
  { value: "Vila Viçosa", label: "Vila Viçosa" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE FARO (ALGARVE)
  // ═══════════════════════════════════════════════════════════════
  { value: "Albufeira", label: "Albufeira" },
  { value: "Alcoutim", label: "Alcoutim" },
  { value: "Aljezur", label: "Aljezur" },
  { value: "Castro Marim", label: "Castro Marim" },
  { value: "Faro", label: "Faro" },
  { value: "Lagoa", label: "Lagoa (Algarve)" },
  { value: "Lagos", label: "Lagos" },
  { value: "Loulé", label: "Loulé" },
  { value: "Monchique", label: "Monchique" },
  { value: "Olhão", label: "Olhão" },
  { value: "Portimão", label: "Portimão" },
  { value: "Quarteira", label: "Quarteira" },
  { value: "São Brás de Alportel", label: "São Brás de Alportel" },
  { value: "Silves", label: "Silves" },
  { value: "Tavira", label: "Tavira" },
  { value: "Vila do Bispo", label: "Vila do Bispo" },
  { value: "Vila Real de Santo António", label: "Vila Real de Santo António" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DA GUARDA
  // ═══════════════════════════════════════════════════════════════
  { value: "Aguiar da Beira", label: "Aguiar da Beira" },
  { value: "Almeida", label: "Almeida" },
  { value: "Celorico da Beira", label: "Celorico da Beira" },
  { value: "Figueira de Castelo Rodrigo", label: "Figueira de Castelo Rodrigo" },
  { value: "Fornos de Algodres", label: "Fornos de Algodres" },
  { value: "Gouveia", label: "Gouveia" },
  { value: "Guarda", label: "Guarda" },
  { value: "Manteigas", label: "Manteigas" },
  { value: "Mêda", label: "Mêda" },
  { value: "Pinhel", label: "Pinhel" },
  { value: "Sabugal", label: "Sabugal" },
  { value: "Seia", label: "Seia" },
  { value: "Trancoso", label: "Trancoso" },
  { value: "Vila Nova de Foz Côa", label: "Vila Nova de Foz Côa" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE LEIRIA
  // ═══════════════════════════════════════════════════════════════
  { value: "Alcobaça", label: "Alcobaça" },
  { value: "Alvaiázere", label: "Alvaiázere" },
  { value: "Ansião", label: "Ansião" },
  { value: "Batalha", label: "Batalha" },
  { value: "Bombarral", label: "Bombarral" },
  { value: "Caldas da Rainha", label: "Caldas da Rainha" },
  { value: "Castanheira de Pêra", label: "Castanheira de Pêra" },
  { value: "Figueiró dos Vinhos", label: "Figueiró dos Vinhos" },
  { value: "Leiria", label: "Leiria" },
  { value: "Marinha Grande", label: "Marinha Grande" },
  { value: "Nazaré", label: "Nazaré" },
  { value: "Óbidos", label: "Óbidos" },
  { value: "Pedrógão Grande", label: "Pedrógão Grande" },
  { value: "Peniche", label: "Peniche" },
  { value: "Pombal", label: "Pombal" },
  { value: "Porto de Mós", label: "Porto de Mós" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE LISBOA
  // ═══════════════════════════════════════════════════════════════
  { value: "Alenquer", label: "Alenquer" },
  { value: "Amadora", label: "Amadora" },
  { value: "Arruda dos Vinhos", label: "Arruda dos Vinhos" },
  { value: "Azambuja", label: "Azambuja" },
  { value: "Cadaval", label: "Cadaval" },
  { value: "Cascais", label: "Cascais" },
  { value: "Lisboa", label: "Lisboa" },
  { value: "Loures", label: "Loures" },
  { value: "Lourinhã", label: "Lourinhã" },
  { value: "Mafra", label: "Mafra" },
  { value: "Odivelas", label: "Odivelas" },
  { value: "Oeiras", label: "Oeiras" },
  { value: "Sintra", label: "Sintra" },
  { value: "Sobral de Monte Agraço", label: "Sobral de Monte Agraço" },
  { value: "Torres Vedras", label: "Torres Vedras" },
  { value: "Vila Franca de Xira", label: "Vila Franca de Xira" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE PORTALEGRE
  // ═══════════════════════════════════════════════════════════════
  { value: "Alter do Chão", label: "Alter do Chão" },
  { value: "Arronches", label: "Arronches" },
  { value: "Avis", label: "Avis" },
  { value: "Campo Maior", label: "Campo Maior" },
  { value: "Castelo de Vide", label: "Castelo de Vide" },
  { value: "Crato", label: "Crato" },
  { value: "Elvas", label: "Elvas" },
  { value: "Fronteira", label: "Fronteira" },
  { value: "Gavião", label: "Gavião" },
  { value: "Marvão", label: "Marvão" },
  { value: "Monforte", label: "Monforte" },
  { value: "Nisa", label: "Nisa" },
  { value: "Ponte de Sor", label: "Ponte de Sor" },
  { value: "Portalegre", label: "Portalegre" },
  { value: "Sousel", label: "Sousel" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DO PORTO
  // ═══════════════════════════════════════════════════════════════
  { value: "Amarante", label: "Amarante" },
  { value: "Baião", label: "Baião" },
  { value: "Felgueiras", label: "Felgueiras" },
  { value: "Gondomar", label: "Gondomar" },
  { value: "Lousada", label: "Lousada" },
  { value: "Maia", label: "Maia" },
  { value: "Marco de Canaveses", label: "Marco de Canaveses" },
  { value: "Matosinhos", label: "Matosinhos" },
  { value: "Paços de Ferreira", label: "Paços de Ferreira" },
  { value: "Paredes", label: "Paredes" },
  { value: "Penafiel", label: "Penafiel" },
  { value: "Porto", label: "Porto" },
  { value: "Póvoa de Varzim", label: "Póvoa de Varzim" },
  { value: "Santo Tirso", label: "Santo Tirso" },
  { value: "Trofa", label: "Trofa" },
  { value: "Valongo", label: "Valongo" },
  { value: "Vila do Conde", label: "Vila do Conde" },
  { value: "Vila Nova de Gaia", label: "Vila Nova de Gaia" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE SANTARÉM
  // ═══════════════════════════════════════════════════════════════
  { value: "Abrantes", label: "Abrantes" },
  { value: "Alcanena", label: "Alcanena" },
  { value: "Almeirim", label: "Almeirim" },
  { value: "Alpiarça", label: "Alpiarça" },
  { value: "Benavente", label: "Benavente" },
  { value: "Cartaxo", label: "Cartaxo" },
  { value: "Chamusca", label: "Chamusca" },
  { value: "Constância", label: "Constância" },
  { value: "Coruche", label: "Coruche" },
  { value: "Entroncamento", label: "Entroncamento" },
  { value: "Ferreira do Zêzere", label: "Ferreira do Zêzere" },
  { value: "Golegã", label: "Golegã" },
  { value: "Mação", label: "Mação" },
  { value: "Ourém", label: "Ourém" },
  { value: "Rio Maior", label: "Rio Maior" },
  { value: "Salvaterra de Magos", label: "Salvaterra de Magos" },
  { value: "Santarém", label: "Santarém" },
  { value: "Sardoal", label: "Sardoal" },
  { value: "Tomar", label: "Tomar" },
  { value: "Torres Novas", label: "Torres Novas" },
  { value: "Vila Nova da Barquinha", label: "Vila Nova da Barquinha" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE SETÚBAL
  // ═══════════════════════════════════════════════════════════════
  { value: "Alcácer do Sal", label: "Alcácer do Sal" },
  { value: "Alcochete", label: "Alcochete" },
  { value: "Almada", label: "Almada" },
  { value: "Barreiro", label: "Barreiro" },
  { value: "Grândola", label: "Grândola" },
  { value: "Moita", label: "Moita" },
  { value: "Montijo", label: "Montijo" },
  { value: "Palmela", label: "Palmela" },
  { value: "Santiago do Cacém", label: "Santiago do Cacém" },
  { value: "Seixal", label: "Seixal" },
  { value: "Sesimbra", label: "Sesimbra" },
  { value: "Setúbal", label: "Setúbal" },
  { value: "Sines", label: "Sines" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE VIANA DO CASTELO
  // ═══════════════════════════════════════════════════════════════
  { value: "Arcos de Valdevez", label: "Arcos de Valdevez" },
  { value: "Caminha", label: "Caminha" },
  { value: "Melgaço", label: "Melgaço" },
  { value: "Monção", label: "Monção" },
  { value: "Paredes de Coura", label: "Paredes de Coura" },
  { value: "Ponte da Barca", label: "Ponte da Barca" },
  { value: "Ponte de Lima", label: "Ponte de Lima" },
  { value: "Valença", label: "Valença" },
  { value: "Viana do Castelo", label: "Viana do Castelo" },
  { value: "Vila Nova de Cerveira", label: "Vila Nova de Cerveira" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE VILA REAL
  // ═══════════════════════════════════════════════════════════════
  { value: "Alijó", label: "Alijó" },
  { value: "Boticas", label: "Boticas" },
  { value: "Chaves", label: "Chaves" },
  { value: "Mesão Frio", label: "Mesão Frio" },
  { value: "Mondim de Basto", label: "Mondim de Basto" },
  { value: "Montalegre", label: "Montalegre" },
  { value: "Murça", label: "Murça" },
  { value: "Peso da Régua", label: "Peso da Régua" },
  { value: "Ribeira de Pena", label: "Ribeira de Pena" },
  { value: "Sabrosa", label: "Sabrosa" },
  { value: "Santa Marta de Penaguião", label: "Santa Marta de Penaguião" },
  { value: "Valpaços", label: "Valpaços" },
  { value: "Vila Pouca de Aguiar", label: "Vila Pouca de Aguiar" },
  { value: "Vila Real", label: "Vila Real" },
  
  // ═══════════════════════════════════════════════════════════════
  // DISTRITO DE VISEU
  // ═══════════════════════════════════════════════════════════════
  { value: "Armamar", label: "Armamar" },
  { value: "Carregal do Sal", label: "Carregal do Sal" },
  { value: "Castro Daire", label: "Castro Daire" },
  { value: "Cinfães", label: "Cinfães" },
  { value: "Lamego", label: "Lamego" },
  { value: "Mangualde", label: "Mangualde" },
  { value: "Moimenta da Beira", label: "Moimenta da Beira" },
  { value: "Mortágua", label: "Mortágua" },
  { value: "Nelas", label: "Nelas" },
  { value: "Oliveira de Frades", label: "Oliveira de Frades" },
  { value: "Penalva do Castelo", label: "Penalva do Castelo" },
  { value: "Penedono", label: "Penedono" },
  { value: "Resende", label: "Resende" },
  { value: "Santa Comba Dão", label: "Santa Comba Dão" },
  { value: "São João da Pesqueira", label: "São João da Pesqueira" },
  { value: "São Pedro do Sul", label: "São Pedro do Sul" },
  { value: "Sátão", label: "Sátão" },
  { value: "Sernancelhe", label: "Sernancelhe" },
  { value: "Tabuaço", label: "Tabuaço" },
  { value: "Tarouca", label: "Tarouca" },
  { value: "Tondela", label: "Tondela" },
  { value: "Vila Nova de Paiva", label: "Vila Nova de Paiva" },
  { value: "Viseu", label: "Viseu" },
  { value: "Vouzela", label: "Vouzela" },
  
  // ═══════════════════════════════════════════════════════════════
  // REGIÃO AUTÓNOMA DOS AÇORES
  // ═══════════════════════════════════════════════════════════════
  { value: "Angra do Heroísmo", label: "Angra do Heroísmo (Terceira)" },
  { value: "Calheta (Açores)", label: "Calheta (São Jorge)" },
  { value: "Corvo", label: "Corvo" },
  { value: "Horta", label: "Horta (Faial)" },
  { value: "Lagoa (Açores)", label: "Lagoa (São Miguel)" },
  { value: "Lajes das Flores", label: "Lajes das Flores" },
  { value: "Lajes do Pico", label: "Lajes do Pico" },
  { value: "Madalena", label: "Madalena (Pico)" },
  { value: "Nordeste", label: "Nordeste (São Miguel)" },
  { value: "Ponta Delgada", label: "Ponta Delgada (São Miguel)" },
  { value: "Povoação", label: "Povoação (São Miguel)" },
  { value: "Praia da Vitória", label: "Praia da Vitória (Terceira)" },
  { value: "Ribeira Grande", label: "Ribeira Grande (São Miguel)" },
  { value: "Santa Cruz da Graciosa", label: "Santa Cruz da Graciosa" },
  { value: "Santa Cruz das Flores", label: "Santa Cruz das Flores" },
  { value: "São Roque do Pico", label: "São Roque do Pico" },
  { value: "Velas", label: "Velas (São Jorge)" },
  { value: "Vila do Porto", label: "Vila do Porto (Santa Maria)" },
  { value: "Vila Franca do Campo", label: "Vila Franca do Campo (São Miguel)" },
  
  // ═══════════════════════════════════════════════════════════════
  // REGIÃO AUTÓNOMA DA MADEIRA
  // ═══════════════════════════════════════════════════════════════
  { value: "Calheta (Madeira)", label: "Calheta (Madeira)" },
  { value: "Câmara de Lobos", label: "Câmara de Lobos" },
  { value: "Funchal", label: "Funchal" },
  { value: "Machico", label: "Machico" },
  { value: "Ponta do Sol", label: "Ponta do Sol" },
  { value: "Porto Moniz", label: "Porto Moniz" },
  { value: "Porto Santo", label: "Porto Santo" },
  { value: "Ribeira Brava", label: "Ribeira Brava" },
  { value: "Santa Cruz (Madeira)", label: "Santa Cruz (Madeira)" },
  { value: "Santana", label: "Santana" },
  { value: "São Vicente", label: "São Vicente" },
];

export default function GoogleLocalProspecting() {
  const [searchQuery, setSearchQuery] = useState("");
  const [location, setLocation] = useState("");
  const [locationOpen, setLocationOpen] = useState(false);
  const [locationSearch, setLocationSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<GooglePlaceResult[]>([]);
  const [selectedResults, setSelectedResults] = useState<string[]>([]);
  const [importedIds, setImportedIds] = useState<string[]>([]);
  
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoImport, setAutoImport] = useState(false);
  const [defaultStatus, setDefaultStatus] = useState("new");
  const [minRating, setMinRating] = useState("4");
  
  const createLead = useCreateLead();
  const { usage, consumeCredits, hasCredits } = useCredits("google_local");
  const { data: recentLeads = [] } = useLeads({ 
    status: undefined 
  });
  
  // Filter leads from google_local source
  const prospectionLeads = recentLeads
    .filter(lead => lead.source === "google_local")
    .slice(0, 10);

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    if (!locationSearch) return LOCATIONS;
    const search = locationSearch.toLowerCase();
    return LOCATIONS.filter(loc => 
      loc.label.toLowerCase().includes(search) || 
      loc.value.toLowerCase().includes(search)
    );
  }, [locationSearch]);

  // Get selected location label
  const selectedLocationLabel = useMemo(() => {
    if (!location || location === "all-locations") return "Todas as localidades";
    const found = LOCATIONS.find(loc => loc.value === location);
    return found?.label || location;
  }, [location]);

  const handleSearch = async () => {
    if (!searchQuery.trim() && !location.trim()) {
      toast.error("Introduza um termo de pesquisa ou localização");
      return;
    }

    if (!hasCredits) {
      toast.error("Sem créditos disponíveis", {
        description: "Adquira mais créditos para continuar a pesquisar"
      });
      return;
    }

    setIsSearching(true);
    
    // Consume 1 credit for the search
    try {
      await consumeCredits.mutateAsync({
        credits: 1,
        actionKey: "search",
        actionDescription: `Pesquisa: ${searchQuery} em ${location || "Portugal"}`,
      });
    } catch (error) {
      console.error("Error consuming credits:", error);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    let filteredResults: GooglePlaceResult[] = [];
    
    if (category === "all") {
      filteredResults = Object.values(MOCK_DATABASE).flat();
    } else {
      filteredResults = MOCK_DATABASE[category] || [];
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filteredResults = filteredResults.filter(result => 
        result.title.toLowerCase().includes(query) ||
        result.category.toLowerCase().includes(query) ||
        result.description?.toLowerCase().includes(query) ||
        result.services?.some(s => s.toLowerCase().includes(query))
      );
    }
    
    if (location && location !== "all-locations") {
      const loc = location.toLowerCase();
      filteredResults = filteredResults.filter(result =>
        result.address.toLowerCase().includes(loc)
      );
    }
    
    setResults(filteredResults);
    setIsSearching(false);
    setImportedIds([]);
    
    if (filteredResults.length > 0) {
      toast.success(`Encontrados ${filteredResults.length} resultados`);
    } else {
      toast.info("Nenhum resultado encontrado");
    }
  };

  const toggleSelection = (id: string) => {
    setSelectedResults(prev => 
      prev.includes(id) 
        ? prev.filter(x => x !== id)
        : [...prev, id]
    );
  };

  const importLeads = async (leadsToImport: GooglePlaceResult[]) => {
    let successCount = 0;
    
    for (const result of leadsToImport) {
      try {
        await createLead.mutateAsync({
          name: result.title,
          phone: result.phone || undefined,
          source: "google_local",
          status: "new",
        });
        setImportedIds(prev => [...prev, result.id]);
        successCount++;
      } catch (error) {
        console.error("Error importing lead:", error);
      }
    }
    
    return successCount;
  };

  const handleImportSelected = async () => {
    if (selectedResults.length === 0) {
      toast.error("Selecione pelo menos um resultado para importar");
      return;
    }
    
    const leadsToImport = results.filter(r => selectedResults.includes(r.id));
    const count = await importLeads(leadsToImport);
    
    toast.success(`${count} leads importados com sucesso!`);
    setSelectedResults([]);
  };

  const handleImportAll = async () => {
    const leadsToImport = results.filter(r => !importedIds.includes(r.id));
    const count = await importLeads(leadsToImport);
    toast.success(`${count} leads importados com sucesso!`);
  };

  return (
    <div className="space-y-6">
      <PageBreadcrumbs 
        items={[
          { label: "Prospecção", href: "/dashboard/prospecting/google-local" },
          { label: "Google Local" }
        ]}
      />

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MapPin className="h-8 w-8 text-primary" />
            Google Local Services
          </h1>
          <p className="text-muted-foreground mt-1">
            Pesquise e importe leads diretamente do Google Maps
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                Configurações
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações de Prospecção</DialogTitle>
                <DialogDescription>
                  Configure as opções de pesquisa e importação de leads
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label>Estado padrão dos leads importados</Label>
                  <Select value={defaultStatus} onValueChange={setDefaultStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="new">Novo</SelectItem>
                      <SelectItem value="contacted">Contactado</SelectItem>
                      <SelectItem value="qualified">Qualificado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Rating mínimo para mostrar</Label>
                  <Select value={minRating} onValueChange={setMinRating}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">Todos</SelectItem>
                      <SelectItem value="3">3+ estrelas</SelectItem>
                      <SelectItem value="4">4+ estrelas</SelectItem>
                      <SelectItem value="4.5">4.5+ estrelas</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Importação automática</Label>
                    <p className="text-sm text-muted-foreground">
                      Importar leads automaticamente ao pesquisar
                    </p>
                  </div>
                  <Switch checked={autoImport} onCheckedChange={setAutoImport} />
                </div>
              </div>
              <div className="flex justify-end">
                <Button onClick={() => {
                  setSettingsOpen(false);
                  toast.success("Configurações guardadas");
                }}>
                  Guardar
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          <Badge variant="outline" className="gap-2 py-2 px-3">
            <CreditCard className="h-4 w-4" />
            {usage.used}/{usage.total} créditos
          </Badge>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Search Form */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Pesquisar Empresas
              </CardTitle>
              <CardDescription>
                Pesquise por tipo de negócio, nome ou serviço e filtre por localização
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-3">
                <div>
                  <Input
                    placeholder="Ex: restaurantes, advogados..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>
                <div>
                  <Popover open={locationOpen} onOpenChange={setLocationOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        role="combobox"
                        aria-expanded={locationOpen}
                        className="w-full justify-between font-normal"
                      >
                        <span className="truncate">
                          {selectedLocationLabel}
                        </span>
                        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                      <Command shouldFilter={false}>
                        <CommandInput 
                          placeholder="Pesquisar localidade..." 
                          value={locationSearch}
                          onValueChange={setLocationSearch}
                        />
                        <CommandList>
                          <CommandEmpty>Nenhuma localidade encontrada.</CommandEmpty>
                          <CommandGroup>
                            <ScrollArea className="h-[300px]">
                              {filteredLocations.map((loc) => (
                                <CommandItem
                                  key={loc.value || "all"}
                                  value={loc.value || "all-locations"}
                                  onSelect={(value) => {
                                    setLocation(value === "all-locations" ? "" : value);
                                    setLocationOpen(false);
                                    setLocationSearch("");
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      location === loc.value || (!location && !loc.value) 
                                        ? "opacity-100" 
                                        : "opacity-0"
                                    )}
                                  />
                                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                                  {loc.label}
                                </CommandItem>
                              ))}
                            </ScrollArea>
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                </div>
                <div>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map(cat => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <Button onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      A pesquisar...
                    </>
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Pesquisar (1 crédito)
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          {results.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Resultados ({results.length})</CardTitle>
                    <CardDescription>
                      {selectedResults.length > 0 
                        ? `${selectedResults.length} selecionados`
                        : "Selecione os resultados que pretende importar"
                      }
                    </CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={handleImportSelected}
                      disabled={selectedResults.length === 0 || createLead.isPending}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Importar ({selectedResults.length})
                    </Button>
                    <Button 
                      onClick={handleImportAll}
                      disabled={createLead.isPending}
                    >
                      <UserPlus className="mr-2 h-4 w-4" />
                      Importar Todos
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className={`p-4 rounded-lg border transition-colors ${
                          importedIds.includes(result.id)
                            ? "border-green-500 bg-green-500/5"
                            : selectedResults.includes(result.id)
                            ? "border-primary bg-primary/5"
                            : "hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <Checkbox
                            checked={selectedResults.includes(result.id)}
                            onCheckedChange={() => toggleSelection(result.id)}
                            disabled={importedIds.includes(result.id)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div>
                                <h3 className="font-semibold flex items-center gap-2">
                                  {result.title}
                                  {importedIds.includes(result.id) && (
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                      <CheckCircle2 className="h-3 w-3 mr-1" />
                                      Importado
                                    </Badge>
                                  )}
                                </h3>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {result.category}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-1 text-amber-500">
                                <Star className="h-4 w-4 fill-current" />
                                <span className="font-medium">{result.rating}</span>
                                <span className="text-muted-foreground text-xs">
                                  ({result.reviews_count})
                                </span>
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {result.description}
                            </p>

                            <div className="flex flex-wrap gap-3 text-xs">
                              <span className="flex items-center gap-1 text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                {result.address}
                              </span>
                              {result.phone && (
                                <span className="flex items-center gap-1 text-muted-foreground">
                                  <Phone className="h-3 w-3" />
                                  {result.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}

          {/* Empty State */}
          {results.length === 0 && !isSearching && (
            <Card>
              <CardContent className="py-16 text-center">
                <MapPin className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">Comece a prospectar</h3>
                <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                  Pesquise por tipo de negócio para encontrar leads qualificados.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* History Sidebar */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-4 w-4" />
                Leads Importados
              </CardTitle>
              <CardDescription>
                Últimos leads importados do Google Local
              </CardDescription>
            </CardHeader>
            <CardContent>
              {prospectionLeads.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum lead importado ainda
                </p>
              ) : (
                <div className="space-y-3">
                  {prospectionLeads.map((lead) => (
                    <div key={lead.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50">
                      <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{lead.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lead.created_at).toLocaleDateString('pt-PT')}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs shrink-0">
                        {lead.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
