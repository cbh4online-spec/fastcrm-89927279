// Email Renderer - Converts EmailDesign blocks to HTML

import type { 
  EmailDesign, 
  EmailBlock, 
  EmailGlobalStyles,
  TextBlockContent,
  ImageBlockContent,
  ButtonBlockContent,
  DividerBlockContent,
  SpacerBlockContent,
  SocialBlockContent,
  FooterBlockContent,
  HtmlBlockContent,
} from '@/types/emailBuilder';

function renderTextBlock(block: EmailBlock): string {
  const content = block.content as TextBlockContent;
  const styles = block.styles;
  
  const styleStr = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  return `<div style="${styleStr}">${content.html}</div>`;
}

function renderImageBlock(block: EmailBlock): string {
  const content = block.content as ImageBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  const imgStyle = `max-width: 100%; height: auto;${styles.maxWidth ? ` max-width: ${styles.maxWidth};` : ''}`;
  
  const img = `<img src="${content.src}" alt="${content.alt}" style="${imgStyle}" />`;
  
  if (content.link) {
    return `<div style="${wrapperStyle}"><a href="${content.link}" target="_blank">${img}</a></div>`;
  }
  
  return `<div style="${wrapperStyle}">${img}</div>`;
}

function renderButtonBlock(block: EmailBlock): string {
  const content = block.content as ButtonBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  const buttonStyle = [
    'display: inline-block',
    'text-decoration: none',
    'font-weight: bold',
    'padding: 12px 30px',
    `background-color: ${content.backgroundColor || '#3b82f6'}`,
    `color: ${content.textColor || '#ffffff'}`,
    `border-radius: ${content.borderRadius || '6px'}`,
  ].join('; ');
  
  return `<div style="${wrapperStyle}"><a href="${content.url}" style="${buttonStyle}">${content.text}</a></div>`;
}

function renderDividerBlock(block: EmailBlock): string {
  const content = block.content as DividerBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  const hrStyle = [
    'border: none',
    `border-top: ${content.thickness || '1px'} ${content.style || 'solid'} ${content.color || '#e5e5e5'}`,
    'margin: 0',
  ].join('; ');
  
  return `<div style="${wrapperStyle}"><hr style="${hrStyle}" /></div>`;
}

function renderSpacerBlock(block: EmailBlock): string {
  const content = block.content as SpacerBlockContent;
  return `<div style="height: ${content.height}; line-height: ${content.height};">&nbsp;</div>`;
}

function renderSocialBlock(block: EmailBlock): string {
  const content = block.content as SocialBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  const iconSize = content.iconSize || '32px';
  
  const socialIcons: Record<string, string> = {
    facebook: '📘',
    twitter: '🐦',
    instagram: '📸',
    linkedin: '💼',
    youtube: '▶️',
    tiktok: '🎵',
  };
  
  const icons = content.networks
    .map(network => `<a href="${network.url}" style="text-decoration: none; margin: 0 8px; font-size: ${iconSize};">${socialIcons[network.type] || '🔗'}</a>`)
    .join('');
  
  return `<div style="${wrapperStyle}">${icons}</div>`;
}

function renderFooterBlock(block: EmailBlock, globalStyles: EmailGlobalStyles): string {
  const content = block.content as FooterBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  let footerHtml = `<p style="margin: 0;">${content.text}</p>`;
  
  if (content.showUnsubscribe) {
    footerHtml += `<p style="margin-top: 10px;"><a href="{{unsubscribe_url}}" style="color: ${globalStyles.linkColor};">Cancelar subscrição</a></p>`;
  }
  
  return `<div style="${wrapperStyle}">${footerHtml}</div>`;
}

function renderHtmlBlock(block: EmailBlock): string {
  const content = block.content as HtmlBlockContent;
  const styles = block.styles;
  
  const wrapperStyle = Object.entries(styles)
    .filter(([_, v]) => v)
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
  
  return `<div style="${wrapperStyle}">${content.html}</div>`;
}

function renderBlock(block: EmailBlock, globalStyles: EmailGlobalStyles): string {
  switch (block.type) {
    case 'text':
      return renderTextBlock(block);
    case 'image':
    case 'logo':
      return renderImageBlock(block);
    case 'button':
      return renderButtonBlock(block);
    case 'divider':
      return renderDividerBlock(block);
    case 'spacer':
      return renderSpacerBlock(block);
    case 'social':
      return renderSocialBlock(block);
    case 'footer':
      return renderFooterBlock(block, globalStyles);
    case 'html':
      return renderHtmlBlock(block);
    case 'video':
      // Render video as image with play button overlay
      return renderImageBlock(block);
    case 'columns':
      // TODO: Implement columns rendering
      return '';
    default:
      return '';
  }
}

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

export function renderEmailToHtml(design: EmailDesign): string {
  const { blocks, globalStyles } = design;
  
  const bodyContent = blocks.map(block => renderBlock(block, globalStyles)).join('\n');
  
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Email</title>
  <!--[if mso]>
  <style type="text/css">
    table, td, div, p, a { font-family: Arial, sans-serif; }
  </style>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: ${globalStyles.backgroundColor}; font-family: ${globalStyles.fontFamily}; color: ${globalStyles.textColor};">
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: ${globalStyles.backgroundColor};">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="${globalStyles.contentWidth}" style="max-width: ${globalStyles.contentWidth}px; background-color: ${globalStyles.contentBackgroundColor};">
          <tr>
            <td style="padding: 20px;">
              ${bodyContent}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// Preview with sample data
export function renderEmailPreview(design: EmailDesign): string {
  const html = renderEmailToHtml(design);
  
  return html
    .replace(/\{\{primeiro_nome\}\}/g, 'João')
    .replace(/\{\{nome_cliente\}\}/g, 'João Silva')
    .replace(/\{\{empresa_nome\}\}/g, 'Minha Empresa')
    .replace(/\{\{empresa_endereco\}\}/g, 'Lisboa, Portugal')
    .replace(/\{\{subject\}\}/g, 'Assunto do Email')
    .replace(/\{\{unsubscribe_url\}\}/g, '#');
}

// Extract plain text from HTML blocks
export function extractPlainText(design: EmailDesign): string {
  const textParts: string[] = [];
  
  for (const block of design.blocks) {
    if (block.type === 'text') {
      const content = block.content as TextBlockContent;
      // Strip HTML tags
      const text = content.html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
      if (text) textParts.push(text);
    } else if (block.type === 'button') {
      const content = block.content as ButtonBlockContent;
      textParts.push(`[${content.text}](${content.url})`);
    } else if (block.type === 'footer') {
      const content = block.content as FooterBlockContent;
      textParts.push(content.text);
      if (content.showUnsubscribe) {
        textParts.push('Para cancelar a subscrição: {{unsubscribe_url}}');
      }
    }
  }
  
  return textParts.join('\n\n');
}
