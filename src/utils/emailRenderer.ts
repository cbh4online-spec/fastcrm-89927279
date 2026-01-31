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
  HeroBlockContent,
  ImageTextBlockContent,
  ProductBlockContent,
  TestimonialBlockContent,
  CountdownBlockContent,
  MenuBlockContent,
} from '@/types/emailBuilder';

function camelToKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

function stylesToString(styles: Record<string, any>): string {
  return Object.entries(styles)
    .filter(([_, v]) => v !== undefined && v !== null && v !== '')
    .map(([k, v]) => `${camelToKebab(k)}: ${v}`)
    .join('; ');
}

function renderTextBlock(block: EmailBlock): string {
  const content = block.content as TextBlockContent;
  const styleStr = stylesToString(block.styles);
  return `<div style="${styleStr}">${content.html}</div>`;
}

function renderImageBlock(block: EmailBlock): string {
  const content = block.content as ImageBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  const imgStyle = `max-width: 100%; height: auto;${block.styles.maxWidth ? ` max-width: ${block.styles.maxWidth};` : ''}`;
  
  const img = content.src 
    ? `<img src="${content.src}" alt="${content.alt}" style="${imgStyle}" />`
    : `<div style="background: #f0f0f0; padding: 40px; text-align: center; color: #999;">Imagem</div>`;
  
  if (content.link) {
    return `<div style="${wrapperStyle}"><a href="${content.link}" target="_blank">${img}</a></div>`;
  }
  
  return `<div style="${wrapperStyle}">${img}</div>`;
}

function renderButtonBlock(block: EmailBlock): string {
  const content = block.content as ButtonBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  
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
  const wrapperStyle = stylesToString(block.styles);
  
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
  const wrapperStyle = stylesToString(block.styles);
  
  const iconSize = content.iconSize || '32px';
  
  const socialIcons: Record<string, string> = {
    facebook: '📘',
    twitter: '🐦',
    instagram: '📸',
    linkedin: '💼',
    youtube: '▶️',
    tiktok: '🎵',
    whatsapp: '💬',
  };
  
  const icons = content.networks
    .map(network => `<a href="${network.url}" style="text-decoration: none; margin: 0 8px; font-size: ${iconSize};">${socialIcons[network.type] || '🔗'}</a>`)
    .join('');
  
  return `<div style="${wrapperStyle}">${icons}</div>`;
}

function renderFooterBlock(block: EmailBlock, globalStyles: EmailGlobalStyles): string {
  const content = block.content as FooterBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  
  let footerHtml = `<p style="margin: 0;">${content.text}</p>`;
  
  if (content.companyInfo) {
    footerHtml += `<p style="margin-top: 8px; opacity: 0.8;">${content.companyInfo}</p>`;
  }
  
  if (content.showUnsubscribe) {
    footerHtml += `<p style="margin-top: 10px;"><a href="{{unsubscribe_url}}" style="color: ${globalStyles.linkColor};">Cancelar subscrição</a></p>`;
  }
  
  return `<div style="${wrapperStyle}">${footerHtml}</div>`;
}

function renderHtmlBlock(block: EmailBlock): string {
  const content = block.content as HtmlBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  return `<div style="${wrapperStyle}">${content.html}</div>`;
}

