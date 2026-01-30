// Email Builder Types

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
  | 'html';

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
  padding?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingLeft?: string;
  paddingRight?: string;
  margin?: string;
  borderRadius?: string;
  border?: string;
  
  // Image/Button specific
  width?: string;
  maxWidth?: string;
  height?: string;
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
}

export interface SocialBlockContent {
  networks: {
    type: 'facebook' | 'twitter' | 'instagram' | 'linkedin' | 'youtube' | 'tiktok';
    url: string;
  }[];
  iconSize?: string;
  iconColor?: string;
}

export interface FooterBlockContent {
  text: string;
  showUnsubscribe?: boolean;
}

export interface VideoBlockContent {
  thumbnailUrl: string;
  videoUrl: string;
}

export interface HtmlBlockContent {
  html: string;
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
  | HtmlBlockContent;

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
    styles: { padding: '10px 0' },
  }),
  image: () => ({
    id: generateBlockId(),
    type: 'image',
    content: { src: '', alt: 'Imagem', link: '' } as ImageBlockContent,
    styles: { textAlign: 'center', padding: '10px 0' },
  }),
  button: () => ({
    id: generateBlockId(),
    type: 'button',
    content: { 
      text: 'Clica aqui', 
      url: '#',
      backgroundColor: '#3b82f6',
      textColor: '#ffffff',
      borderRadius: '6px',
    } as ButtonBlockContent,
    styles: { textAlign: 'center', padding: '20px 0' },
  }),
  divider: () => ({
    id: generateBlockId(),
    type: 'divider',
    content: { color: '#e5e5e5', thickness: '1px', style: 'solid' } as DividerBlockContent,
    styles: { padding: '20px 0' },
  }),
  spacer: () => ({
    id: generateBlockId(),
    type: 'spacer',
    content: { height: '30px' } as SpacerBlockContent,
    styles: {},
  }),
  columns: () => ({
    id: generateBlockId(),
    type: 'columns',
    content: { columns: 2, gap: '20px' } as ColumnsBlockContent,
    styles: { padding: '10px 0' },
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
      ],
      iconSize: '32px',
    } as SocialBlockContent,
    styles: { textAlign: 'center', padding: '20px 0' },
  }),
  footer: () => ({
    id: generateBlockId(),
    type: 'footer',
    content: { 
      text: '{{empresa_nome}} | {{empresa_endereco}}',
      showUnsubscribe: true,
    } as FooterBlockContent,
    styles: { 
      textAlign: 'center', 
      padding: '20px', 
      backgroundColor: '#f0f0f0',
      fontSize: '12px',
      color: '#666666',
    },
  }),
  logo: () => ({
    id: generateBlockId(),
    type: 'image',
    content: { src: '', alt: 'Logo', link: '' } as ImageBlockContent,
    styles: { textAlign: 'center', padding: '20px 0', maxWidth: '200px' },
  }),
  video: () => ({
    id: generateBlockId(),
    type: 'video',
    content: { thumbnailUrl: '', videoUrl: '' } as VideoBlockContent,
    styles: { textAlign: 'center', padding: '20px 0' },
  }),
  html: () => ({
    id: generateBlockId(),
    type: 'html',
    content: { html: '<!-- HTML personalizado -->' } as HtmlBlockContent,
    styles: { padding: '10px 0' },
  }),
};

// Predefined layouts
export interface EmailLayout {
  id: string;
  name: string;
  description: string;
  thumbnail?: string;
  blocks: EmailBlock[];
  globalStyles?: Partial<EmailGlobalStyles>;
}

