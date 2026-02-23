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
      { type: "hero", content: { title: "Transforma o Teu Corpo em 90 Dias", subtitle: "Treinos personalizados, acompanhamento semanal e resultados garantidos. Mais de 500 alunos transformados com um método comprovado que combina exercício, nutrição e mindset.", cta_text: "Começar Agora", cta_url: "#contacto", icon: "Dumbbell" } },
      { type: "feature", content: { title: "Treino Personalizado", subtitle: "Planos 100% adaptados ao teu nível, objectivos e disponibilidade. Sem programas genéricos — cada exercício é pensado para ti, com progressão semanal e variações para nunca estagnar.", icon: "Target", cta_text: "Saber Mais" } },
      { type: "feature", content: { title: "Acompanhamento Semanal", subtitle: "Check-ins semanais com análise de progresso, ajustes ao plano e motivação constante. Recebes feedback detalhado por vídeo e mensagem. Nunca treinas sozinho.", icon: "Users", cta_text: "Ver Detalhes" } },
      { type: "feature", content: { title: "Plano Nutricional Incluído", subtitle: "Orientações alimentares simples e práticas, sem dietas restritivas. Aprende a comer bem para sempre com receitas fáceis e lista de compras semanal.", icon: "Heart", cta_text: "Saber Mais" } },
      { type: "feature", content: { title: "App de Treino Exclusiva", subtitle: "Acesso à app com vídeos de cada exercício, cronómetro integrado e registo de progresso. Treina em qualquer lugar com total autonomia.", icon: "Zap", cta_text: "Conhecer a App" } },
      { type: "text", content: { text: "💪 \"O treino não muda apenas o teu corpo — muda a tua mentalidade, a tua energia e a tua confiança. Estou aqui para te guiar nessa jornada de transformação.\"" } },
      { type: "button", content: { text: "Marcar Avaliação Gratuita", url: "#avaliacao", variant: "default" } },
      { type: "testimonials", content: { text: "Perdi 12kg em 3 meses. O acompanhamento personalizado faz toda a diferença! Nunca pensei que fosse possível.", author: "Maria S." } },
      { type: "testimonials", content: { text: "Ganhei massa muscular e confiança. Melhor investimento que fiz na minha saúde. Recomendo a todos.", author: "João P." } },
      { type: "testimonials", content: { text: "Finalmente encontrei um treino que consigo manter a longo prazo. Resultados reais e sustentáveis!", author: "Ana R." } },
      { type: "text", content: { text: "📊 +500 alunos transformados · 95% taxa de satisfação · 12kg de perda média em 90 dias · Presente em 3 cidades" } },
      { type: "faq", content: { question: "Preciso de experiência prévia?", answer: "Não! Os planos são adaptados a todos os níveis, desde iniciantes a avançados. Começas ao teu ritmo." } },
      { type: "button", content: { text: "Começar Hoje — Condições Especiais", url: "#especial", variant: "default" } },
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
      { type: "hero", content: { title: "Faz o Teu Negócio Crescer de Forma Sustentável", subtitle: "Estratégia, processos e resultados mensuráveis. Mais de 200 empresas transformadas nos últimos 5 anos com um método baseado em dados e acção.", cta_text: "Agendar Diagnóstico", cta_url: "#diagnostico", icon: "Briefcase" } },
      { type: "feature", content: { title: "Diagnóstico Empresarial", subtitle: "Análise completa do teu negócio em 48h: processos, finanças, equipa e mercado. Identificamos oportunidades escondidas e gargalos que travam o crescimento.", icon: "Search", cta_text: "Pedir Diagnóstico" } },
      { type: "feature", content: { title: "Estratégia de Crescimento", subtitle: "Plano de acção personalizado com metas claras, KPIs e prazos definidos. Sabes exactamente o que fazer a cada semana para escalar.", icon: "TrendingUp", cta_text: "Ver Metodologia" } },
      { type: "feature", content: { title: "ROI Garantido", subtitle: "Os nossos clientes reportam um aumento médio de 35% no faturamento nos primeiros 6 meses de consultoria. Resultados ou devolvemos o investimento.", icon: "DollarSign", cta_text: "Ver Casos" } },
      { type: "feature", content: { title: "Mentoria Executiva", subtitle: "Sessões individuais com o CEO/fundador para desenvolvimento de liderança, tomada de decisão e gestão de equipa de alto desempenho.", icon: "GraduationCap", cta_text: "Saber Mais" } },
      { type: "text", content: { text: "📊 \"Não se trata de trabalhar mais — trata-se de trabalhar com estratégia. Cada decisão deve ser baseada em dados e orientada para resultados mensuráveis.\"" } },
      { type: "button", content: { text: "Diagnóstico Gratuito de 30 min", url: "#diagnostico", variant: "default" } },
      { type: "testimonials", content: { text: "Aumentámos o faturamento em 42% em 6 meses. A consultoria foi um investimento com retorno imediato e transformou a forma como gerimos o negócio.", author: "Carlos M. — CEO, TechStart" } },
      { type: "testimonials", content: { text: "Finalmente temos processos claros e uma equipa alinhada. A produtividade disparou e o stress reduziu drasticamente.", author: "Sofia L. — Directora, Bloom Agency" } },
      { type: "testimonials", content: { text: "O diagnóstico revelou problemas que não víamos há anos. Em 3 meses já tínhamos recuperado o investimento na consultoria.", author: "Miguel R. — Fundador, GreenTech" } },
      { type: "text", content: { text: "🏆 +200 empresas transformadas · 35% aumento médio de faturamento · 92% taxa de retenção de clientes · 15 anos de experiência" } },
      { type: "faq", content: { question: "Qual o investimento mínimo?", answer: "Temos pacotes a partir de consultoria pontual até acompanhamento trimestral. O diagnóstico inicial de 30 minutos é gratuito e sem compromisso." } },
      { type: "button", content: { text: "Reservar Sessão Estratégica", url: "#sessao", variant: "default" } },
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
      { type: "hero", content: { title: "Encontra o Teu Equilíbrio Interior", subtitle: "Sessões de terapia personalizadas num espaço seguro e acolhedor. Cuida da tua saúde mental com acompanhamento profissional e ferramentas práticas para o dia-a-dia.", cta_text: "Agendar Sessão", cta_url: "#agendar", icon: "Heart" } },
      { type: "feature", content: { title: "Sessões Individuais", subtitle: "Acompanhamento terapêutico adaptado às tuas necessidades. Presencial ou online, no horário que te convém. Primeira sessão com condições especiais.", icon: "Users", cta_text: "Marcar Sessão" } },
      { type: "feature", content: { title: "Mindfulness & Meditação", subtitle: "Técnicas práticas de mindfulness para gerir ansiedade, stress e melhorar a qualidade do sono. Programas de 8 semanas com resultados comprovados.", icon: "Sparkles", cta_text: "Ver Programa" } },
      { type: "feature", content: { title: "Workshops de Grupo", subtitle: "Sessões em grupo para desenvolvimento pessoal, gestão emocional e autoconhecimento. Ambiente seguro com grupos pequenos (máx. 8 pessoas).", icon: "GraduationCap", cta_text: "Próximas Datas" } },
      { type: "feature", content: { title: "Terapia de Casal", subtitle: "Reconecta-te com o teu parceiro/a. Sessões focadas em comunicação, resolução de conflitos e fortalecimento da relação.", icon: "Heart", cta_text: "Saber Mais" } },
      { type: "text", content: { text: "🌿 \"Cuidar de ti não é egoísmo — é necessidade. O primeiro passo para uma vida mais plena começa com a decisão de pedir ajuda. Estou aqui para caminhar contigo.\"" } },
      { type: "button", content: { text: "Sessão de Avaliação — Condições Especiais", url: "#avaliacao", variant: "default" } },
      { type: "testimonials", content: { text: "Finalmente encontrei alguém que me ouve sem julgar. As sessões mudaram a minha vida e a forma como me relaciono comigo e com os outros.", author: "Marta F." } },
      { type: "testimonials", content: { text: "Aprendi ferramentas práticas para lidar com a ansiedade. Sinto-me muito mais calmo e presente no dia-a-dia.", author: "Ricardo T." } },
      { type: "testimonials", content: { text: "O workshop de mindfulness foi transformador. Durmo melhor, trabalho com mais foco e sinto-me mais equilibrada.", author: "Catarina M." } },
      { type: "text", content: { text: "🧘 +800 sessões realizadas · 98% dos pacientes recomendam · Membro da Ordem dos Psicólogos · Formação internacional" } },
      { type: "faq", content: { question: "As sessões podem ser online?", answer: "Sim! Ofereço sessões presenciais e por videochamada com a mesma qualidade e privacidade. Escolhes o formato que te for mais conveniente." } },
      { type: "button", content: { text: "Dar o Primeiro Passo", url: "#primeiro-passo", variant: "default" } },
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
      { type: "hero", content: { title: "Uma Experiência Gastronómica Inesquecível", subtitle: "Cozinha de autor com ingredientes locais e de época. Reserva a tua mesa e descobre sabores que contam histórias de tradição e inovação.", cta_text: "Reservar Mesa", cta_url: "#reservar", icon: "Utensils" } },
      { type: "feature", content: { title: "Menu de Degustação", subtitle: "5 momentos gastronómicos criados pelo nosso chef, com harmonização de vinhos regionais. Uma viagem de sabores que surpreende a cada prato.", icon: "Star", cta_text: "Ver Menu" } },
      { type: "feature", content: { title: "Ingredientes Locais", subtitle: "Trabalhamos directamente com produtores locais. Cada prato respeita a sazonalidade e valoriza o terroir português com técnicas contemporâneas.", icon: "Heart", cta_text: "Conhecer Produtores" } },
      { type: "feature", content: { title: "Eventos Privados", subtitle: "Espaço exclusivo para jantares de grupo, aniversários e eventos corporativos. Menus personalizados e serviço dedicado até 40 pessoas.", icon: "Users", cta_text: "Pedir Proposta" } },
      { type: "feature", content: { title: "Wine Bar & Cocktails", subtitle: "Carta de vinhos com mais de 80 referências portuguesas e cocktails de autor preparados com ingredientes frescos da estação.", icon: "Sparkles", cta_text: "Ver Carta" } },
      { type: "text", content: { text: "🍷 \"A gastronomia é memória, é afecto, é partilha. Cada prato que servimos é uma carta de amor aos sabores da nossa terra e à arte de bem receber.\"" } },
      { type: "button", content: { text: "Ver Menu Completo", url: "#menu", variant: "default" } },
      { type: "testimonials", content: { text: "O melhor restaurante onde jantei este ano. O menu de degustação é imperdível! Cada prato uma obra de arte.", author: "Helena V." } },
      { type: "testimonials", content: { text: "Ambiente acolhedor, serviço impecável e comida excepcional. Voltarei com certeza e já recomendei a todos os amigos.", author: "André C." } },
      { type: "testimonials", content: { text: "Celebrámos o nosso aniversário aqui e foi perfeito. O menu personalizado e a atenção aos detalhes fizeram toda a diferença.", author: "Joana & Pedro" } },
      { type: "text", content: { text: "⭐ 4.9/5 no Google · Recomendado pelo Guia Michelin · +2000 clientes satisfeitos · Chef com experiência internacional" } },
      { type: "faq", content: { question: "Precisamos de reservar com antecedência?", answer: "Recomendamos reserva, especialmente ao fim-de-semana. Para eventos privados, sugerimos contacto com pelo menos 2 semanas de antecedência." } },
      { type: "button", content: { text: "Reservar Mesa — Jantar Especial", url: "#reservar", variant: "default" } },
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
      { type: "hero", content: { title: "Descobre a Nossa Colecção Exclusiva", subtitle: "Produtos únicos, enviados em 24h para todo o país. Satisfação garantida ou devolvemos o teu dinheiro. Qualidade premium a preços acessíveis.", cta_text: "Ver Colecção", cta_url: "#coleccao", icon: "ShoppingBag" } },
      { type: "feature", content: { title: "Envio em 24h", subtitle: "Encomendas processadas e enviadas no mesmo dia útil. Entrega rápida e segura em todo o território nacional com tracking em tempo real.", icon: "Zap", cta_text: "Ver Portes" } },
      { type: "feature", content: { title: "Garantia de Satisfação", subtitle: "Não ficaste satisfeito? Devolvemos o valor total sem perguntas nos primeiros 30 dias. A tua confiança é a nossa prioridade absoluta.", icon: "Shield", cta_text: "Política de Devoluções" } },
      { type: "feature", content: { title: "Edições Limitadas", subtitle: "Colecções exclusivas em quantidades limitadas. Quando esgota, não volta. Garante a tua peça antes que desapareça.", icon: "Sparkles", cta_text: "Ver Edições" } },
      { type: "feature", content: { title: "Programa de Fidelidade", subtitle: "Acumula pontos em cada compra e troca por descontos exclusivos. Clientes VIP recebem acesso antecipado a novas colecções.", icon: "Star", cta_text: "Aderir Grátis" } },
      { type: "text", content: { text: "🛍️ Usa o código BEMVINDO15 para 15% de desconto na tua primeira compra! Válido por tempo limitado." } },
      { type: "button", content: { text: "Comprar Agora — 15% OFF", url: "#loja", variant: "default" } },
      { type: "testimonials", content: { text: "Qualidade incrível e chegou super rápido. Já fiz 3 encomendas e cada vez fico mais fã! Os materiais são premium mesmo.", author: "Inês M." } },
      { type: "testimonials", content: { text: "O atendimento é espectacular. Responderam a tudo em menos de 1 hora e ajudaram-me a escolher o tamanho certo.", author: "Pedro A." } },
      { type: "testimonials", content: { text: "Precisei de trocar o tamanho e foi super fácil. Zero complicações. Uma loja de confiança!", author: "Sara L." } },
      { type: "text", content: { text: "📦 +5.000 encomendas entregues · 4.9/5 satisfação · Envio grátis acima de 50€ · Devoluções gratuitas" } },
      { type: "faq", content: { question: "Qual o prazo de entrega?", answer: "Encomendas feitas antes das 14h são enviadas no mesmo dia. Entregas em 1-3 dias úteis para Portugal continental, 3-5 dias para ilhas." } },
      { type: "button", content: { text: "Explorar Novidades", url: "#novidades", variant: "default" } },
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
      { type: "hero", content: { title: "Realça a Tua Beleza Natural", subtitle: "Tratamentos premium num ambiente exclusivo. Cada detalhe pensado para te fazer sentir especial. Profissionais com formação internacional.", cta_text: "Marcar Agora", cta_url: "#marcar", icon: "Scissors" } },
      { type: "feature", content: { title: "Corte & Styling", subtitle: "Profissionais com formação internacional. Análise de rosto, colorimetria e um look pensado para valorizar os teus traços únicos.", icon: "Scissors", cta_text: "Ver Preçário" } },
      { type: "feature", content: { title: "Tratamentos Capilares", subtitle: "Hidratação profunda, reconstrução e tratamentos de brilho com produtos premium de marcas exclusivas como Kérastase e Olaplex.", icon: "Sparkles", cta_text: "Conhecer Tratamentos" } },
      { type: "feature", content: { title: "Pack Noiva / Eventos", subtitle: "Maquilhagem, penteado e tratamento facial. Tudo o que precisas para brilhar no teu dia especial. Inclui prova prévia.", icon: "Heart", cta_text: "Ver Packs" } },
      { type: "feature", content: { title: "Nail Art & Estética", subtitle: "Manicure, pedicure, extensões de pestanas e tratamentos faciais. Um espaço completo para cuidares de ti da cabeça aos pés.", icon: "Star", cta_text: "Agendar" } },
      { type: "text", content: { text: "✨ \"A beleza não é sobre perfeição — é sobre se sentir confiante na própria pele. Estamos aqui para realçar o que já é teu e fazer-te brilhar.\"" } },
      { type: "button", content: { text: "Pack Primeira Visita — 20% OFF", url: "#pack", variant: "default" } },
      { type: "testimonials", content: { text: "O melhor salão onde já fui! Saí de lá a sentir-me uma nova pessoa. O atendimento é excepcional.", author: "Catarina L." } },
      { type: "testimonials", content: { text: "O pack noiva foi perfeito. Trataram de tudo com tanto carinho e profissionalismo! O meu dia ficou inesquecível.", author: "Beatriz R." } },
      { type: "testimonials", content: { text: "Vou lá há 2 anos e nunca desiludem. A equipa é fantástica e os tratamentos são de qualidade superior.", author: "Diana S." } },
      { type: "text", content: { text: "💅 +3.000 clientes satisfeitas · 4.9/5 avaliação · Produtos premium · Equipa com formação contínua" } },
      { type: "faq", content: { question: "Preciso de marcar com antecedência?", answer: "Recomendamos marcação para garantir disponibilidade. Para packs noiva, aconselhamos marcação com 1-2 meses de antecedência." } },
      { type: "button", content: { text: "Marcar Tratamento", url: "#marcar", variant: "default" } },
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
      { type: "hero", content: { title: "Capturo Momentos Que Contam Histórias", subtitle: "Fotografia autoral com sensibilidade e técnica. Casamentos, retratos, produto e editorial. Cada imagem é uma narrativa visual única.", cta_text: "Ver Portfolio", cta_url: "#portfolio", icon: "Camera" } },
      { type: "feature", content: { title: "Casamentos & Eventos", subtitle: "Cobertura completa do teu dia especial. Fotografia documental e artística que preserva cada emoção, cada olhar, cada detalhe.", icon: "Heart", cta_text: "Ver Casamentos" } },
      { type: "feature", content: { title: "Retratos & Branding", subtitle: "Sessões de retrato pessoal e corporativo. Imagens que comunicam a tua essência e profissionalismo para redes sociais e websites.", icon: "Users", cta_text: "Ver Retratos" } },
      { type: "feature", content: { title: "Fotografia de Produto", subtitle: "Imagens que vendem. Packshots, lifestyle e still life para e-commerce e redes sociais. Aumento comprovado de conversões.", icon: "ShoppingBag", cta_text: "Ver Exemplos" } },
      { type: "feature", content: { title: "Fotografia Editorial", subtitle: "Colaborações com revistas, marcas e agências. Storytelling visual que eleva campanhas e editoriais de moda e lifestyle.", icon: "Star", cta_text: "Ver Editorial" } },
      { type: "text", content: { text: "📸 \"Cada fotografia é uma história suspensa no tempo. O meu trabalho é encontrar a beleza nos momentos que parecem comuns e transformá-los em memórias eternas.\"" } },
      { type: "button", content: { text: "Mini-Sessão — Preço Especial", url: "#sessao", variant: "default" } },
      { type: "testimonials", content: { text: "As fotos do nosso casamento são um tesouro. Cada imagem conta uma parte da nossa história. Não podíamos estar mais felizes.", author: "Joana & Miguel" } },
      { type: "testimonials", content: { text: "As fotos de produto aumentaram as nossas vendas em 30%. Profissional incrível, entrega rápida e qualidade excepcional.", author: "Sara T. — Brand Manager" } },
      { type: "testimonials", content: { text: "A sessão de retratos superou todas as expectativas. Conseguiu captar a minha personalidade de forma natural e autêntica.", author: "Francisco M." } },
      { type: "text", content: { text: "🏆 +200 casamentos · 50+ marcas · Publicado em 8 revistas · Premiado nos Wedding Awards 2024" } },
      { type: "faq", content: { question: "Quanto custa uma sessão?", answer: "Mini-sessões a partir de 150€. Casamentos e eventos têm pacotes personalizados. Peça um orçamento sem compromisso — respondo em 24h." } },
      { type: "button", content: { text: "Pedir Orçamento Personalizado", url: "#orcamento", variant: "default" } },
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
      { type: "hero", content: { title: "Design Que Transforma Marcas", subtitle: "Branding, UI/UX e identidade visual. Crio experiências visuais que conectam marcas a pessoas e geram resultados mensuráveis.", cta_text: "Ver Projectos", cta_url: "#projectos", icon: "Palette" } },
      { type: "feature", content: { title: "Branding & Identidade", subtitle: "Logo, paleta cromática, tipografia e manual de marca. Uma identidade visual coesa e memorável que diferencia o teu negócio no mercado.", icon: "Sparkles", cta_text: "Ver Portfolio" } },
      { type: "feature", content: { title: "UI/UX Design", subtitle: "Interfaces intuitivas e bonitas. Design centrado no utilizador para apps e websites que convertem visitantes em clientes.", icon: "LayoutGrid", cta_text: "Ver Casos" } },
      { type: "feature", content: { title: "Design para Redes Sociais", subtitle: "Templates, carrosséis e conteúdo visual que destaca a tua marca no feed. Pacotes mensais com entrega rápida e revisões ilimitadas.", icon: "Camera", cta_text: "Ver Pacotes" } },
      { type: "feature", content: { title: "Processo Transparente", subtitle: "Briefing → Pesquisa → Conceito → Refinamento → Entrega. Acompanhas cada passo do projecto com feedback contínuo.", icon: "Check", cta_text: "Como Funciona" } },
      { type: "text", content: { text: "🎨 \"Bom design não é só estética — é estratégia visual. Cada pixel serve um propósito, cada cor comunica uma emoção, cada layout guia uma acção.\"" } },
      { type: "button", content: { text: "Pedir Proposta Personalizada", url: "#proposta", variant: "default" } },
      { type: "testimonials", content: { text: "O rebranding transformou completamente a percepção da nossa marca. Passámos de invisíveis a referência no sector.", author: "Startup XYZ" } },
      { type: "testimonials", content: { text: "Interface impecável. Os nossos utilizadores adoram a nova experiência e a taxa de conversão subiu 45%.", author: "Ricardo — Fundador, NovaTech" } },
      { type: "testimonials", content: { text: "O melhor designer com quem já trabalhei. Entende o briefing à primeira, entrega rápido e a qualidade é sempre superior.", author: "Ana P. — Marketing Director" } },
      { type: "text", content: { text: "✨ +80 projectos entregues · 30+ marcas redesenhadas · 4.9/5 satisfação · Clientes em 5 países" } },
      { type: "faq", content: { question: "Qual o prazo de entrega?", answer: "Depende do projecto: logos em 5-7 dias, branding completo em 2-3 semanas, UI/UX em 3-4 semanas. Entregas urgentes disponíveis." } },
      { type: "button", content: { text: "Começar um Projecto", url: "#projecto", variant: "default" } },
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
      { type: "hero", content: { title: "Ouve. Sente. Vive a Música.", subtitle: "Novo single disponível em todas as plataformas. Mais de 500K streams e a crescer. Música que toca a alma e move o corpo.", cta_text: "Ouvir Agora", cta_url: "#ouvir", icon: "Music" } },
      { type: "link", content: { title: "🎵 Ouvir no Spotify", url: "https://spotify.com/", description: "Todos os álbuns e singles disponíveis" } },
      { type: "link", content: { title: "🍎 Apple Music", url: "https://music.apple.com/", description: "Disponível em Apple Music" } },
      { type: "link", content: { title: "▶️ YouTube — Videoclipes", url: "https://youtube.com/", description: "Vê os videoclipes oficiais" } },
      { type: "text", content: { text: "🎤 Próximo concerto: 15 de Março — Coliseu dos Recreios, Lisboa. Bilhetes limitados! Não percas esta oportunidade." } },
      { type: "button", content: { text: "Comprar Bilhetes", url: "#bilhetes", variant: "default" } },
      { type: "feature", content: { title: "Disponível para Eventos", subtitle: "Concertos privados, festivais, casamentos e eventos corporativos. Envia uma mensagem para booking e condições.", icon: "Star", cta_text: "Pedir Booking" } },
      { type: "feature", content: { title: "Novo Álbum — Em Pré-Venda", subtitle: "12 faixas originais gravadas nos míticos estúdios de Lisboa. Edição limitada em vinil com artwork exclusiva.", icon: "Music", cta_text: "Reservar" } },
      { type: "testimonials", content: { text: "Um dos melhores concertos a que já assisti. Energia incrível, voz potente e uma ligação única com o público.", author: "Revista Blitz" } },
      { type: "testimonials", content: { text: "Contratámos para o nosso evento corporativo e foi um sucesso absoluto. Profissional e talentoso.", author: "EventosPro — João M." } },
      { type: "text", content: { text: "🎵 +500K streams · 3 álbuns · 50+ concertos · Nomeado para os Portugal Music Awards" } },
      { type: "faq", content: { question: "Posso contratar para um evento privado?", answer: "Sim! Faço concertos privados, casamentos e eventos corporativos. Contacta para disponibilidade e condições especiais." } },
      { type: "button", content: { text: "Merchandise Oficial", url: "#merch", variant: "default" } },
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
      { type: "hero", content: { title: "Resultados Digitais Que Fazem a Diferença", subtitle: "Estratégia, performance e criatividade. Gerimos a presença digital de mais de 50 marcas em Portugal com ROI comprovado.", cta_text: "Auditoria Gratuita", cta_url: "#auditoria", icon: "Target" } },
      { type: "feature", content: { title: "Gestão de Redes Sociais", subtitle: "Conteúdo estratégico, calendário editorial e relatórios mensais detalhados. Transformamos seguidores em clientes fiéis.", icon: "Users", cta_text: "Ver Planos" } },
      { type: "feature", content: { title: "Google & Meta Ads", subtitle: "Campanhas de performance com ROI médio de 4.2x. Cada euro investido é optimizado com IA e testes A/B contínuos.", icon: "TrendingUp", cta_text: "Ver Resultados" } },
      { type: "feature", content: { title: "SEO & Conteúdo", subtitle: "Posiciona o teu site no topo do Google. Estratégia de conteúdo que gera tráfego orgânico qualificado e autoridade no sector.", icon: "Search", cta_text: "Auditoria SEO" } },
      { type: "feature", content: { title: "Email Marketing & Automação", subtitle: "Sequências de email que nutrem leads e convertem em vendas. Automações inteligentes que trabalham enquanto dormes.", icon: "Mail", cta_text: "Saber Mais" } },
      { type: "text", content: { text: "📈 Caso de estudo: Aumentámos o tráfego orgânico de um cliente em 312% em 6 meses, gerando +150 leads qualificados por mês e triplicando o faturamento." } },
      { type: "button", content: { text: "Pedir Auditoria Digital Gratuita", url: "#auditoria", variant: "default" } },
      { type: "testimonials", content: { text: "Triplicámos os leads em 4 meses. A equipa é excepcional, os resultados falam por si e a comunicação é transparente.", author: "TechFlow — SaaS B2B" } },
      { type: "testimonials", content: { text: "O ROAS das campanhas passou de 1.8x para 5.1x. O melhor investimento em marketing que fizemos.", author: "Bloom Store — E-commerce" } },
      { type: "testimonials", content: { text: "Passámos da página 5 para o top 3 do Google em 4 meses. O tráfego orgânico explodiu e as vendas acompanharam.", author: "Dr. Santos — Clínica Médica" } },
      { type: "text", content: { text: "🚀 +50 marcas geridas · ROI médio 4.2x · +2M em vendas geradas · Equipa certificada Google & Meta" } },
      { type: "faq", content: { question: "Qual o investimento mínimo?", answer: "Temos pacotes a partir de 500€/mês para gestão de redes sociais. Campanhas de Ads a partir de 300€/mês + investimento publicitário. Auditoria inicial gratuita." } },
      { type: "button", content: { text: "Marcar Reunião Estratégica", url: "#reuniao", variant: "default" } },
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
      { type: "hero", content: { title: "Desenvolvimento Web & Mobile Sob Medida", subtitle: "Full-stack developer com +8 anos de experiência. Transformo ideias em produtos digitais que funcionam, escalam e geram resultados.", cta_text: "Pedir Orçamento", cta_url: "#orcamento", icon: "Brain" } },
      { type: "feature", content: { title: "Web Apps & SaaS", subtitle: "Desenvolvimento de aplicações web modernas com React, Node.js e cloud. Da ideia ao deploy, com arquitectura escalável e código limpo.", icon: "LayoutGrid", cta_text: "Ver Projectos" } },
      { type: "feature", content: { title: "Apps Mobile", subtitle: "Aplicações nativas e cross-platform para iOS e Android. Interfaces rápidas, UX impecável e integração com APIs de terceiros.", icon: "Zap", cta_text: "Ver Apps" } },
      { type: "feature", content: { title: "Consultoria Técnica", subtitle: "Revisão de arquitectura, code review e mentoria técnica. Ajudo equipas a tomar melhores decisões e a evitar erros caros.", icon: "Shield", cta_text: "Agendar Sessão" } },
      { type: "feature", content: { title: "DevOps & Infra", subtitle: "CI/CD, containerização, monitorização e optimização de custos cloud. Infra sólida para que o teu produto nunca pare.", icon: "Wrench", cta_text: "Saber Mais" } },
      { type: "text", content: { text: "💻 Stack: React · TypeScript · Node.js · PostgreSQL · AWS · Docker · CI/CD · Python · GraphQL" } },
      { type: "button", content: { text: "Estimativa Gratuita em 24h", url: "#estimativa", variant: "default" } },
      { type: "testimonials", content: { text: "Entregou a app 2 semanas antes do prazo e com qualidade superior ao esperado. Profissional de excelência que recomendo a todos.", author: "Maria G. — Fundadora, HealthApp" } },
      { type: "testimonials", content: { text: "A consultoria técnica poupou-nos meses de desenvolvimento errado. Vale cada cêntimo investido. Clareza e competência.", author: "StartupXYZ — CTO" } },
      { type: "testimonials", content: { text: "Redesenhou toda a arquitectura do nosso SaaS. Passámos de 2 segundos para 200ms de loading. Impressionante.", author: "Pedro R. — Co-Fundador, DataFlow" } },
      { type: "text", content: { text: "⚡ +40 projectos entregues · 100% dentro do prazo · Clientes em 6 países · 8 anos de experiência" } },
      { type: "faq", content: { question: "Qual o teu processo de trabalho?", answer: "Briefing → Estimativa (24h) → Proposta detalhada → Desenvolvimento em sprints semanais com demos → Deploy → Suporte pós-entrega de 30 dias incluído." } },
      { type: "button", content: { text: "Vamos Construir Algo Incrível", url: "#projecto", variant: "default" } },
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
      { type: "hero", content: { title: "Conteúdo Que Inspira & Converte", subtitle: "Creator digital com +100K seguidores. Parcerias autênticas com marcas que partilham os meus valores e ressoam com a minha audiência.", cta_text: "Ver Media Kit", cta_url: "#mediakit", icon: "Sparkles" } },
      { type: "link", content: { title: "📸 Instagram — Conteúdo Diário", url: "https://instagram.com/", description: "Lifestyle, dicas e bastidores" } },
      { type: "link", content: { title: "🎬 TikTok — Vídeos Virais", url: "https://tiktok.com/", description: "Trends, challenges e conteúdo original" } },
      { type: "link", content: { title: "▶️ YouTube — Vlogs & Reviews", url: "https://youtube.com/", description: "Vídeos longos, reviews e tutoriais" } },
      { type: "feature", content: { title: "Parcerias com Marcas", subtitle: "Posts patrocinados, unboxings, stories takeover e embaixador de marca. Conteúdo autêntico que gera engagement e conversões reais.", icon: "Star", cta_text: "Pedir Proposta" } },
      { type: "feature", content: { title: "Media Kit Disponível", subtitle: "Dados de audiência, engagement rate, demographics e cases anteriores. Tudo transparente, actualizado e pronto para partilhar.", icon: "FileText", cta_text: "Descarregar" } },
      { type: "text", content: { text: "✨ +100K seguidores · 4.8% engagement rate · +50 parcerias realizadas · Audiência 70% Portugal · 65% mulheres 18-34" } },
      { type: "button", content: { text: "Descarregar Media Kit", url: "#mediakit", variant: "default" } },
      { type: "testimonials", content: { text: "A parceria superou todas as expectativas. O conteúdo foi autêntico, o engagement foi altíssimo e as vendas dispararam.", author: "Marca XYZ — Marketing Team" } },
      { type: "testimonials", content: { text: "Profissional, criativo e super fácil de trabalhar. As fotos e vídeos foram incríveis. Repetimos com certeza.", author: "Brand ABC — PR Manager" } },
      { type: "testimonials", content: { text: "O melhor ROI que tivemos em influencer marketing. Conteúdo genuíno que ressoou com a nossa audiência-alvo.", author: "StartupDEF — CEO" } },
      { type: "faq", content: { question: "Que tipo de parcerias fazes?", answer: "Posts no feed, stories, reels, vídeos TikTok, unboxings, reviews honestas e embaixador de marca. Só aceito marcas que genuinamente uso e recomendo." } },
      { type: "button", content: { text: "Propor Parceria", url: "#parceria", variant: "default" } },
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
