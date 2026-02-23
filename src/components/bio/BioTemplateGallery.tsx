import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Check } from "lucide-react";
import { useCreateBioPage } from "@/hooks/useBioPages";
import { useCreateBioBlock } from "@/hooks/useBioBlocks";
import { getIconByName } from "@/lib/icons";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

interface TemplateBlock {
  type: string;
  content: Record<string, any>;
}

interface PremiumTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  color: string;
  pageName: string;
  slug: string;
  blocks: TemplateBlock[];
}

const PREMIUM_TEMPLATES: PremiumTemplate[] = [
  // ─── SERVIÇOS ───
  {
    id: "fitness-coach",
    name: "Coach de Fitness",
    description: "Página para personal trainers e coaches desportivos",
    category: "Serviços",
    icon: "Dumbbell",
    color: "#16a34a",
    pageName: "Coach de Fitness",
    slug: "coach-fitness",
    blocks: [
      { type: "hero", content: { title: "Transforma o Teu Corpo em 90 Dias", subtitle: "Treinos personalizados, acompanhamento semanal e resultados garantidos. Mais de 500 alunos transformados.", buttonText: "Começar Agora", buttonUrl: "#contacto", icon: "Dumbbell" } },
      { type: "feature", content: { title: "Treino Personalizado", subtitle: "Planos 100% adaptados ao teu nível, objectivos e disponibilidade. Sem programas genéricos — cada exercício é pensado para ti.", icon: "Target" } },
      { type: "feature", content: { title: "Acompanhamento Semanal", subtitle: "Check-ins semanais com análise de progresso, ajustes ao plano e motivação constante. Nunca treinas sozinho.", icon: "Users" } },
      { type: "feature", content: { title: "Plano Nutricional Incluído", subtitle: "Orientações alimentares simples e práticas, sem dietas restritivas. Aprende a comer bem para sempre.", icon: "Heart" } },
      { type: "text", content: { text: "💪 \"O treino não muda apenas o teu corpo — muda a tua mentalidade, a tua energia e a tua confiança. Estou aqui para te guiar nessa jornada.\"" } },
      { type: "button", content: { text: "Marcar Avaliação Gratuita", url: "#avaliacao", variant: "default" } },
      { type: "testimonials", content: { title: "O Que Dizem os Meus Alunos", testimonials: [{ name: "Maria S.", text: "Perdi 12kg em 3 meses. O acompanhamento faz toda a diferença!", rating: 5 }, { name: "João P.", text: "Ganhei massa muscular e confiança. Melhor investimento que fiz.", rating: 5 }, { name: "Ana R.", text: "Finalmente encontrei um treino que consigo manter. Recomendo a 100%!", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Fala Comigo no WhatsApp", phone: "", message: "Olá! Vi o teu perfil e gostava de saber mais sobre os treinos personalizados." } },
      { type: "social", content: { title: "Segue-me nas Redes", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "youtube", url: "https://youtube.com/" }, { platform: "facebook", url: "https://facebook.com/" }] } },
    ],
  },
  {
    id: "business-consulting",
    name: "Consultoria de Negócios",
    description: "Para consultores empresariais e estratégicos",
    category: "Serviços",
    icon: "Briefcase",
    color: "#2563eb",
    pageName: "Consultoria de Negócios",
    slug: "consultoria-negocios",
    blocks: [
      { type: "hero", content: { title: "Faz o Teu Negócio Crescer de Forma Sustentável", subtitle: "Estratégia, processos e resultados mensuráveis. Mais de 200 empresas transformadas nos últimos 5 anos.", buttonText: "Agendar Diagnóstico", buttonUrl: "#diagnostico", icon: "Briefcase" } },
      { type: "feature", content: { title: "Diagnóstico Empresarial", subtitle: "Análise completa do teu negócio em 48h: processos, finanças, equipa e mercado. Identificamos oportunidades escondidas.", icon: "Search" } },
      { type: "feature", content: { title: "Estratégia de Crescimento", subtitle: "Plano de acção personalizado com metas claras, KPIs e prazos. Sabes exactamente o que fazer a cada semana.", icon: "TrendingUp" } },
      { type: "feature", content: { title: "ROI Garantido", subtitle: "Os nossos clientes reportam um aumento médio de 35% no faturamento nos primeiros 6 meses de consultoria.", icon: "DollarSign" } },
      { type: "text", content: { text: "📊 \"Não se trata de trabalhar mais — trata-se de trabalhar com estratégia. Cada decisão deve ser baseada em dados e orientada para resultados.\"" } },
      { type: "button", content: { text: "Diagnóstico Gratuito de 30 min", url: "#diagnostico", variant: "default" } },
      { type: "testimonials", content: { title: "Casos de Sucesso", testimonials: [{ name: "Carlos M. — CEO, TechStart", text: "Aumentámos o faturamento em 42% em 6 meses. A consultoria foi um investimento com retorno imediato.", rating: 5 }, { name: "Sofia L. — Directora, Bloom Agency", text: "Finalmente temos processos claros e uma equipa alinhada. Recomendo vivamente.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Falar Directamente Comigo", phone: "", message: "Olá! Gostava de saber mais sobre a consultoria empresarial e agendar um diagnóstico." } },
      { type: "social", content: { title: "Conectar", links: [{ platform: "linkedin", url: "https://linkedin.com/" }, { platform: "instagram", url: "https://instagram.com/" }] } },
    ],
  },
  {
    id: "therapist-wellness",
    name: "Terapeuta / Wellness",
    description: "Ideal para terapeutas, psicólogos e wellness",
    category: "Serviços",
    icon: "Heart",
    color: "#8b5cf6",
    pageName: "Terapeuta & Wellness",
    slug: "terapeuta-wellness",
    blocks: [
      { type: "hero", content: { title: "Encontra o Teu Equilíbrio Interior", subtitle: "Sessões de terapia personalizadas num espaço seguro e acolhedor. Cuida da tua saúde mental com acompanhamento profissional.", buttonText: "Agendar Sessão", buttonUrl: "#agendar", icon: "Heart" } },
      { type: "feature", content: { title: "Sessões Individuais", subtitle: "Acompanhamento terapêutico adaptado às tuas necessidades. Presencial ou online, no horário que te convém.", icon: "Users" } },
      { type: "feature", content: { title: "Mindfulness & Meditação", subtitle: "Técnicas práticas de mindfulness para gerir ansiedade, stress e melhorar a qualidade do sono.", icon: "Sparkles" } },
      { type: "feature", content: { title: "Workshops de Grupo", subtitle: "Sessões em grupo para desenvolvimento pessoal, gestão emocional e autoconhecimento.", icon: "GraduationCap" } },
      { type: "text", content: { text: "🌿 \"Cuidar de ti não é egoísmo — é necessidade. O primeiro passo para uma vida mais plena começa com a decisão de pedir ajuda.\"" } },
      { type: "button", content: { text: "Sessão de Avaliação — Condições Especiais", url: "#avaliacao", variant: "default" } },
      { type: "testimonials", content: { title: "Testemunhos", testimonials: [{ name: "Marta F.", text: "Finalmente encontrei alguém que me ouve sem julgar. As sessões mudaram a minha vida.", rating: 5 }, { name: "Ricardo T.", text: "Aprendi ferramentas práticas para lidar com a ansiedade. Sinto-me muito mais calmo.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Marcar por WhatsApp", phone: "", message: "Olá! Gostava de saber mais sobre as sessões de terapia e disponibilidade." } },
      { type: "social", content: { title: "Segue o Meu Trabalho", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "facebook", url: "https://facebook.com/" }] } },
    ],
  },
  // ─── COMÉRCIO ───
  {
    id: "gourmet-restaurant",
    name: "Restaurante Gourmet",
    description: "Para restaurantes, cafés e espaços gastronómicos",
    category: "Comércio",
    icon: "Utensils",
    color: "#dc2626",
    pageName: "Restaurante Gourmet",
    slug: "restaurante-gourmet",
    blocks: [
      { type: "hero", content: { title: "Uma Experiência Gastronómica Inesquecível", subtitle: "Cozinha de autor com ingredientes locais e de época. Reserva a tua mesa e descobre sabores que contam histórias.", buttonText: "Reservar Mesa", buttonUrl: "#reservar", icon: "Utensils" } },
      { type: "feature", content: { title: "Menu de Degustação", subtitle: "5 momentos gastronómicos criados pelo nosso chef, com harmonização de vinhos regionais. Uma viagem de sabores.", icon: "Star" } },
      { type: "feature", content: { title: "Ingredientes Locais", subtitle: "Trabalhamos directamente com produtores locais. Cada prato respeita a sazonalidade e valoriza o terroir português.", icon: "Heart" } },
      { type: "feature", content: { title: "Eventos Privados", subtitle: "Espaço exclusivo para jantares de grupo, aniversários e eventos corporativos. Menus personalizados.", icon: "Users" } },
      { type: "text", content: { text: "🍷 \"A gastronomia é memória, é afecto, é partilha. Cada prato que servimos é uma carta de amor aos sabores da nossa terra.\"" } },
      { type: "button", content: { text: "Ver Menu Completo", url: "#menu", variant: "default" } },
      { type: "testimonials", content: { title: "O Que Dizem os Nossos Clientes", testimonials: [{ name: "Helena V.", text: "O melhor restaurante onde jantei este ano. O menu de degustação é imperdível!", rating: 5 }, { name: "André C.", text: "Ambiente acolhedor, serviço impecável e comida excepcional. Voltarei com certeza.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Reservar por WhatsApp", phone: "", message: "Olá! Gostava de reservar mesa no vosso restaurante." } },
      { type: "social", content: { title: "Segue-nos", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "facebook", url: "https://facebook.com/" }, { platform: "tiktok", url: "https://tiktok.com/" }] } },
    ],
  },
  {
    id: "online-store",
    name: "Loja Online",
    description: "Perfeito para e-commerce e lojas digitais",
    category: "Comércio",
    icon: "ShoppingBag",
    color: "#f59e0b",
    pageName: "Loja Online",
    slug: "loja-online",
    blocks: [
      { type: "hero", content: { title: "Descobre a Nossa Colecção Exclusiva", subtitle: "Produtos únicos, enviados em 24h para todo o país. Satisfação garantida ou devolvemos o teu dinheiro.", buttonText: "Ver Colecção", buttonUrl: "#coleccao", icon: "ShoppingBag" } },
      { type: "feature", content: { title: "Envio em 24h", subtitle: "Encomendas processadas e enviadas no mesmo dia. Entrega rápida e segura em todo o território nacional.", icon: "Zap" } },
      { type: "feature", content: { title: "Garantia de Satisfação", subtitle: "Não ficaste satisfeito? Devolvemos o valor total sem perguntas. A tua confiança é a nossa prioridade.", icon: "Shield" } },
      { type: "feature", content: { title: "Edições Limitadas", subtitle: "Colecções exclusivas em quantidades limitadas. Quando esgota, não volta. Garante a tua peça.", icon: "Sparkles" } },
      { type: "text", content: { text: "🛍️ Usa o código BEMVINDO15 para 15% de desconto na tua primeira compra!" } },
      { type: "button", content: { text: "Comprar Agora — 15% OFF", url: "#loja", variant: "default" } },
      { type: "testimonials", content: { title: "Clientes Satisfeitos", testimonials: [{ name: "Inês M.", text: "Qualidade incrível e chegou super rápido. Já fiz 3 encomendas!", rating: 5 }, { name: "Pedro A.", text: "O atendimento é espectacular. Responderam a tudo em menos de 1 hora.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Dúvidas? Fala Connosco", phone: "", message: "Olá! Tenho uma dúvida sobre os vossos produtos." } },
      { type: "social", content: { title: "Segue a Loja", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "tiktok", url: "https://tiktok.com/" }, { platform: "facebook", url: "https://facebook.com/" }] } },
    ],
  },
  {
    id: "beauty-salon",
    name: "Salão de Beleza",
    description: "Para cabeleireiros, estéticas e spas",
    category: "Comércio",
    icon: "Scissors",
    color: "#ec4899",
    pageName: "Salão de Beleza",
    slug: "salao-beleza",
    blocks: [
      { type: "hero", content: { title: "Realça a Tua Beleza Natural", subtitle: "Tratamentos premium num ambiente exclusivo. Cada detalhe pensado para te fazer sentir especial.", buttonText: "Marcar Agora", buttonUrl: "#marcar", icon: "Scissors" } },
      { type: "feature", content: { title: "Corte & Styling", subtitle: "Profissionais com formação internacional. Análise de rosto, colorimetria e um look pensado para ti.", icon: "Scissors" } },
      { type: "feature", content: { title: "Tratamentos Capilares", subtitle: "Hidratação profunda, reconstrução e tratamentos de brilho com produtos premium de marcas exclusivas.", icon: "Sparkles" } },
      { type: "feature", content: { title: "Pack Noiva / Eventos", subtitle: "Maquilhagem, penteado e tratamento facial. Tudo o que precisas para brilhar no teu dia especial.", icon: "Heart" } },
      { type: "text", content: { text: "✨ \"A beleza não é sobre perfeição — é sobre se sentir confiante na própria pele. Estamos aqui para realçar o que já é teu.\"" } },
      { type: "button", content: { text: "Pack Primeira Visita — 20% OFF", url: "#pack", variant: "default" } },
      { type: "testimonials", content: { title: "Clientes Felizes", testimonials: [{ name: "Catarina L.", text: "O melhor salão onde já fui! Saí de lá a sentir-me uma nova pessoa.", rating: 5 }, { name: "Beatriz R.", text: "O pack noiva foi perfeito. Trataram de tudo com tanto carinho!", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Marcar por WhatsApp", phone: "", message: "Olá! Gostava de marcar um horário no salão." } },
      { type: "social", content: { title: "Segue o Nosso Trabalho", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "facebook", url: "https://facebook.com/" }] } },
    ],
  },
  // ─── CRIATIVO ───
  {
    id: "photographer",
    name: "Fotógrafo Profissional",
    description: "Portfolio e contacto para fotógrafos",
    category: "Criativo",
    icon: "Camera",
    color: "#1e1b4b",
    pageName: "Fotógrafo Profissional",
    slug: "fotografo-profissional",
    blocks: [
      { type: "hero", content: { title: "Capturo Momentos Que Contam Histórias", subtitle: "Fotografia autoral com sensibilidade e técnica. Casamentos, retratos, produto e editorial.", buttonText: "Ver Portfolio", buttonUrl: "#portfolio", icon: "Camera" } },
      { type: "feature", content: { title: "Casamentos & Eventos", subtitle: "Cobertura completa do teu dia especial. Fotografia documental e artística que preserva cada emoção.", icon: "Heart" } },
      { type: "feature", content: { title: "Retratos & Branding", subtitle: "Sessões de retrato pessoal e corporativo. Imagens que comunicam a tua essência e profissionalismo.", icon: "Users" } },
      { type: "feature", content: { title: "Fotografia de Produto", subtitle: "Imagens que vendem. Packshots, lifestyle e still life para e-commerce e redes sociais.", icon: "ShoppingBag" } },
      { type: "text", content: { text: "📸 \"Cada fotografia é uma história suspensa no tempo. O meu trabalho é encontrar a beleza nos momentos que parecem comuns.\"" } },
      { type: "button", content: { text: "Mini-Sessão — Preço Especial", url: "#sessao", variant: "default" } },
      { type: "testimonials", content: { title: "O Que Dizem de Mim", testimonials: [{ name: "Joana & Miguel", text: "As fotos do nosso casamento são um tesouro. Cada imagem conta uma parte da nossa história.", rating: 5 }, { name: "Sara T. — Brand Manager", text: "As fotos de produto aumentaram as nossas vendas em 30%. Profissional incrível.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Pedir Orçamento", phone: "", message: "Olá! Gostava de saber mais sobre sessões fotográficas e preços." } },
      { type: "social", content: { title: "Portfolio & Redes", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "website", url: "https://portfolio.com/" }] } },
    ],
  },
  {
    id: "designer-portfolio",
    name: "Designer / Portfolio",
    description: "Showcase de trabalhos para designers criativos",
    category: "Criativo",
    icon: "Palette",
    color: "#6366f1",
    pageName: "Designer & Portfolio",
    slug: "designer-portfolio",
    blocks: [
      { type: "hero", content: { title: "Design Que Transforma Marcas", subtitle: "Branding, UI/UX e identidade visual. Crio experiências visuais que conectam marcas a pessoas.", buttonText: "Ver Projectos", buttonUrl: "#projectos", icon: "Palette" } },
      { type: "feature", content: { title: "Branding & Identidade", subtitle: "Logo, paleta cromática, tipografia e manual de marca. Uma identidade visual coesa e memorável.", icon: "Sparkles" } },
      { type: "feature", content: { title: "UI/UX Design", subtitle: "Interfaces intuitivas e bonitas. Design centrado no utilizador para apps e websites que convertem.", icon: "LayoutGrid" } },
      { type: "feature", content: { title: "Processo Transparente", subtitle: "Briefing → Pesquisa → Conceito → Refinamento → Entrega. Acompanhas cada passo do projecto.", icon: "Check" } },
      { type: "text", content: { text: "🎨 \"Bom design não é só estética — é estratégia visual. Cada pixel serve um propósito, cada cor comunica uma emoção.\"" } },
      { type: "button", content: { text: "Pedir Proposta Personalizada", url: "#proposta", variant: "default" } },
      { type: "testimonials", content: { title: "Feedback de Clientes", testimonials: [{ name: "Startup XYZ", text: "O rebranding transformou completamente a percepção da nossa marca. Passámos de invisíveis a referência.", rating: 5 }, { name: "Ricardo — Fundador, NovaTech", text: "Interface impecável. Os nossos utilizadores adoram a nova experiência.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Vamos Conversar", phone: "", message: "Olá! Tenho um projecto de design e gostava de saber mais sobre os teus serviços." } },
      { type: "social", content: { title: "Portfolio & Redes", links: [{ platform: "dribbble", url: "https://dribbble.com/" }, { platform: "instagram", url: "https://instagram.com/" }, { platform: "linkedin", url: "https://linkedin.com/" }] } },
    ],
  },
  {
    id: "musician-artist",
    name: "Músico / Artista",
    description: "Links para música, eventos e redes sociais",
    category: "Criativo",
    icon: "Music",
    color: "#7c3aed",
    pageName: "Músico & Artista",
    slug: "musico-artista",
    blocks: [
      { type: "hero", content: { title: "Ouve. Sente. Vive a Música.", subtitle: "Novo single disponível em todas as plataformas. Mais de 500K streams e a crescer.", buttonText: "Ouvir Agora", buttonUrl: "#ouvir", icon: "Music" } },
      { type: "link", content: { title: "🎵 Ouvir no Spotify", url: "https://spotify.com/", description: "Todos os álbuns e singles disponíveis" } },
      { type: "link", content: { title: "🍎 Apple Music", url: "https://music.apple.com/", description: "Disponível em Apple Music" } },
      { type: "link", content: { title: "▶️ YouTube — Videoclipes", url: "https://youtube.com/", description: "Vê os videoclipes oficiais" } },
      { type: "text", content: { text: "🎤 Próximo concerto: 15 de Março — Coliseu dos Recreios, Lisboa. Bilhetes limitados!" } },
      { type: "button", content: { text: "Comprar Bilhetes", url: "#bilhetes", variant: "default" } },
      { type: "feature", content: { title: "Disponível para Eventos", subtitle: "Concertos privados, festivais e eventos corporativos. Envia uma mensagem para booking.", icon: "Star" } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Booking & Contacto", phone: "", message: "Olá! Gostava de saber sobre disponibilidade para um evento." } },
      { type: "social", content: { title: "Segue-me", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "tiktok", url: "https://tiktok.com/" }, { platform: "youtube", url: "https://youtube.com/" }, { platform: "spotify", url: "https://spotify.com/" }] } },
    ],
  },
  // ─── DIGITAL ───
  {
    id: "marketing-agency",
    name: "Agência de Marketing",
    description: "Para agências digitais e equipas de marketing",
    category: "Digital",
    icon: "Target",
    color: "#0891b2",
    pageName: "Agência de Marketing Digital",
    slug: "agencia-marketing",
    blocks: [
      { type: "hero", content: { title: "Resultados Digitais Que Fazem a Diferença", subtitle: "Estratégia, performance e criatividade. Gerimos a presença digital de mais de 50 marcas em Portugal.", buttonText: "Auditoria Gratuita", buttonUrl: "#auditoria", icon: "Target" } },
      { type: "feature", content: { title: "Gestão de Redes Sociais", subtitle: "Conteúdo estratégico, calendário editorial e relatórios mensais. Transformamos seguidores em clientes.", icon: "Users" } },
      { type: "feature", content: { title: "Google & Meta Ads", subtitle: "Campanhas de performance com ROI médio de 4.2x. Cada euro investido é optimizado para resultados.", icon: "TrendingUp" } },
      { type: "feature", content: { title: "SEO & Conteúdo", subtitle: "Posiciona o teu site no topo do Google. Estratégia de conteúdo que gera tráfego orgânico qualificado.", icon: "Search" } },
      { type: "text", content: { text: "📈 Caso de estudo: Aumentámos o tráfego orgânico de um cliente em 312% em 6 meses, gerando +150 leads qualificados por mês." } },
      { type: "button", content: { text: "Pedir Auditoria Digital Gratuita", url: "#auditoria", variant: "default" } },
      { type: "testimonials", content: { title: "Clientes Satisfeitos", testimonials: [{ name: "TechFlow — SaaS B2B", text: "Triplicámos os leads em 4 meses. A equipa é excepcional e os resultados falam por si.", rating: 5 }, { name: "Bloom Store — E-commerce", text: "O ROAS das campanhas passou de 1.8x para 5.1x. Impressionante.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Falar com a Equipa", phone: "", message: "Olá! Gostava de saber mais sobre os vossos serviços de marketing digital." } },
      { type: "social", content: { title: "Segue a Agência", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "linkedin", url: "https://linkedin.com/" }, { platform: "website", url: "https://website.com/" }] } },
    ],
  },
  {
    id: "tech-freelancer",
    name: "Freelancer Tech",
    description: "Para programadores, devs e consultores tech",
    category: "Digital",
    icon: "Brain",
    color: "#059669",
    pageName: "Freelancer Tech",
    slug: "freelancer-tech",
    blocks: [
      { type: "hero", content: { title: "Desenvolvimento Web & Mobile Sob Medida", subtitle: "Full-stack developer com +8 anos de experiência. Transformo ideias em produtos digitais que funcionam.", buttonText: "Pedir Orçamento", buttonUrl: "#orcamento", icon: "Brain" } },
      { type: "feature", content: { title: "Web Apps & SaaS", subtitle: "Desenvolvimento de aplicações web modernas com React, Node.js e cloud. Da ideia ao deploy.", icon: "LayoutGrid" } },
      { type: "feature", content: { title: "Apps Mobile", subtitle: "Aplicações nativas e cross-platform para iOS e Android. Interfaces rápidas e experiência impecável.", icon: "Zap" } },
      { type: "feature", content: { title: "Consultoria Técnica", subtitle: "Revisão de arquitectura, code review e mentoria técnica. Ajudo equipas a tomar melhores decisões.", icon: "Shield" } },
      { type: "text", content: { text: "💻 Stack: React · TypeScript · Node.js · PostgreSQL · AWS · Docker · CI/CD" } },
      { type: "button", content: { text: "Estimativa Gratuita em 24h", url: "#estimativa", variant: "default" } },
      { type: "testimonials", content: { title: "Feedback de Clientes", testimonials: [{ name: "Maria G. — Fundadora, HealthApp", text: "Entregou a app 2 semanas antes do prazo e com qualidade superior. Profissional de excelência.", rating: 5 }, { name: "StartupXYZ", text: "A consultoria técnica poupou-nos meses de desenvolvimento errado. Vale cada cêntimo.", rating: 5 }] } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Vamos Falar do Teu Projecto", phone: "", message: "Olá! Tenho um projecto tech e gostava de discutir requisitos e orçamento." } },
      { type: "social", content: { title: "Perfis & Portfolio", links: [{ platform: "github", url: "https://github.com/" }, { platform: "linkedin", url: "https://linkedin.com/" }, { platform: "website", url: "https://portfolio.dev/" }] } },
    ],
  },
  {
    id: "influencer-creator",
    name: "Influencer / Creator",
    description: "Para criadores de conteúdo e influencers",
    category: "Digital",
    icon: "Sparkles",
    color: "#e11d48",
    pageName: "Creator & Influencer",
    slug: "creator-influencer",
    blocks: [
      { type: "hero", content: { title: "Conteúdo Que Inspira & Converte", subtitle: "Creator digital com +100K seguidores. Parcerias autênticas com marcas que partilham os meus valores.", buttonText: "Ver Media Kit", buttonUrl: "#mediakit", icon: "Sparkles" } },
      { type: "link", content: { title: "📸 Instagram — Conteúdo Diário", url: "https://instagram.com/", description: "Lifestyle, dicas e bastidores" } },
      { type: "link", content: { title: "🎬 TikTok — Vídeos Virais", url: "https://tiktok.com/", description: "Trends, challenges e conteúdo original" } },
      { type: "link", content: { title: "▶️ YouTube — Vlogs & Reviews", url: "https://youtube.com/", description: "Vídeos longos, reviews e tutoriais" } },
      { type: "feature", content: { title: "Parcerias com Marcas", subtitle: "Posts patrocinados, unboxings, stories takeover e embaixador de marca. Conteúdo autêntico que gera engagement.", icon: "Star" } },
      { type: "feature", content: { title: "Media Kit Disponível", subtitle: "Dados de audiência, engagement rate, demographics e cases anteriores. Tudo transparente e actualizado.", icon: "FileText" } },
      { type: "text", content: { text: "✨ +100K seguidores · 4.8% engagement rate · +50 parcerias realizadas · Audiência 70% Portugal" } },
      { type: "button", content: { text: "Descarregar Media Kit", url: "#mediakit", variant: "default" } },
      { type: "divider", content: {} },
      { type: "whatsapp", content: { text: "Contacto para Parcerias", phone: "", message: "Olá! Represento a marca [nome] e gostávamos de explorar uma parceria." } },
      { type: "social", content: { title: "Todas as Plataformas", links: [{ platform: "instagram", url: "https://instagram.com/" }, { platform: "tiktok", url: "https://tiktok.com/" }, { platform: "youtube", url: "https://youtube.com/" }, { platform: "twitter", url: "https://twitter.com/" }] } },
    ],
  },
];

const CATEGORIES = ["Serviços", "Comércio", "Criativo", "Digital"];

interface BioTemplateGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPageCreated: (pageId: string) => void;
}

export function BioTemplateGallery({ open, onOpenChange, onPageCreated }: BioTemplateGalleryProps) {
  const createPage = useCreateBioPage();
  const createBlock = useCreateBioBlock();
  const [applying, setApplying] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [phase, setPhase] = useState<"gallery" | "applying" | "success">("gallery");
  const [appliedName, setAppliedName] = useState("");

  const handleSelect = async (template: PremiumTemplate) => {
    setApplying(template.id);
    setPhase("applying");

    try {
      const page = await createPage.mutateAsync({
        name: template.pageName,
        slug: template.slug + "-" + Date.now().toString(36),
        primary_color: template.color,
      });

      for (let i = 0; i < template.blocks.length; i++) {
        await createBlock.mutateAsync({
          bio_page_id: page.id,
          block_type: template.blocks[i].type,
          content: template.blocks[i].content,
          order_index: i,
        });
      }

      setAppliedName(template.pageName);
      setPhase("success");
      setTimeout(() => {
        onOpenChange(false);
        setPhase("gallery");
        setApplying(null);
        onPageCreated(page.id);
        toast.success("Template aplicado com sucesso!");
      }, 1500);
    } catch (e: any) {
      console.error("Template apply error:", e);
      toast.error(e.message || "Erro ao aplicar template");
      setPhase("gallery");
      setApplying(null);
    }
  };

  const filtered = activeCategory
    ? PREMIUM_TEMPLATES.filter((t) => t.category === activeCategory)
    : PREMIUM_TEMPLATES;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Templates Premium
          </DialogTitle>
        </DialogHeader>

        <AnimatePresence mode="wait">
          {phase === "applying" && (
            <motion.div
              key="applying"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="flex flex-col items-center justify-center py-16 gap-6"
            >
              <Loader2 className="h-10 w-10 animate-spin text-primary" />
              <div className="text-center space-y-1">
                <p className="font-semibold text-lg">A aplicar template...</p>
                <p className="text-sm text-muted-foreground">A criar blocos de conteúdo</p>
              </div>
            </motion.div>
          )}

          {phase === "success" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center py-16 gap-4"
            >
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Check className="h-8 w-8 text-primary" />
              </div>
              <p className="font-semibold text-lg">Template aplicado!</p>
              <p className="text-sm text-muted-foreground">{appliedName}</p>
            </motion.div>
          )}

          {phase === "gallery" && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={activeCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setActiveCategory(null)}
                >
                  Todos
                </Button>
                {CATEGORIES.map((cat) => (
                  <Button
                    key={cat}
                    variant={activeCategory === cat ? "default" : "outline"}
                    size="sm"
                    onClick={() => setActiveCategory(cat)}
                  >
                    {cat}
                  </Button>
                ))}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 overflow-y-auto max-h-[55vh] pr-1">
                {filtered.map((template) => {
                  const Icon = getIconByName(template.icon);
                  return (
                    <motion.div
                      key={template.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="group relative rounded-xl border bg-card overflow-hidden hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => handleSelect(template)}
                    >
                      <div
                        className="h-24 flex items-center justify-center relative"
                        style={{
                          background: `linear-gradient(135deg, ${template.color}, ${template.color}dd)`,
                        }}
                      >
                        <Icon className="h-10 w-10 text-white/90" />
                        <Badge
                          variant="secondary"
                          className="absolute top-2 right-2 text-[10px] bg-white/20 text-white border-0 backdrop-blur-sm"
                        >
                          {template.blocks.length} blocos
                        </Badge>
                      </div>

                      <div className="p-3 space-y-1.5">
                        <h3 className="font-semibold text-sm">{template.name}</h3>
                        <p className="text-xs text-muted-foreground line-clamp-2">
                          {template.description}
                        </p>
                        <div className="pt-1">
                          <Badge variant="outline" className="text-[10px]">
                            {template.category}
                          </Badge>
                        </div>
                      </div>

                      <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-background/95 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg border">
                          <span className="text-sm font-medium flex items-center gap-1.5">
                            <Sparkles className="h-3.5 w-3.5" /> Usar Template
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
