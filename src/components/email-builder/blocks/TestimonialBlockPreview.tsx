import { Quote, Star, User } from 'lucide-react';
import type { TestimonialBlockContent } from '@/types/emailBuilder';

interface TestimonialBlockPreviewProps {
  content: TestimonialBlockContent;
}

export function TestimonialBlockPreview({ content }: TestimonialBlockPreviewProps) {
  const {
    quote,
    authorName,
    authorTitle,
    authorImage,
    rating,
    companyLogo,
  } = content;

  return (
    <div className="flex flex-col items-center">
      {/* Quote icon */}
      <div className="mb-4">
        <Quote className="h-10 w-10 text-primary/30" />
      </div>

      {/* Rating */}
      {rating && rating > 0 && (
        <div className="flex items-center gap-1 mb-4">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className={`h-5 w-5 ${i < rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'}`}
            />
          ))}
        </div>
      )}

      {/* Quote */}
      <blockquote className="text-lg italic mb-6 max-w-xl">
        {quote || '"O teu testemunho aqui..."'}
      </blockquote>

      {/* Author */}
      <div className="flex items-center gap-3">
        {/* Avatar */}
        {authorImage ? (
          <img
            src={authorImage}
            alt={authorName}
            className="w-12 h-12 rounded-full object-cover"
          />
        ) : (
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center">
            <User className="h-6 w-6 text-muted-foreground" />
          </div>
        )}

        {/* Name and title */}
        <div className="text-left">
          <p className="font-semibold">{authorName || 'Nome do Autor'}</p>
          {authorTitle && (
            <p className="text-sm text-muted-foreground">{authorTitle}</p>
          )}
        </div>

        {/* Company logo */}
        {companyLogo && (
          <img
            src={companyLogo}
            alt="Company"
            className="h-8 ml-4 opacity-60"
          />
        )}
      </div>
    </div>
  );
}
