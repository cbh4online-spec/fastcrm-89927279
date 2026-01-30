import type { HeroBlockContent } from '@/types/emailBuilder';
import { cn } from '@/lib/utils';

interface HeroBlockPreviewProps {
  content: HeroBlockContent;
  isEditing?: boolean;
}

export function HeroBlockPreview({ content, isEditing }: HeroBlockPreviewProps) {
  const {
    backgroundImage,
    backgroundColor = '#1a1a2e',
    overlayColor = '#000000',
    overlayOpacity = 0.5,
    title,
    subtitle,
    buttonText,
    buttonUrl,
    buttonColor = '#3b82f6',
    height = '400px',
    alignment = 'center',
  } = content;

  const alignmentClasses = {
    left: 'items-start text-left',
    center: 'items-center text-center',
    right: 'items-end text-right',
  };

  return (
    <div
      className={cn(
        "relative flex flex-col justify-center rounded-lg overflow-hidden",
        alignmentClasses[alignment]
      )}
      style={{
        minHeight: height,
        backgroundColor: backgroundColor,
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay */}
      {backgroundImage && (
        <div
          className="absolute inset-0"
          style={{
            backgroundColor: overlayColor,
            opacity: overlayOpacity,
          }}
        />
      )}

      {/* Content */}
      <div className={cn(
        "relative z-10 p-8 w-full",
        alignmentClasses[alignment]
      )}>
        {/* Title */}
        <h1
          className="text-3xl md:text-4xl font-bold text-white mb-4"
          style={{ textShadow: backgroundImage ? '0 2px 4px rgba(0,0,0,0.3)' : undefined }}
        >
          {title || 'Título do Hero'}
        </h1>

        {/* Subtitle */}
        {subtitle && (
          <p
            className="text-lg md:text-xl text-white/90 mb-6 max-w-xl"
            style={{ textShadow: backgroundImage ? '0 1px 2px rgba(0,0,0,0.3)' : undefined }}
          >
            {subtitle}
          </p>
        )}

        {/* Button */}
        {buttonText && (
          <a
            href={isEditing ? '#' : buttonUrl || '#'}
            className={cn(
              "inline-block px-8 py-3 font-semibold rounded-lg transition-transform hover:scale-105",
              buttonColor === '#ffffff' ? 'text-gray-900' : 'text-white'
            )}
            style={{ backgroundColor: buttonColor }}
            onClick={(e) => isEditing && e.preventDefault()}
          >
            {buttonText}
          </a>
        )}
      </div>

      {/* Empty state */}
      {!backgroundImage && !title && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="text-white/60">Clica para configurar o Hero Banner</p>
        </div>
      )}
    </div>
  );
}
