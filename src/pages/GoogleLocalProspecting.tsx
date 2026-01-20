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
    // Lisboa
    { id: "h1", title: "Clínica Médica São Lucas", rating: 4.8, reviews_count: 312, address: "Av. da Liberdade 45, Lisboa", phone: "+351 21 345 6789", website: "https://clinicasaolucas.pt", category: "Clínica Médica", hours: "08:00 - 20:00", description: "Clínica multidisciplinar com especialidades", services: ["Medicina Geral", "Cardiologia", "Dermatologia"] },
    { id: "h2", title: "Centro de Fisioterapia Lisboa", rating: 4.6, reviews_count: 187, address: "Rua Augusta 123, Lisboa", phone: "+351 21 456 7890", website: "https://fisioterapialisboa.pt", category: "Fisioterapia", hours: "09:00 - 19:00", description: "Centro especializado em reabilitação física", services: ["Fisioterapia", "Reabilitação", "Pilates Clínico"] },
    { id: "h3", title: "Clínica Dentária Sorriso Perfeito", rating: 4.9, reviews_count: 423, address: "Praça do Comércio 67, Lisboa", phone: "+351 21 567 8901", website: "https://sorrisoperfeito.pt", category: "Clínica Dentária", hours: "09:00 - 19:00", description: "Clínica moderna de ortodontia e implantes", services: ["Ortodontia", "Implantes", "Branqueamento"] },
    // Porto
    { id: "h4", title: "Hospital CUF Porto", rating: 4.9, reviews_count: 567, address: "Av. da Boavista 1234, Porto", phone: "+351 22 123 4567", website: "https://cufporto.pt", category: "Hospital", hours: "24 horas", description: "Hospital privado com todas as especialidades", services: ["Urgência", "Internamento", "Cirurgia"] },
    { id: "h5", title: "Clínica Médica Ribeira", rating: 4.7, reviews_count: 234, address: "Rua das Flores 56, Porto", phone: "+351 22 234 5678", category: "Clínica Médica", hours: "08:00 - 20:00", description: "Clínica médica no centro do Porto", services: ["Medicina Geral", "Pediatria", "Ginecologia"] },
    // Braga
    { id: "h6", title: "Clínica São Geraldo", rating: 4.6, reviews_count: 198, address: "Av. Central 78, Braga", phone: "+351 253 123 456", category: "Clínica Médica", hours: "08:00 - 19:00", description: "Clínica de referência em Braga", services: ["Medicina Geral", "Ortopedia", "Fisioterapia"] },
    // Coimbra
    { id: "h7", title: "Centro Médico de Coimbra", rating: 4.8, reviews_count: 345, address: "Praça da República 23, Coimbra", phone: "+351 239 123 456", website: "https://cmcoimbra.pt", category: "Centro Médico", hours: "08:00 - 20:00", description: "Centro médico junto à Universidade", services: ["Clínica Geral", "Nutrição", "Psicologia"] },
    // Faro
    { id: "h8", title: "Clínica do Algarve", rating: 4.5, reviews_count: 156, address: "Av. 5 de Outubro 89, Faro", phone: "+351 289 123 456", category: "Clínica Médica", hours: "09:00 - 18:00", description: "Clínica médica no centro de Faro", services: ["Medicina Geral", "Dermatologia"] },
    // Setúbal
    { id: "h9", title: "Hospital Particular Setúbal", rating: 4.7, reviews_count: 289, address: "Av. Luísa Todi 45, Setúbal", phone: "+351 265 123 456", website: "https://hpsetubal.pt", category: "Hospital", hours: "24 horas", description: "Hospital privado em Setúbal", services: ["Urgência", "Consultas", "Exames"] },
    // Aveiro
    { id: "h10", title: "Clínica Médica Aveiro", rating: 4.6, reviews_count: 178, address: "Rua do Canal 34, Aveiro", phone: "+351 234 123 456", category: "Clínica Médica", hours: "08:00 - 19:00", description: "Clínica junto à Ria de Aveiro", services: ["Medicina Familiar", "Pediatria"] },
    // Leiria
    { id: "h11", title: "Centro de Saúde Leiria", rating: 4.4, reviews_count: 167, address: "Rua dos Mártires 12, Leiria", phone: "+351 244 123 456", category: "Centro de Saúde", hours: "08:00 - 18:00", description: "Centro de saúde com várias especialidades", services: ["Clínica Geral", "Vacinação"] },
    // Funchal
    { id: "h12", title: "Clínica Santa Catarina", rating: 4.8, reviews_count: 234, address: "Rua da Carreira 67, Funchal", phone: "+351 291 123 456", website: "https://clinicasantacatarina.pt", category: "Clínica Médica", hours: "08:00 - 20:00", description: "Clínica de referência na Madeira", services: ["Medicina Geral", "Cardiologia", "Oftalmologia"] },
    // Viseu
    { id: "h13", title: "Hospital Privado Viseu", rating: 4.5, reviews_count: 145, address: "Av. Alberto Sampaio 90, Viseu", phone: "+351 232 123 456", category: "Hospital", hours: "24 horas", description: "Hospital privado no centro de Viseu", services: ["Consultas", "Cirurgia", "Urgência"] },
    // Vila Nova de Gaia
    { id: "h14", title: "Clínica Gaia Saúde", rating: 4.6, reviews_count: 198, address: "Av. da República 234, Vila Nova de Gaia", phone: "+351 22 345 6789", category: "Clínica Médica", hours: "08:00 - 20:00", description: "Clínica multidisciplinar em Gaia", services: ["Medicina Geral", "Ortopedia", "Fisioterapia"] },
    // Guimarães
    { id: "h15", title: "Centro Médico Vitasaúde", rating: 4.7, reviews_count: 176, address: "Largo do Toural 15, Guimarães", phone: "+351 253 456 789", category: "Centro Médico", hours: "08:00 - 19:00", description: "Centro médico no berço de Portugal", services: ["Clínica Geral", "Pediatria", "Ginecologia"] },
  ],
  restaurant: [
    // Lisboa
    { id: "r1", title: "Restaurante O Pescador", rating: 4.5, reviews_count: 234, address: "Rua da Praia 123, Lisboa", phone: "+351 21 123 4567", website: "https://opescador.pt", category: "Restaurante", hours: "12:00 - 23:00", description: "Restaurante de marisco tradicional", services: ["Entrega ao domicílio", "Reservas"] },
    { id: "r2", title: "Tasca do Chico", rating: 4.7, reviews_count: 567, address: "Bairro Alto, Lisboa", phone: "+351 21 234 5678", category: "Restaurante Tradicional", hours: "19:00 - 02:00", description: "Tasca típica com fado ao vivo", services: ["Fado ao Vivo", "Reservas"] },
    // Porto
    { id: "r3", title: "Casa da Música Restaurante", rating: 4.8, reviews_count: 456, address: "Av. da Boavista 604, Porto", phone: "+351 22 345 6789", website: "https://casamusicarestaurante.pt", category: "Restaurante Moderno", hours: "12:00 - 24:00", description: "Restaurante gourmet junto à Casa da Música", services: ["Reservas", "Eventos"] },
    { id: "r4", title: "Cervejaria Brasão", rating: 4.6, reviews_count: 789, address: "Rua das Flores 89, Porto", phone: "+351 22 456 7890", category: "Cervejaria", hours: "12:00 - 23:00", description: "Famosa pelos francesinha", services: ["Takeaway", "Reservas"] },
    // Braga
    { id: "r5", title: "Restaurante Brac", rating: 4.7, reviews_count: 234, address: "Campo das Hortas 4, Braga", phone: "+351 253 234 567", category: "Restaurante", hours: "12:00 - 15:00, 19:00 - 23:00", description: "Cozinha portuguesa moderna", services: ["Reservas", "Grupos"] },
    // Coimbra
    { id: "r6", title: "Restaurante Arcadas", rating: 4.5, reviews_count: 345, address: "Rua Ferreira Borges 56, Coimbra", phone: "+351 239 345 678", category: "Restaurante Tradicional", hours: "12:00 - 22:00", description: "Cozinha regional de Coimbra", services: ["Reservas", "Wi-Fi"] },
    // Faro
    { id: "r7", title: "Restaurante Ria Formosa", rating: 4.8, reviews_count: 278, address: "Doca de Faro, Faro", phone: "+351 289 456 789", website: "https://riaformosa.pt", category: "Restaurante de Peixe", hours: "12:00 - 23:00", description: "Peixe fresco com vista para a Ria", services: ["Reservas", "Esplanada"] },
    // Cascais
    { id: "r8", title: "Casa da Guia", rating: 4.6, reviews_count: 456, address: "Av. Nossa Senhora do Cabo, Cascais", phone: "+351 21 567 8901", category: "Restaurante", hours: "12:00 - 24:00", description: "Restaurante com vista mar em Cascais", services: ["Reservas", "Eventos"] },
    // Sintra
    { id: "r9", title: "Restaurante Palácio", rating: 4.7, reviews_count: 234, address: "Centro Histórico, Sintra", phone: "+351 21 678 9012", category: "Restaurante Tradicional", hours: "12:00 - 22:00", description: "Cozinha tradicional em Sintra", services: ["Reservas", "Grupos turísticos"] },
    // Albufeira
    { id: "r10", title: "Restaurante Mar Azul", rating: 4.5, reviews_count: 567, address: "Praia dos Pescadores, Albufeira", phone: "+351 289 567 890", category: "Restaurante de Praia", hours: "10:00 - 24:00", description: "Marisco fresco na praia", services: ["Reservas", "Esplanada"] },
    // Matosinhos
    { id: "r11", title: "Marisqueira Matosinhos", rating: 4.9, reviews_count: 678, address: "Rua Heróis de França, Matosinhos", phone: "+351 22 789 0123", category: "Marisqueira", hours: "12:00 - 23:00", description: "Marisco fresco junto ao porto", services: ["Reservas", "Grupos"] },
    // Évora
    { id: "r12", title: "Fialho Restaurante", rating: 4.8, reviews_count: 345, address: "Travessa das Mascarenhas 16, Évora", phone: "+351 266 123 456", category: "Restaurante Tradicional", hours: "12:00 - 15:00, 19:00 - 22:00", description: "Gastronomia alentejana tradicional", services: ["Reservas"] },
    // Portimão
    { id: "r13", title: "Restaurante Titanic", rating: 4.6, reviews_count: 456, address: "Largo da Barca, Portimão", phone: "+351 282 234 567", category: "Restaurante de Peixe", hours: "12:00 - 23:00", description: "Peixe grelhado junto ao rio", services: ["Reservas", "Esplanada"] },
  ],
  auto: [
    // Lisboa
    { id: "a1", title: "Auto Mecânica Lisboa", rating: 4.8, reviews_count: 156, address: "Av. Almirante Reis 456, Lisboa", phone: "+351 21 345 6789", website: "https://automecanicalisboa.pt", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina especializada", services: ["Revisões", "Pneus", "Diagnóstico"] },
    { id: "a2", title: "Centro de Inspeções Lisboa", rating: 4.3, reviews_count: 890, address: "Zona Industrial, Lisboa", phone: "+351 21 456 7890", category: "Centro de Inspeções", hours: "08:00 - 19:00", description: "Centro de inspeções certificado", services: ["Inspeção Periódica"] },
    // Porto
    { id: "a3", title: "Auto Reparadora do Porto", rating: 4.7, reviews_count: 234, address: "Rua de Campanhã 234, Porto", phone: "+351 22 567 8901", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina de confiança no Porto", services: ["Mecânica", "Eletricidade Auto"] },
    { id: "a4", title: "Pneumáticos Norte", rating: 4.5, reviews_count: 178, address: "Via Norte, Porto", phone: "+351 22 678 9012", category: "Pneus", hours: "08:00 - 19:00", description: "Especialistas em pneus", services: ["Pneus", "Alinhamento", "Equilibragem"] },
    // Braga
    { id: "a5", title: "Oficina Auto Braga", rating: 4.6, reviews_count: 145, address: "Zona Industrial de Braga, Braga", phone: "+351 253 345 678", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina multimarca em Braga", services: ["Revisões", "Mecânica Geral"] },
    // Setúbal
    { id: "a6", title: "Centro Auto Setúbal", rating: 4.4, reviews_count: 167, address: "Av. Luísa Todi 234, Setúbal", phone: "+351 265 456 789", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina em Setúbal", services: ["Mecânica", "Ar Condicionado"] },
    // Faro
    { id: "a7", title: "Auto Algarve", rating: 4.5, reviews_count: 198, address: "Zona Industrial, Faro", phone: "+351 289 567 890", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina no Algarve", services: ["Mecânica", "Elétrica"] },
    // Aveiro
    { id: "a8", title: "Oficina Central Aveiro", rating: 4.6, reviews_count: 134, address: "Rua da Estação 45, Aveiro", phone: "+351 234 234 567", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina no centro de Aveiro", services: ["Revisões", "Diagnóstico"] },
    // Coimbra
    { id: "a9", title: "Auto Mondego", rating: 4.7, reviews_count: 189, address: "Zona Industrial Norton de Matos, Coimbra", phone: "+351 239 456 789", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina de referência em Coimbra", services: ["Mecânica", "Chapa e Pintura"] },
    // Vila Nova de Gaia
    { id: "a10", title: "Oficina Gaia Motors", rating: 4.5, reviews_count: 156, address: "Av. da República 567, Vila Nova de Gaia", phone: "+351 22 890 1234", category: "Oficina Automóvel", hours: "08:00 - 18:00", description: "Oficina multimarca em Gaia", services: ["Revisões", "Mecânica"] },
  ],
  services: [
    // Lisboa
    { id: "s1", title: "Contabilidade & Consultoria Lda", rating: 4.3, reviews_count: 45, address: "Rua do Comércio 321, Lisboa", phone: "+351 21 111 2222", website: "https://contabilidadeconsultoria.pt", category: "Contabilidade", hours: "09:00 - 18:00", description: "Serviços de contabilidade e consultoria", services: ["Contabilidade", "IRS", "IRC"] },
    { id: "s2", title: "Advogados Associados Lisboa", rating: 4.6, reviews_count: 123, address: "Av. da República 100, Lisboa", phone: "+351 21 222 3333", website: "https://advogadoslisboa.pt", category: "Escritório de Advogados", hours: "09:00 - 18:00", description: "Escritório de advogados", services: ["Direito Comercial", "Direito Laboral"] },
    // Porto
    { id: "s3", title: "Gabinete Jurídico Porto", rating: 4.7, reviews_count: 167, address: "Rua de Santa Catarina 456, Porto", phone: "+351 22 333 4444", category: "Advogados", hours: "09:00 - 18:00", description: "Gabinete de advogados no Porto", services: ["Direito Civil", "Direito Penal"] },
    { id: "s4", title: "Contabilidade Norte", rating: 4.5, reviews_count: 98, address: "Rua do Almada 78, Porto", phone: "+351 22 444 5555", category: "Contabilidade", hours: "09:00 - 18:00", description: "Serviços contabilísticos", services: ["Contabilidade", "Fiscalidade"] },
    // Braga
    { id: "s5", title: "Seguros Minho", rating: 4.4, reviews_count: 87, address: "Av. Central 34, Braga", phone: "+351 253 555 666", category: "Seguros", hours: "09:00 - 18:00", description: "Mediação de seguros em Braga", services: ["Seguros Auto", "Seguros Vida", "Seguros Saúde"] },
    // Coimbra
    { id: "s6", title: "Imobiliária Mondego", rating: 4.6, reviews_count: 134, address: "Praça 8 de Maio 12, Coimbra", phone: "+351 239 666 777", category: "Imobiliária", hours: "09:00 - 19:00", description: "Imobiliária em Coimbra", services: ["Venda", "Arrendamento", "Avaliações"] },
    // Faro
    { id: "s7", title: "Algarve Properties", rating: 4.8, reviews_count: 234, address: "Av. 5 de Outubro 56, Faro", phone: "+351 289 777 888", website: "https://algarveproperties.pt", category: "Imobiliária", hours: "09:00 - 19:00", description: "Imobiliária no Algarve", services: ["Venda", "Arrendamento", "Gestão"] },
    // Setúbal
    { id: "s8", title: "Advogados Setúbal", rating: 4.5, reviews_count: 67, address: "Av. Luísa Todi 123, Setúbal", phone: "+351 265 888 999", category: "Advogados", hours: "09:00 - 18:00", description: "Escritório de advogados", services: ["Direito Civil", "Família"] },
    // Funchal
    { id: "s9", title: "Madeira Contabilidade", rating: 4.6, reviews_count: 89, address: "Rua da Carreira 89, Funchal", phone: "+351 291 999 000", category: "Contabilidade", hours: "09:00 - 18:00", description: "Contabilidade na Madeira", services: ["Contabilidade", "Fiscalidade"] },
    // Viseu
    { id: "s10", title: "Seguros Centro", rating: 4.4, reviews_count: 56, address: "Rua Formosa 23, Viseu", phone: "+351 232 111 222", category: "Seguros", hours: "09:00 - 18:00", description: "Mediação de seguros", services: ["Seguros Auto", "Multirriscos"] },
  ],
  retail: [
    // Lisboa
    { id: "rt1", title: "Loja de Eletrónica TechZone", rating: 4.2, reviews_count: 234, address: "Centro Comercial Colombo, Lisboa", phone: "+351 21 333 4444", website: "https://techzone.pt", category: "Loja de Eletrónica", hours: "10:00 - 23:00", description: "Loja de eletrónica e informática", services: ["Reparações", "Assistência Técnica"] },
    { id: "rt2", title: "Moda Lisboa", rating: 4.5, reviews_count: 178, address: "Avenida Roma 56, Lisboa", phone: "+351 21 444 5555", category: "Loja de Roupa", hours: "10:00 - 20:00", description: "Moda feminina e masculina", services: ["Ajustes", "Personal Shopper"] },
    // Porto
    { id: "rt3", title: "Livraria Lello", rating: 4.9, reviews_count: 2345, address: "Rua das Carmelitas 144, Porto", phone: "+351 22 555 6666", website: "https://livrarialello.pt", category: "Livraria", hours: "09:00 - 19:00", description: "Livraria histórica do Porto", services: ["Livros", "Eventos"] },
    { id: "rt4", title: "Porto Tech Store", rating: 4.4, reviews_count: 189, address: "NorteShopping, Porto", phone: "+351 22 666 7777", category: "Loja de Eletrónica", hours: "10:00 - 23:00", description: "Tecnologia e gadgets", services: ["Venda", "Reparações"] },
    // Braga
    { id: "rt5", title: "Papelaria Académica", rating: 4.3, reviews_count: 123, address: "Rua do Souto 45, Braga", phone: "+351 253 777 888", category: "Papelaria", hours: "09:00 - 19:00", description: "Papelaria e material escolar", services: ["Material Escolar", "Impressões"] },
    // Coimbra
    { id: "rt6", title: "Livraria Académica Coimbra", rating: 4.7, reviews_count: 456, address: "Rua Ferreira Borges 78, Coimbra", phone: "+351 239 888 999", category: "Livraria", hours: "09:00 - 19:00", description: "Livraria junto à Universidade", services: ["Livros", "Material Académico"] },
    // Cascais
    { id: "rt7", title: "Surf Shop Cascais", rating: 4.6, reviews_count: 234, address: "Av. Marginal 234, Cascais", phone: "+351 21 999 0000", category: "Loja de Surf", hours: "10:00 - 20:00", description: "Artigos de surf e praia", services: ["Equipamento", "Aulas"] },
    // Albufeira
    { id: "rt8", title: "Algarve Souvenirs", rating: 4.2, reviews_count: 567, address: "Rua 5 de Outubro, Albufeira", phone: "+351 289 111 222", category: "Loja de Souvenirs", hours: "10:00 - 24:00", description: "Lembranças do Algarve", services: ["Souvenirs", "Artesanato"] },
  ],
  construction: [
    // Lisboa
    { id: "c1", title: "Construções Lisboa Lda", rating: 4.4, reviews_count: 78, address: "Zona Industrial Sacavém, Lisboa", phone: "+351 21 444 5555", website: "https://construcoeslisboa.pt", category: "Construção Civil", hours: "08:00 - 17:00", description: "Empresa de construção civil", services: ["Construção", "Remodelação", "Pintura"] },
    // Porto
    { id: "c2", title: "Construções Norte", rating: 4.6, reviews_count: 134, address: "Zona Industrial Maia, Porto", phone: "+351 22 555 6666", category: "Construção Civil", hours: "08:00 - 17:00", description: "Construção e remodelação", services: ["Construção", "Renovação"] },
    { id: "c3", title: "Eletricista Porto", rating: 4.7, reviews_count: 89, address: "Rua da Alegria 123, Porto", phone: "+351 22 666 7777", category: "Eletricista", hours: "08:00 - 18:00", description: "Serviços elétricos", services: ["Instalações", "Reparações", "Certificações"] },
    // Braga
    { id: "c4", title: "Remodelações Minho", rating: 4.5, reviews_count: 67, address: "Zona Industrial Celeirós, Braga", phone: "+351 253 777 888", category: "Remodelações", hours: "08:00 - 17:00", description: "Especialistas em remodelações", services: ["Remodelação", "Decoração"] },
    // Setúbal
    { id: "c5", title: "Canalizador Setúbal", rating: 4.3, reviews_count: 56, address: "Prainha, Setúbal", phone: "+351 265 888 999", category: "Canalizador", hours: "08:00 - 18:00", description: "Serviços de canalização", services: ["Canalização", "Aquecimento"] },
    // Faro
    { id: "c6", title: "Construções Algarve", rating: 4.6, reviews_count: 145, address: "Zona Industrial Loulé, Faro", phone: "+351 289 999 000", category: "Construção Civil", hours: "08:00 - 17:00", description: "Construção no Algarve", services: ["Construção", "Piscinas", "Jardins"] },
    // Aveiro
    { id: "c7", title: "Pinturas Aveiro", rating: 4.4, reviews_count: 78, address: "Rua de Viseu 34, Aveiro", phone: "+351 234 111 222", category: "Pintor", hours: "08:00 - 18:00", description: "Serviços de pintura", services: ["Pintura Interior", "Pintura Exterior"] },
    // Coimbra
    { id: "c8", title: "Carpintaria Mondego", rating: 4.7, reviews_count: 123, address: "Zona Industrial Taveiro, Coimbra", phone: "+351 239 222 333", category: "Carpintaria", hours: "08:00 - 17:00", description: "Carpintaria e marcenaria", services: ["Móveis", "Portas", "Janelas"] },
    // Viseu
    { id: "c9", title: "Serralharia Viseu", rating: 4.5, reviews_count: 67, address: "Zona Industrial, Viseu", phone: "+351 232 333 444", category: "Serralharia", hours: "08:00 - 17:00", description: "Trabalhos em ferro e alumínio", services: ["Portões", "Gradeamentos", "Estruturas"] },
  ],
  beauty: [
    // Lisboa
    { id: "b1", title: "Cabeleireiro Elegance", rating: 4.9, reviews_count: 342, address: "Av. Roma 156, Lisboa", phone: "+351 21 555 6666", website: "https://elegancehair.pt", category: "Cabeleireiro", hours: "09:00 - 20:00", description: "Cabeleireiro unisexo especializado", services: ["Corte", "Coloração", "Madeixas"] },
    { id: "b2", title: "Estética & Beleza Maria", rating: 4.8, reviews_count: 278, address: "Rua Castilho 45, Lisboa", phone: "+351 21 666 7777", category: "Centro de Estética", hours: "10:00 - 19:00", description: "Centro de estética", services: ["Limpeza de Pele", "Massagens", "Depilação"] },
    { id: "b3", title: "Barbearia Clássica", rating: 4.7, reviews_count: 198, address: "Baixa-Chiado, Lisboa", phone: "+351 21 777 8888", category: "Barbearia", hours: "10:00 - 20:00", description: "Barbearia tradicional", services: ["Corte de Cabelo", "Barba"] },
    // Porto
    { id: "b4", title: "Salão de Beleza Porto", rating: 4.8, reviews_count: 234, address: "Rua de Santa Catarina 234, Porto", phone: "+351 22 888 9999", category: "Cabeleireiro", hours: "09:00 - 20:00", description: "Salão de beleza premium", services: ["Corte", "Coloração", "Tratamentos"] },
    { id: "b5", title: "Barbearia Invicta", rating: 4.9, reviews_count: 345, address: "Rua das Flores 67, Porto", phone: "+351 22 999 0000", category: "Barbearia", hours: "10:00 - 20:00", description: "Barbearia moderna no Porto", services: ["Corte", "Barba", "Tratamentos"] },
    { id: "b6", title: "SPA Ribeira", rating: 4.7, reviews_count: 189, address: "Cais da Ribeira 12, Porto", phone: "+351 22 000 1111", category: "SPA", hours: "10:00 - 21:00", description: "SPA com vista para o Douro", services: ["Massagens", "Tratamentos Corporais"] },
    // Braga
    { id: "b7", title: "Cabeleireiro Minho Style", rating: 4.6, reviews_count: 156, address: "Rua do Souto 78, Braga", phone: "+351 253 111 222", category: "Cabeleireiro", hours: "09:00 - 19:00", description: "Cabeleireiro no centro de Braga", services: ["Corte", "Coloração"] },
    { id: "b8", title: "Centro Estético Bracara", rating: 4.7, reviews_count: 167, address: "Av. Central 56, Braga", phone: "+351 253 222 333", category: "Centro de Estética", hours: "10:00 - 19:00", description: "Estética e bem-estar", services: ["Tratamentos Faciais", "Depilação Laser"] },
    // Coimbra
    { id: "b9", title: "Hair Studio Coimbra", rating: 4.5, reviews_count: 178, address: "Rua Ferreira Borges 34, Coimbra", phone: "+351 239 333 444", category: "Cabeleireiro", hours: "09:00 - 19:00", description: "Cabeleireiro junto à Baixa", services: ["Corte", "Coloração", "Penteados"] },
    // Faro
    { id: "b10", title: "Beauty Algarve", rating: 4.8, reviews_count: 234, address: "Rua de Santo António 45, Faro", phone: "+351 289 444 555", category: "Centro de Estética", hours: "10:00 - 20:00", description: "Centro de estética premium", services: ["Tratamentos", "Massagens", "Depilação"] },
    { id: "b11", title: "Cabeleireiro Sol & Mar", rating: 4.6, reviews_count: 189, address: "Marina de Faro, Faro", phone: "+351 289 555 666", category: "Cabeleireiro", hours: "09:00 - 19:00", description: "Cabeleireiro na marina", services: ["Corte", "Coloração"] },
    // Setúbal
    { id: "b12", title: "Estética Arrábida", rating: 4.5, reviews_count: 145, address: "Av. Luísa Todi 67, Setúbal", phone: "+351 265 666 777", category: "Centro de Estética", hours: "10:00 - 19:00", description: "Centro de estética", services: ["Tratamentos Faciais", "Corporais"] },
    // Funchal
    { id: "b13", title: "Cabeleireiro Madeira Style", rating: 4.7, reviews_count: 198, address: "Rua da Carreira 23, Funchal", phone: "+351 291 777 888", category: "Cabeleireiro", hours: "09:00 - 19:00", description: "Cabeleireiro na Madeira", services: ["Corte", "Coloração", "Tratamentos"] },
    { id: "b14", title: "SPA Monte Palace", rating: 4.9, reviews_count: 267, address: "Monte, Funchal", phone: "+351 291 888 999", website: "https://spamonte.pt", category: "SPA", hours: "09:00 - 21:00", description: "SPA de luxo no Monte", services: ["Massagens", "Tratamentos", "Piscina"] },
    // Vila Nova de Gaia
    { id: "b15", title: "Cabeleireiro Gaia Center", rating: 4.6, reviews_count: 167, address: "GaiaShopping, Vila Nova de Gaia", phone: "+351 22 111 2222", category: "Cabeleireiro", hours: "10:00 - 22:00", description: "Cabeleireiro no shopping", services: ["Corte", "Coloração"] },
    // Cascais
    { id: "b16", title: "SPA Cascais Bay", rating: 4.8, reviews_count: 234, address: "Baía de Cascais, Cascais", phone: "+351 21 222 3333", category: "SPA", hours: "09:00 - 21:00", description: "SPA com vista mar", services: ["Massagens", "Tratamentos Premium"] },
    // Albufeira
    { id: "b17", title: "Beach Beauty", rating: 4.5, reviews_count: 189, address: "Praia da Oura, Albufeira", phone: "+351 289 333 444", category: "Centro de Estética", hours: "10:00 - 20:00", description: "Beleza na praia", services: ["Manicure", "Pedicure", "Massagens"] },
    // Guimarães
    { id: "b18", title: "Cabeleireiro Berço", rating: 4.7, reviews_count: 145, address: "Largo do Toural 8, Guimarães", phone: "+351 253 444 555", category: "Cabeleireiro", hours: "09:00 - 19:00", description: "Cabeleireiro no centro histórico", services: ["Corte", "Coloração", "Tratamentos"] },
    // Leiria
    { id: "b19", title: "Estética Lis", rating: 4.4, reviews_count: 123, address: "Rua Barão de Viamonte 34, Leiria", phone: "+351 244 555 666", category: "Centro de Estética", hours: "10:00 - 19:00", description: "Centro de estética", services: ["Tratamentos", "Massagens"] },
    // Viseu
    { id: "b20", title: "Barbearia Tradicional Viseu", rating: 4.6, reviews_count: 98, address: "Rua Direita 56, Viseu", phone: "+351 232 666 777", category: "Barbearia", hours: "09:00 - 19:00", description: "Barbearia tradicional", services: ["Corte", "Barba", "Tratamentos"] },
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
