// =============================================
// CTA CONFIGURATION BY PAGE TYPE
// =============================================

import type { EntityType } from '../types';

export interface CTAConfig {
  primary: CTAItem;
  secondary?: CTAItem;
  inline?: CTAItem;
  exit?: CTAItem;
  sticky?: CTAItem;
}

export interface CTAItem {
  text: string;
  type: 'signup' | 'try_tool' | 'export' | 'install' | 'contact' | 'upgrade';
  variant: 'primary' | 'secondary' | 'outline';
  url: string;
  placement?: 'hero' | 'inline' | 'sidebar' | 'footer' | 'sticky';
}

// Dynamic placeholder replacements: {keyword}, {category}, {topic}, {tool}
export const ctaConfigByEntityType: Record<EntityType | 'compare' | 'pricing', CTAConfig> = {
  // 🔑 Keyword Pages (/keywords/:keyword)
  keyword: {
    primary: {
      text: 'Generate keyword ideas for "{keyword}"',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator?q={keyword}',
      placement: 'hero',
    },
    secondary: {
      text: 'Unlock full keyword list',
      type: 'upgrade',
      variant: 'secondary',
      url: '/pricing',
      placement: 'inline',
    },
    inline: {
      text: 'See long-tail keyword ideas',
      type: 'try_tool',
      variant: 'outline',
      url: '/tools/keyword-generator?type=longtail&q={keyword}',
      placement: 'inline',
    },
    exit: {
      text: 'Export keyword ideas for free',
      type: 'export',
      variant: 'primary',
      url: '/tools/keyword-generator?export=true&q={keyword}',
      placement: 'footer',
    },
  },

  // 🛠️ Tool Pages (/tools/*)
  tool: {
    primary: {
      text: 'Generate keyword ideas now',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'hero',
    },
    secondary: {
      text: 'Try with your own keyword',
      type: 'try_tool',
      variant: 'secondary',
      url: '/tools/keyword-generator',
      placement: 'inline',
    },
    inline: {
      text: 'Save & export keyword ideas',
      type: 'export',
      variant: 'outline',
      url: '/app/keywords',
      placement: 'inline',
    },
  },

  // 📄 Template Pages (/templates/*)
  template: {
    primary: {
      text: 'Use this keyword template',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator?template={slug}',
      placement: 'hero',
    },
    secondary: {
      text: 'Generate keywords using this template',
      type: 'try_tool',
      variant: 'secondary',
      url: '/tools/keyword-generator?template={slug}',
      placement: 'inline',
    },
    inline: {
      text: 'Customize and export keywords',
      type: 'export',
      variant: 'outline',
      url: '/app/keywords',
      placement: 'inline',
    },
  },

  // 🗂️ Category Pages (/categories/:category)
  category: {
    primary: {
      text: 'Generate keyword ideas for {category}',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator?category={category}',
      placement: 'hero',
    },
    secondary: {
      text: 'See high-intent keywords',
      type: 'try_tool',
      variant: 'secondary',
      url: '/tools/keyword-generator?intent=commercial&category={category}',
      placement: 'inline',
    },
    inline: {
      text: 'Find low-competition keywords',
      type: 'try_tool',
      variant: 'outline',
      url: '/tools/keyword-generator?difficulty=easy&category={category}',
      placement: 'inline',
    },
  },

  // 🆚 Comparison Pages (/compare/*)
  compare: {
    primary: {
      text: 'Generate keyword ideas with FastCRM',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'hero',
    },
    secondary: {
      text: 'Try it free',
      type: 'signup',
      variant: 'secondary',
      url: '/signup',
      placement: 'inline',
    },
    sticky: {
      text: 'Get keyword ideas now',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'sticky',
    },
  },

  // 📚 Guide Pages
  guide: {
    primary: {
      text: 'Generate keyword ideas for your topic',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'hero',
    },
    inline: {
      text: 'See real keyword examples',
      type: 'try_tool',
      variant: 'outline',
      url: '/keywords',
      placement: 'inline',
    },
    exit: {
      text: 'Try the keyword generator',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'footer',
    },
  },

  // 📚 Blog Pages
  blog: {
    primary: {
      text: 'Generate keyword ideas for your topic',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'hero',
    },
    inline: {
      text: 'See real keyword examples',
      type: 'try_tool',
      variant: 'outline',
      url: '/keywords',
      placement: 'inline',
    },
    exit: {
      text: 'Try the keyword generator',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'footer',
    },
  },

  // 📖 Glossary Pages
  glossary: {
    primary: {
      text: 'Generate keyword ideas using this term',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator?q={term}',
      placement: 'hero',
    },
    secondary: {
      text: 'Explore related keywords',
      type: 'try_tool',
      variant: 'secondary',
      url: '/keywords?related={term}',
      placement: 'inline',
    },
  },

  // 🧑 Profile Pages
  profile: {
    primary: {
      text: 'Generate keyword ideas',
      type: 'try_tool',
      variant: 'primary',
      url: '/tools/keyword-generator',
      placement: 'hero',
    },
    secondary: {
      text: 'Try it free',
      type: 'signup',
      variant: 'secondary',
      url: '/signup',
      placement: 'inline',
    },
  },

  // 💰 Pricing Page
  pricing: {
    primary: {
      text: 'Unlock full keyword data',
      type: 'upgrade',
      variant: 'primary',
      url: '/signup?plan=pro',
      placement: 'hero',
    },
    secondary: {
      text: 'Start generating keywords',
      type: 'try_tool',
      variant: 'secondary',
      url: '/tools/keyword-generator',
      placement: 'inline',
    },
  },
};

// Value Gate CTAs (after generating keywords)
export const valueGateCTAs = {
  soft: {
    text: 'Create a free account to see all keywords',
    type: 'signup' as const,
    variant: 'primary' as const,
    url: '/signup',
  },
  hard: {
    text: 'Export keyword ideas',
    type: 'upgrade' as const,
    variant: 'primary' as const,
    url: '/pricing',
  },
};

/**
 * Get CTA config for an entity type with dynamic placeholder replacement
 */
export function getCTAForEntity(
  entityType: EntityType | 'compare' | 'pricing',
  placeholders?: Record<string, string>
): CTAConfig {
  const config = ctaConfigByEntityType[entityType];
  
  if (!placeholders) return config;

  // Deep clone and replace placeholders
  const replacePlaceholders = (text: string): string => {
    let result = text;
    Object.entries(placeholders).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
    });
    return result;
  };

  const replaceInCTA = (cta: CTAItem): CTAItem => ({
    ...cta,
    text: replacePlaceholders(cta.text),
    url: replacePlaceholders(cta.url),
  });

  return {
    primary: replaceInCTA(config.primary),
    secondary: config.secondary ? replaceInCTA(config.secondary) : undefined,
    inline: config.inline ? replaceInCTA(config.inline) : undefined,
    exit: config.exit ? replaceInCTA(config.exit) : undefined,
    sticky: config.sticky ? replaceInCTA(config.sticky) : undefined,
  };
}

/**
 * Get the primary CTA text for an entity type (for content generation)
 */
export function getPrimaryCTAText(entityType: EntityType, topic?: string): string {
  const config = ctaConfigByEntityType[entityType];
  let text = config.primary.text;
  
  if (topic) {
    text = text.replace(/{keyword}/g, topic);
    text = text.replace(/{category}/g, topic);
    text = text.replace(/{topic}/g, topic);
    text = text.replace(/{term}/g, topic);
  }
  
  return text;
}
