// Email Builder Types - Professional Edition

export type EmailBlockType = 
  | 'text' 
  | 'image' 
  | 'button' 
  | 'divider' 
  | 'spacer' 
  | 'columns' 
  | 'social' 
  | 'footer' 
  | 'logo' 
  | 'video' 
  | 'html'
  // Premium blocks
  | 'hero'
  | 'imageText'
  | 'product'
  | 'testimonial'
  | 'countdown'
  | 'menu';

export interface EmailBlockStyles {
  // Text styles
  color?: string;
  fontSize?: string;
  fontWeight?: string;
  textAlign?: 'left' | 'center' | 'right';
  fontFamily?: string;
  lineHeight?: string;
  
  // Layout styles
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundSize?: string;
  backgroundPosition?: string;
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  boxShadow?: string;
  
  // Image/Button specific
  width?: string;
  maxWidth?: string;
  height?: string;
  minHeight?: string;
}

export interface TextBlockContent {
  html: string;
}

export interface ImageBlockContent {
  src: string;
  alt: string;
  link?: string;
}

export interface ButtonBlockContent {
  text: string;
  url: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: string;
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

export interface DividerBlockContent {
  color?: string;
  thickness?: string;
  style?: 'solid' | 'dashed' | 'dotted';
}

export interface SpacerBlockContent {
  height: string;
}

export interface ColumnsBlockContent {
  columns: number;
  gap?: string;
  layout?: '50-50' | '60-40' | '40-60' | '70-30' | '30-70' | '33-33-33';
}

export interface SocialBlockContent {
  networks: {
    type: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok' | 'whatsapp';
    url: string;
  }[];
  iconSize?: string;
  iconColor?: string;
  iconStyle?: 'circle' | 'square' | 'rounded';
}

export interface FooterBlockContent {
  text: string;
  showUnsubscribe?: boolean;
  companyInfo?: string;
}

export interface VideoBlockContent {
  thumbnailUrl: string;
  videoUrl: string;
  playButtonColor?: string;
}

export interface HtmlBlockContent {
  html: string;
}

// Premium block content types
export interface HeroBlockContent {
  backgroundImage: string;
  backgroundColor?: string;
  overlayColor?: string;
  overlayOpacity?: number;
  title: string;
  subtitle?: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
  height?: string;
  alignment?: 'left' | 'center' | 'right';
}

export interface ImageTextBlockContent {
  imageSrc: string;
  imageAlt: string;
  imagePosition: 'left' | 'right';
  imageWidth: '30' | '40' | '50' | '60';
  title: string;
  text: string;
  buttonText?: string;
  buttonUrl?: string;
  buttonColor?: string;
}

export interface ProductBlockContent {
  imageSrc: string;
  imageAlt: string;
  name: string;
  description?: string;
  price: string;
  originalPrice?: string;
  badge?: string;
  buttonText: string;
  buttonUrl: string;
  buttonColor?: string;
}

export interface TestimonialBlockContent {
  quote: string;
  authorName: string;
  authorTitle?: string;
  authorImage?: string;
  rating?: number;
  companyLogo?: string;
}

export interface CountdownBlockContent {
  targetDate: string;
  title?: string;
  subtitle?: string;
  expiredMessage?: string;
  style?: 'boxes' | 'inline' | 'minimal';
  backgroundColor?: string;
  textColor?: string;
  accentColor?: string;
}

export interface MenuBlockContent {
  items: {
    text: string;
    url: string;
  }[];
  separator?: string;
  alignment?: 'left' | 'center' | 'right';
}

export type EmailBlockContent = 
  | TextBlockContent 
  | ImageBlockContent 
  | ButtonBlockContent 
  | DividerBlockContent 
  | SpacerBlockContent 
  | ColumnsBlockContent 
  | SocialBlockContent 
  | FooterBlockContent
  | VideoBlockContent
  | HtmlBlockContent
  | HeroBlockContent
  | ImageTextBlockContent
  | ProductBlockContent
  | TestimonialBlockContent
  | CountdownBlockContent
  | MenuBlockContent;

export interface EmailBlock {
  id: string;
  type: EmailBlockType;
  content: EmailBlockContent;
  styles: EmailBlockStyles;
  children?: EmailBlock[]; // For columns
}

export interface EmailGlobalStyles {
  backgroundColor: string;
  contentBackgroundColor: string;
  contentWidth: number;
  fontFamily: string;
  linkColor: string;
  textColor: string;
  accentColor: string;
  borderRadius: string;
}

export interface EmailDesign {
  blocks: EmailBlock[];
  globalStyles: EmailGlobalStyles;
}

// Default global styles
export const DEFAULT_GLOBAL_STYLES: EmailGlobalStyles = {
  backgroundColor: '#f5f5f5',
  contentBackgroundColor: '#ffffff',
  contentWidth: 600,
  fontFamily: 'Arial, sans-serif',
  linkColor: '#3b82f6',
  textColor: '#333333',
  accentColor: '#3b82f6',
  borderRadius: '8px',
};

// Helper to create unique IDs
export function generateBlockId(): string {
  return `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Default blocks for each type
export const DEFAULT_BLOCKS: Record<EmailBlockType, () => EmailBlock> = {
  text: () => ({
    id: generateBlockId(),
    type: 'text',
    content: { html: '<p>Escreve o teu texto aqui...</p>' } as TextBlockContent,
    styles: { padding: '16px 0' },
  }),
  image: () => ({
    id: generateBlockId(),
    type: 'image',
    content: { src: '', alt: 'Imagem', link: '' } as ImageBlockContent,
    styles: { textAlign: 'center', padding: '16px 0' },
  }),
  button: () => ({
    id: generateBlockId(),
    type: 'button',
    content: { 
      text: 'Clica Aqui', 
      url: '#',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      borderRadius: '8px',
      size: 'medium',
    } as ButtonBlockContent,
    styles: { textAlign: 'center', padding: '24px 0' },
  }),
  divider: () => ({
    id: generateBlockId(),
    type: 'divider',
    content: { color: '#e5e5e5', thickness: '1px', style: 'solid' } as DividerBlockContent,
    styles: { padding: '24px 0' },
  }),
  spacer: () => ({
    id: generateBlockId(),
    type: 'spacer',
    content: { height: '32px' } as SpacerBlockContent,
    styles: {},
  }),
  columns: () => ({
    id: generateBlockId(),
    type: 'columns',
    content: { columns: 2, gap: '24px', layout: '50-50' } as ColumnsBlockContent,
    styles: { padding: '16px 0' },
    children: [],
  }),
  social: () => ({
    id: generateBlockId(),
    type: 'social',
    content: { 
      networks: [
        { type: 'facebook', url: '#' },
        { type: 'instagram', url: '#' },
        { type: 'linkedin', url: '#' },
        { type: 'twitter', url: '#' },
      ],
      iconSize: '40px',
      iconStyle: 'circle',
    } as SocialBlockContent,
    styles: { textAlign: 'center', padding: '24px 0' },
  }),
  footer: () => ({
    id: generateBlockId(),
    type: 'footer',
    content: { 
      text: '{{empresa_nome}}',
      companyInfo: '{{empresa_endereco}}',
      showUnsubscribe: true,
    } as FooterBlockContent,
    styles: { 
      textAlign: 'center', 
      padding: '32px 24px', 
      backgroundColor: '#f8f9fa',
      fontSize: '13px',
      color: '#6b7280',
    },
  }),
  logo: () => ({
    id: generateBlockId(),
    type: 'logo',
    content: { src: '', alt: 'Logo', link: '' } as ImageBlockContent,
    styles: { textAlign: 'center', padding: '24px 0', maxWidth: '180px' },
  }),
  video: () => ({
    id: generateBlockId(),
    type: 'video',
    content: { thumbnailUrl: '', videoUrl: '', playButtonColor: '#ffffff' } as VideoBlockContent,
    styles: { textAlign: 'center', padding: '24px 0' },
  }),
  html: () => ({
    id: generateBlockId(),
    type: 'html',
    content: { html: '<!-- HTML personalizado -->' } as HtmlBlockContent,
    styles: { padding: '16px 0' },
  }),
  // Premium blocks
  hero: () => ({
    id: generateBlockId(),
    type: 'hero',
    content: {
      backgroundImage: '',
      backgroundColor: '#1a1a2e',
      overlayColor: '#000000',
      overlayOpacity: 0.5,
      title: 'Título Principal Impactante',
      subtitle: 'Subtítulo que complementa a mensagem principal',
      buttonText: 'Começar Agora',
      buttonUrl: '#',
      buttonColor: '#3b82f6',
      height: '400px',
      alignment: 'center',
    } as HeroBlockContent,
    styles: { padding: '0' },
  }),
  imageText: () => ({
    id: generateBlockId(),
    type: 'imageText',
    content: {
      imageSrc: '',
      imageAlt: 'Imagem',
      imagePosition: 'left',
      imageWidth: '50',
      title: 'Título da Secção',
      text: 'Descrição do conteúdo que acompanha a imagem. Podes personalizar este texto.',
      buttonText: 'Saber Mais',
      buttonUrl: '#',
      buttonColor: '#3b82f6',
    } as ImageTextBlockContent,
    styles: { padding: '32px 0' },
  }),
  product: () => ({
    id: generateBlockId(),
    type: 'product',
    content: {
      imageSrc: '',
      imageAlt: 'Produto',
      name: 'Nome do Produto',
      description: 'Breve descrição do produto com os principais benefícios.',
      price: '€49,99',
      originalPrice: '€79,99',
      badge: 'OFERTA',
      buttonText: 'Comprar Agora',
      buttonUrl: '#',
      buttonColor: '#10b981',
    } as ProductBlockContent,
    styles: { padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e7eb' },
  }),
  testimonial: () => ({
    id: generateBlockId(),
    type: 'testimonial',
    content: {
      quote: '"Este serviço mudou completamente a forma como gerimos o nosso negócio. Recomendo a 100%!"',
      authorName: 'Maria Silva',
      authorTitle: 'CEO, Empresa XYZ',
      authorImage: '',
      rating: 5,
    } as TestimonialBlockContent,
    styles: { padding: '32px', backgroundColor: '#f8f9fa', borderRadius: '12px', textAlign: 'center' },
  }),
  countdown: () => ({
    id: generateBlockId(),
    type: 'countdown',
    content: {
      targetDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      title: 'Oferta Termina Em',
      subtitle: 'Aproveita antes que acabe!',
      expiredMessage: 'A oferta terminou',
      style: 'boxes',
      backgroundColor: '#1a1a2e',
      textColor: '#ffffff',
      accentColor: '#ef4444',
    } as CountdownBlockContent,
    styles: { padding: '40px 24px', textAlign: 'center' },
  }),
  menu: () => ({
    id: generateBlockId(),
    type: 'menu',
    content: {
      items: [
        { text: 'Início', url: '#' },
        { text: 'Produtos', url: '#' },
        { text: 'Sobre', url: '#' },
        { text: 'Contacto', url: '#' },
      ],
      separator: '|',
      alignment: 'center',
    } as MenuBlockContent,
    styles: { padding: '16px 0', fontSize: '14px' },
  }),
};

// Dynamic variables available
export interface DynamicVariable {
  key: string;
  label: string;
  preview: string;
  category: 'contact' | 'company' | 'campaign' | 'date';
}

export const DYNAMIC_VARIABLES: DynamicVariable[] = [
  { key: '{{primeiro_nome}}', label: 'Primeiro Nome', preview: 'João', category: 'contact' },
  { key: '{{nome_completo}}', label: 'Nome Completo', preview: 'João Silva', category: 'contact' },
  { key: '{{email}}', label: 'Email', preview: 'joao@exemplo.com', category: 'contact' },
  { key: '{{telefone}}', label: 'Telefone', preview: '+351 912 345 678', category: 'contact' },
  { key: '{{empresa_nome}}', label: 'Nome da Empresa', preview: 'Minha Empresa', category: 'company' },
  { key: '{{empresa_endereco}}', label: 'Endereço', preview: 'Lisboa, Portugal', category: 'company' },
  { key: '{{empresa_website}}', label: 'Website', preview: 'www.exemplo.com', category: 'company' },
  { key: '{{subject}}', label: 'Assunto do Email', preview: 'Assunto', category: 'campaign' },
  { key: '{{unsubscribe_url}}', label: 'Link Unsubscribe', preview: '#', category: 'campaign' },
  { key: '{{data_atual}}', label: 'Data Atual', preview: new Date().toLocaleDateString('pt-PT'), category: 'date' },
];

// Predefined layouts
export interface EmailLayout {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  category: 'blank' | 'newsletter' | 'promotional' | 'ecommerce' | 'transactional' | 'event';
  blocks: EmailBlock[];
  globalStyles?: Partial<EmailGlobalStyles>;
}

export const PREDEFINED_LAYOUTS: EmailLayout[] = [
  {
    id: 'blank',
    name: 'Em Branco',
    description: 'Começa do zero',
    category: 'blank',
    blocks: [],
  },
  {
    id: 'simple-text',
    name: 'Texto Simples',
    description: 'Email de texto direto',
    category: 'newsletter',
    blocks: [
      DEFAULT_BLOCKS.logo(),
      DEFAULT_BLOCKS.text(),
      DEFAULT_BLOCKS.spacer(),
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'newsletter-modern',
    name: 'Newsletter Moderna',
    description: 'Layout elegante para newsletters',
    category: 'newsletter',
    blocks: [
      {
        id: generateBlockId(),
        type: 'logo',
        content: { src: '', alt: 'Logo', link: '' } as ImageBlockContent,
        styles: { textAlign: 'center', padding: '32px 0 24px' },
      },
      {
        id: generateBlockId(),
        type: 'menu',
        content: {
          items: [
            { text: 'Início', url: '#' },
            { text: 'Artigos', url: '#' },
            { text: 'Produtos', url: '#' },
          ],
          separator: '•',
          alignment: 'center',
        } as MenuBlockContent,
        styles: { padding: '0 0 24px', fontSize: '14px' },
      },
      {
        id: generateBlockId(),
        type: 'hero',
        content: {
          backgroundImage: '',
          backgroundColor: '#667eea',
          overlayOpacity: 0,
          title: 'Newsletter de {{data_atual}}',
          subtitle: 'As últimas novidades para ti',
          buttonText: '',
          buttonUrl: '',
          height: '200px',
          alignment: 'center',
        } as HeroBlockContent,
        styles: { padding: '0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p>Olá <strong>{{primeiro_nome}}</strong>,</p><p>Bem-vindo à nossa newsletter semanal! Preparámos conteúdo especial para ti.</p>' } as TextBlockContent,
        styles: { padding: '32px 0 16px' },
      },
      DEFAULT_BLOCKS.imageText(),
      DEFAULT_BLOCKS.divider(),
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h2 style="margin-bottom: 16px;">Destaques da Semana</h2><p>Conteúdo interessante que selecionámos para ti.</p>' } as TextBlockContent,
        styles: { padding: '24px 0' },
      },
      DEFAULT_BLOCKS.button(),
      DEFAULT_BLOCKS.social(),
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'promotional-sale',
    name: 'Promoção Flash',
    description: 'Destaque para ofertas urgentes',
    category: 'promotional',
    blocks: [
      {
        id: generateBlockId(),
        type: 'logo',
        content: { src: '', alt: 'Logo', link: '' } as ImageBlockContent,
        styles: { textAlign: 'center', padding: '24px 0' },
      },
      {
        id: generateBlockId(),
        type: 'hero',
        content: {
          backgroundImage: '',
          backgroundColor: '#dc2626',
          overlayOpacity: 0,
          title: '🔥 SUPER PROMOÇÃO 🔥',
          subtitle: 'Até 70% de desconto em produtos selecionados',
          buttonText: 'Ver Ofertas',
          buttonUrl: '#',
          buttonColor: '#ffffff',
          height: '300px',
          alignment: 'center',
        } as HeroBlockContent,
        styles: { padding: '0' },
      },
      DEFAULT_BLOCKS.countdown(),
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h2 style="text-align: center; margin-bottom: 24px;">Produtos em Destaque</h2>' } as TextBlockContent,
        styles: { padding: '32px 0 0' },
      },
      DEFAULT_BLOCKS.product(),
      {
        id: generateBlockId(),
        type: 'button',
        content: {
          text: 'Ver Todos os Produtos',
          url: '#',
          backgroundColor: '#dc2626',
          textColor: '#ffffff',
          borderRadius: '50px',
          size: 'large',
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '32px 0' },
      },
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'product-launch',
    name: 'Lançamento de Produto',
    description: 'Apresenta um novo produto',
    category: 'ecommerce',
    blocks: [
      DEFAULT_BLOCKS.logo(),
      {
        id: generateBlockId(),
        type: 'hero',
        content: {
          backgroundImage: '',
          backgroundColor: '#1e1b4b',
          overlayOpacity: 0,
          title: 'NOVO LANÇAMENTO',
          subtitle: 'Descobre o que preparámos para ti',
          buttonText: '',
          buttonUrl: '',
          height: '250px',
          alignment: 'center',
        } as HeroBlockContent,
        styles: { padding: '0' },
      },
      {
        id: generateBlockId(),
        type: 'imageText',
        content: {
          imageSrc: '',
          imageAlt: 'Novo Produto',
          imagePosition: 'left',
          imageWidth: '50',
          title: 'Apresentamos o Novo [Produto]',
          text: 'Desenvolvido a pensar em ti, este produto vai revolucionar a forma como...',
          buttonText: 'Conhecer Mais',
          buttonUrl: '#',
          buttonColor: '#6366f1',
        } as ImageTextBlockContent,
        styles: { padding: '40px 0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h2 style="text-align: center;">Principais Características</h2>' } as TextBlockContent,
        styles: { padding: '24px 0 16px' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<ul style="list-style: none; padding: 0; text-align: center;"><li style="padding: 8px 0;">✓ Característica 1</li><li style="padding: 8px 0;">✓ Característica 2</li><li style="padding: 8px 0;">✓ Característica 3</li></ul>' } as TextBlockContent,
        styles: { padding: '0 0 24px' },
      },
      DEFAULT_BLOCKS.testimonial(),
      {
        id: generateBlockId(),
        type: 'button',
        content: {
          text: 'Comprar Agora',
          url: '#',
          backgroundColor: '#6366f1',
          textColor: '#ffffff',
          borderRadius: '8px',
          size: 'large',
          fullWidth: false,
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '32px 0' },
      },
      DEFAULT_BLOCKS.social(),
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'welcome-email',
    name: 'Email de Boas-vindas',
    description: 'Dá as boas-vindas a novos clientes',
    category: 'transactional',
    blocks: [
      DEFAULT_BLOCKS.logo(),
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h1 style="text-align: center; color: #1a1a1a;">Bem-vindo, {{primeiro_nome}}! 🎉</h1>' } as TextBlockContent,
        styles: { padding: '40px 0 16px' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p style="text-align: center; font-size: 18px; color: #4b5563;">Estamos muito felizes por teres juntado à nossa comunidade.</p>' } as TextBlockContent,
        styles: { padding: '0 0 32px' },
      },
      DEFAULT_BLOCKS.divider(),
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h2>O que podes fazer agora:</h2><ol><li style="padding: 8px 0;">Explora os nossos produtos</li><li style="padding: 8px 0;">Completa o teu perfil</li><li style="padding: 8px 0;">Descobre ofertas exclusivas</li></ol>' } as TextBlockContent,
        styles: { padding: '32px 0' },
      },
      {
        id: generateBlockId(),
        type: 'button',
        content: {
          text: 'Começar a Explorar',
          url: '#',
          backgroundColor: '#10b981',
          textColor: '#ffffff',
          borderRadius: '8px',
          size: 'large',
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '16px 0 40px' },
      },
      DEFAULT_BLOCKS.social(),
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'event-invitation',
    name: 'Convite para Evento',
    description: 'Convida para webinar ou evento',
    category: 'event',
    blocks: [
      DEFAULT_BLOCKS.logo(),
      {
        id: generateBlockId(),
        type: 'hero',
        content: {
          backgroundImage: '',
          backgroundColor: '#7c3aed',
          overlayOpacity: 0,
          title: 'Estás Convidado! 🎤',
          subtitle: 'Webinar Exclusivo sobre Marketing Digital',
          buttonText: 'Reservar Lugar',
          buttonUrl: '#',
          buttonColor: '#ffffff',
          height: '280px',
          alignment: 'center',
        } as HeroBlockContent,
        styles: { padding: '0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p style="text-align: center; font-size: 18px;">📅 <strong>15 de Fevereiro, 2026</strong> às <strong>18h00</strong></p>' } as TextBlockContent,
        styles: { padding: '32px 0 8px' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p style="text-align: center;">📍 Online via Zoom</p>' } as TextBlockContent,
        styles: { padding: '0 0 24px' },
      },
      DEFAULT_BLOCKS.countdown(),
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h2 style="text-align: center;">O que vais aprender:</h2><ul style="text-align: left; max-width: 400px; margin: 0 auto;"><li style="padding: 8px 0;">Estratégias avançadas de email marketing</li><li style="padding: 8px 0;">Como aumentar taxas de abertura</li><li style="padding: 8px 0;">Automações que convertem</li></ul>' } as TextBlockContent,
        styles: { padding: '32px 0' },
      },
      {
        id: generateBlockId(),
        type: 'button',
        content: {
          text: 'Inscrever-me Grátis',
          url: '#',
          backgroundColor: '#7c3aed',
          textColor: '#ffffff',
          borderRadius: '50px',
          size: 'large',
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '16px 0 40px' },
      },
      DEFAULT_BLOCKS.footer(),
    ],
  },
];

// Element categories for sidebar with visual icons
export interface ElementCategory {
  id: string;
  name: string;
  color: string;
  elements: {
    type: EmailBlockType;
    name: string;
    icon: string;
    description: string;
    premium?: boolean;
  }[];
}

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  {
    id: 'premium',
    name: 'Premium',
    color: '#8b5cf6',
    elements: [
      { type: 'hero', name: 'Hero Banner', icon: 'Sparkles', description: 'Banner impactante com imagem e CTA', premium: true },
      { type: 'imageText', name: 'Imagem + Texto', icon: 'LayoutPanelLeft', description: 'Imagem lado a lado com texto', premium: true },
      { type: 'product', name: 'Cartão Produto', icon: 'ShoppingBag', description: 'Destaca um produto com preço', premium: true },
      { type: 'testimonial', name: 'Testemunho', icon: 'Quote', description: 'Citação de cliente', premium: true },
      { type: 'countdown', name: 'Countdown', icon: 'Clock', description: 'Contador regressivo', premium: true },
    ],
  },
  {
    id: 'content',
    name: 'Conteúdo',
    color: '#3b82f6',
    elements: [
      { type: 'text', name: 'Texto', icon: 'Type', description: 'Bloco de texto editável' },
      { type: 'image', name: 'Imagem', icon: 'Image', description: 'Imagem com link opcional' },
      { type: 'button', name: 'Botão', icon: 'MousePointer', description: 'Call-to-action' },
      { type: 'video', name: 'Vídeo', icon: 'Play', description: 'Thumbnail com link para vídeo' },
    ],
  },
  {
    id: 'structure',
    name: 'Estrutura',
    color: '#10b981',
    elements: [
      { type: 'divider', name: 'Divisor', icon: 'Minus', description: 'Linha separadora' },
      { type: 'spacer', name: 'Espaçador', icon: 'Square', description: 'Espaço vertical' },
      { type: 'columns', name: 'Colunas', icon: 'Columns', description: 'Layout em colunas' },
      { type: 'menu', name: 'Menu', icon: 'Menu', description: 'Navegação horizontal' },
    ],
  },
  {
    id: 'branding',
    name: 'Marca',
    color: '#f59e0b',
    elements: [
      { type: 'logo', name: 'Logo', icon: 'Image', description: 'Logótipo da marca' },
      { type: 'social', name: 'Redes Sociais', icon: 'Share2', description: 'Ícones de redes sociais' },
      { type: 'footer', name: 'Rodapé', icon: 'FileText', description: 'Rodapé com unsubscribe' },
    ],
  },
  {
    id: 'advanced',
    name: 'Avançado',
    color: '#6b7280',
    elements: [
      { type: 'html', name: 'HTML', icon: 'Code', description: 'HTML personalizado' },
    ],
  },
];