// Premium block renderers
function renderHeroBlock(block: EmailBlock): string {
  const content = block.content as HeroBlockContent;
  const height = content.height || '400px';
  const alignment = content.alignment || 'center';
  
  const containerStyle = [
    `min-height: ${height}`,
    `background-color: ${content.backgroundColor || '#1a1a2e'}`,
    content.backgroundImage ? `background-image: url(${content.backgroundImage})` : '',
    'background-size: cover',
    'background-position: center',
    'position: relative',
    'display: table',
    'width: 100%',
  ].filter(Boolean).join('; ');
  
  const overlayStyle = content.backgroundImage && content.overlayColor ? [
    'position: absolute',
    'top: 0',
    'left: 0',
    'right: 0',
    'bottom: 0',
    `background-color: ${content.overlayColor}`,
    `opacity: ${content.overlayOpacity || 0.5}`,
  ].join('; ') : '';
  
  const contentStyle = [
    'display: table-cell',
    'vertical-align: middle',
    'padding: 40px 30px',
    `text-align: ${alignment}`,
    'position: relative',
    'z-index: 1',
  ].join('; ');
  
  const titleStyle = 'color: #ffffff; font-size: 36px; font-weight: bold; margin: 0 0 16px 0; line-height: 1.2;';
  const subtitleStyle = 'color: rgba(255,255,255,0.9); font-size: 18px; margin: 0 0 24px 0; line-height: 1.5;';
  const buttonStyle = content.buttonText ? [
    'display: inline-block',
    'text-decoration: none',
    'font-weight: bold',
    'padding: 14px 32px',
    `background-color: ${content.buttonColor || '#3b82f6'}`,
    'color: #ffffff',
    'border-radius: 8px',
    'font-size: 16px',
  ].join('; ') : '';
  
  let innerHtml = '';
  if (overlayStyle) {
    innerHtml += `<div style="${overlayStyle}"></div>`;
  }
  innerHtml += `<div style="${contentStyle}">`;
  innerHtml += `<h1 style="${titleStyle}">${content.title}</h1>`;
  if (content.subtitle) {
    innerHtml += `<p style="${subtitleStyle}">${content.subtitle}</p>`;
  }
  if (content.buttonText && content.buttonUrl) {
    innerHtml += `<a href="${content.buttonUrl}" style="${buttonStyle}">${content.buttonText}</a>`;
  }
  innerHtml += '</div>';
  
  return `<div style="${containerStyle}">${innerHtml}</div>`;
}

function renderImageTextBlock(block: EmailBlock): string {
  const content = block.content as ImageTextBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  const imageWidth = parseInt(content.imageWidth) || 50;
  const textWidth = 100 - imageWidth;
  
  const imgCell = `
    <td style="width: ${imageWidth}%; vertical-align: top; padding: 10px;">
      ${content.imageSrc 
        ? `<img src="${content.imageSrc}" alt="${content.imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px;" />`
        : `<div style="background: #f0f0f0; padding: 60px; text-align: center; color: #999; border-radius: 8px;">Imagem</div>`
      }
    </td>
  `;
  
  const buttonHtml = content.buttonText && content.buttonUrl
    ? `<a href="${content.buttonUrl}" style="display: inline-block; text-decoration: none; font-weight: bold; padding: 10px 24px; background-color: ${content.buttonColor || '#3b82f6'}; color: #ffffff; border-radius: 6px; margin-top: 16px;">${content.buttonText}</a>`
    : '';
  
  const textCell = `
    <td style="width: ${textWidth}%; vertical-align: middle; padding: 10px;">
      <h3 style="margin: 0 0 12px 0; font-size: 22px; font-weight: bold;">${content.title}</h3>
      <p style="margin: 0; line-height: 1.6; color: #666;">${content.text}</p>
      ${buttonHtml}
    </td>
  `;
  
  const cells = content.imagePosition === 'left' ? imgCell + textCell : textCell + imgCell;
  
  return `<div style="${wrapperStyle}"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>${cells}</tr></table></div>`;
}