export const PREDEFINED_LAYOUTS: EmailLayout[] = [
  {
    id: 'blank',
    name: 'Em Branco',
    description: 'Começa do zero',
    blocks: [],
  },
  {
    id: 'simple-text',
    name: 'Texto Simples',
    description: 'Apenas texto com header e footer',
    blocks: [
      DEFAULT_BLOCKS.text(),
      DEFAULT_BLOCKS.spacer(),
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'newsletter',
    name: 'Newsletter',
    description: 'Layout clássico de newsletter',
    blocks: [
      {
        id: generateBlockId(),
        type: 'image',
        content: { src: '', alt: 'Logo', link: '' } as ImageBlockContent,
        styles: { textAlign: 'center', padding: '30px 0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h1 style="text-align: center; color: #1a1a1a;">Título da Newsletter</h1>' } as TextBlockContent,
        styles: { padding: '20px 0' },
      },
      {
        id: generateBlockId(),
        type: 'divider',
        content: { color: '#e5e5e5', thickness: '1px', style: 'solid' } as DividerBlockContent,
        styles: { padding: '10px 0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p>Olá {{primeiro_nome}},</p><p>Escreve o conteúdo da tua newsletter aqui...</p>' } as TextBlockContent,
        styles: { padding: '20px 0' },
      },
      {
        id: generateBlockId(),
        type: 'button',
        content: { 
          text: 'Saber Mais', 
          url: '#',
          backgroundColor: '#3b82f6',
          textColor: '#ffffff',
          borderRadius: '6px',
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '20px 0' },
      },
      DEFAULT_BLOCKS.footer(),
    ],
  },
  {
    id: 'promotional',
    name: 'Promocional',
    description: 'Para ofertas e promoções',
    blocks: [
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<h1 style="text-align: center; color: #ffffff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px; margin: 0;">🎉 Oferta Especial!</h1>' } as TextBlockContent,
        styles: { padding: '0' },
      },
      {
        id: generateBlockId(),
        type: 'text',
        content: { html: '<p style="text-align: center; font-size: 18px;">Olá {{primeiro_nome}},</p><p style="text-align: center;">Aproveita esta oferta exclusiva!</p>' } as TextBlockContent,
        styles: { padding: '30px 20px' },
      },
      {
        id: generateBlockId(),
        type: 'button',
        content: { 
          text: 'APROVEITAR AGORA', 
          url: '#',
          backgroundColor: '#667eea',
          textColor: '#ffffff',
          borderRadius: '50px',
        } as ButtonBlockContent,
        styles: { textAlign: 'center', padding: '20px 0' },
      },
      DEFAULT_BLOCKS.footer(),
    ],
  },
];

// Element categories for sidebar
export interface ElementCategory {
  id: string;
  name: string;
  elements: {
    type: EmailBlockType;
    name: string;
    icon: string;
    description?: string;
  }[];
}

export const ELEMENT_CATEGORIES: ElementCategory[] = [
  {
    id: 'content',
    name: 'Conteúdo',
    elements: [
      { type: 'text', name: 'Texto', icon: 'Type', description: 'Bloco de texto editável' },
      { type: 'image', name: 'Imagem', icon: 'Image', description: 'Imagem com link opcional' },
      { type: 'button', name: 'Botão', icon: 'MousePointer', description: 'Call-to-action' },
    ],
  },
  {
    id: 'structure',
    name: 'Estrutura',
    elements: [
      { type: 'divider', name: 'Divisor', icon: 'Minus', description: 'Linha separadora' },
      { type: 'spacer', name: 'Espaçador', icon: 'Square', description: 'Espaço vertical' },
      { type: 'columns', name: 'Colunas', icon: 'Columns', description: 'Layout em colunas' },
    ],
  },
  {
    id: 'social',
    name: 'Social',
    elements: [
      { type: 'social', name: 'Redes Sociais', icon: 'Share2', description: 'Ícones de redes sociais' },
    ],
  },
  {
    id: 'advanced',
    name: 'Avançado',
    elements: [
      { type: 'footer', name: 'Rodapé', icon: 'FileText', description: 'Rodapé com unsubscribe' },
      { type: 'html', name: 'HTML', icon: 'Code', description: 'HTML personalizado' },
    ],
  },
];
