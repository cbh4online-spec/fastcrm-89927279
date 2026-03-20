export type EditableElementType = 'cta' | 'text' | 'heading' | 'image' | 'link' | 'divider' | 'container';

export interface EditableElement {
  id: string;
  type: EditableElementType;
  tagName: string;
  content: string;
  attributes: Record<string, string>;
  styles: Record<string, string>;
  outerHtml: string;
}

export interface ElementUpdate {
  id: string;
  property: string;
  value: string;
}

export const ELEMENT_TYPE_LABELS: Record<EditableElementType, string> = {
  cta: 'Botão CTA',
  text: 'Texto',
  heading: 'Título',
  image: 'Imagem',
  link: 'Link',
  divider: 'Divisor',
  container: 'Contentor',
};

export const ELEMENT_TYPE_COLORS: Record<EditableElementType, string> = {
  cta: 'bg-green-500/10 text-green-700 border-green-200',
  text: 'bg-blue-500/10 text-blue-700 border-blue-200',
  heading: 'bg-purple-500/10 text-purple-700 border-purple-200',
  image: 'bg-amber-500/10 text-amber-700 border-amber-200',
  link: 'bg-cyan-500/10 text-cyan-700 border-cyan-200',
  divider: 'bg-gray-500/10 text-gray-700 border-gray-200',
  container: 'bg-rose-500/10 text-rose-700 border-rose-200',
};

export const EMAIL_SAFE_FONTS = [
  'Arial, Helvetica, sans-serif',
  'Georgia, serif',
  'Trebuchet MS, sans-serif',
  'Verdana, Geneva, sans-serif',
  'Courier New, monospace',
  'Times New Roman, serif',
  'Tahoma, Geneva, sans-serif',
];