function renderProductBlock(block: EmailBlock): string {
  const content = block.content as ProductBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  
  const badgeHtml = content.badge 
    ? `<span style="display: inline-block; background-color: #ef4444; color: white; font-size: 12px; font-weight: bold; padding: 4px 10px; border-radius: 4px; margin-bottom: 12px;">${content.badge}</span>`
    : '';
  
  const priceHtml = content.originalPrice
    ? `<span style="text-decoration: line-through; color: #999; margin-right: 8px;">${content.originalPrice}</span><span style="color: #10b981; font-weight: bold; font-size: 24px;">${content.price}</span>`
    : `<span style="font-weight: bold; font-size: 24px;">${content.price}</span>`;
  
  return `
    <div style="${wrapperStyle}">
      ${badgeHtml}
      ${content.imageSrc 
        ? `<img src="${content.imageSrc}" alt="${content.imageAlt}" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 16px;" />`
        : `<div style="background: #f0f0f0; padding: 60px; text-align: center; color: #999; border-radius: 8px; margin-bottom: 16px;">Imagem do Produto</div>`
      }
      <h3 style="margin: 0 0 8px 0; font-size: 20px; font-weight: bold;">${content.name}</h3>
      ${content.description ? `<p style="margin: 0 0 12px 0; color: #666; line-height: 1.5;">${content.description}</p>` : ''}
      <div style="margin-bottom: 16px;">${priceHtml}</div>
      <a href="${content.buttonUrl}" style="display: inline-block; text-decoration: none; font-weight: bold; padding: 12px 28px; background-color: ${content.buttonColor || '#10b981'}; color: #ffffff; border-radius: 8px;">${content.buttonText}</a>
    </div>
  `;
}

function renderTestimonialBlock(block: EmailBlock): string {
  const content = block.content as TestimonialBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  
  const stars = content.rating 
    ? '⭐'.repeat(content.rating)
    : '';
  
  const authorImageHtml = content.authorImage
    ? `<img src="${content.authorImage}" alt="${content.authorName}" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 12px;" />`
    : '';
  
  return `
    <div style="${wrapperStyle}">
      ${stars ? `<div style="margin-bottom: 16px; font-size: 24px;">${stars}</div>` : ''}
      <p style="margin: 0 0 20px 0; font-size: 18px; font-style: italic; line-height: 1.6;">${content.quote}</p>
      ${authorImageHtml}
      <p style="margin: 0; font-weight: bold;">${content.authorName}</p>
      ${content.authorTitle ? `<p style="margin: 4px 0 0 0; color: #666; font-size: 14px;">${content.authorTitle}</p>` : ''}
    </div>
  `;
}

function renderCountdownBlock(block: EmailBlock): string {
  const content = block.content as CountdownBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  const bgColor = content.backgroundColor || '#1a1a2e';
  const textColor = content.textColor || '#ffffff';
  
  // Note: Real countdown requires JS which doesn't work in email.
  // This renders a static placeholder that can be replaced with an image-based countdown service.
  const boxStyle = `display: inline-block; background-color: ${content.accentColor || '#ef4444'}; color: ${textColor}; padding: 12px 16px; border-radius: 8px; margin: 4px; text-align: center; min-width: 60px;`;
  
  return `
    <div style="${wrapperStyle}; background-color: ${bgColor}; color: ${textColor};">
      ${content.title ? `<h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: bold;">${content.title}</h2>` : ''}
      ${content.subtitle ? `<p style="margin: 0 0 20px 0; opacity: 0.9;">${content.subtitle}</p>` : ''}
      <div>
        <div style="${boxStyle}"><div style="font-size: 28px; font-weight: bold;">00</div><div style="font-size: 12px;">DIAS</div></div>
        <div style="${boxStyle}"><div style="font-size: 28px; font-weight: bold;">00</div><div style="font-size: 12px;">HORAS</div></div>
        <div style="${boxStyle}"><div style="font-size: 28px; font-weight: bold;">00</div><div style="font-size: 12px;">MIN</div></div>
        <div style="${boxStyle}"><div style="font-size: 28px; font-weight: bold;">00</div><div style="font-size: 12px;">SEG</div></div>
      </div>
    </div>
  `;
}

function renderMenuBlock(block: EmailBlock): string {
  const content = block.content as MenuBlockContent;
  const wrapperStyle = stylesToString(block.styles);
  const separator = content.separator || '|';
  
  const links = content.items
    .map((item, i) => {
      const sep = i < content.items.length - 1 ? ` <span style="margin: 0 12px; color: #ccc;">${separator}</span>` : '';
      return `<a href="${item.url}" style="text-decoration: none; color: inherit;">${item.text}</a>${sep}`;
    })
    .join('');
  
  return `<div style="${wrapperStyle}; text-align: ${content.alignment || 'center'};">${links}</div>`;
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
      return renderImageBlock(block);
    case 'hero':
      return renderHeroBlock(block);
    case 'imageText':
      return renderImageTextBlock(block);
    case 'product':
      return renderProductBlock(block);
    case 'testimonial':
      return renderTestimonialBlock(block);
    case 'countdown':
      return renderCountdownBlock(block);
    case 'menu':
      return renderMenuBlock(block);
    case 'columns':
      // TODO: Implement columns rendering
      return '';
    default:
      return '';
  }
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
