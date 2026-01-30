import { useState, useEffect } from 'react';
import type { CountdownBlockContent } from '@/types/emailBuilder';
import { cn } from '@/lib/utils';

interface CountdownBlockPreviewProps {
  content: CountdownBlockContent;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

export function CountdownBlockPreview({ content }: CountdownBlockPreviewProps) {
  const {
    targetDate,
    title,
    subtitle,
    expiredMessage = 'A oferta terminou',
    style = 'boxes',
    backgroundColor = '#1a1a2e',
    textColor = '#ffffff',
    accentColor = '#ef4444',
  } = content;

  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(targetDate).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setIsExpired(true);
        return null;
      }

      return {
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
      };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [targetDate]);

  if (isExpired) {
    return (
      <div
        className="py-8 px-6 rounded-lg text-center"
        style={{ backgroundColor, color: textColor }}
      >
        <p className="text-xl font-medium">{expiredMessage}</p>
      </div>
    );
  }

  const timeUnits = [
    { label: 'Dias', value: timeLeft?.days ?? 0 },
    { label: 'Horas', value: timeLeft?.hours ?? 0 },
    { label: 'Min', value: timeLeft?.minutes ?? 0 },
    { label: 'Seg', value: timeLeft?.seconds ?? 0 },
  ];

  if (style === 'minimal') {
    return (
      <div className="text-center">
        {title && (
          <p className="text-lg font-medium mb-2" style={{ color: accentColor }}>
            {title}
          </p>
        )}
        <p className="text-3xl font-bold" style={{ color: textColor }}>
          {String(timeLeft?.days ?? 0).padStart(2, '0')}d{' '}
          {String(timeLeft?.hours ?? 0).padStart(2, '0')}h{' '}
          {String(timeLeft?.minutes ?? 0).padStart(2, '0')}m{' '}
          {String(timeLeft?.seconds ?? 0).padStart(2, '0')}s
        </p>
        {subtitle && (
          <p className="text-sm mt-2 opacity-80" style={{ color: textColor }}>
            {subtitle}
          </p>
        )}
      </div>
    );
  }

  if (style === 'inline') {
    return (
      <div
        className="py-4 px-6 rounded-lg text-center"
        style={{ backgroundColor, color: textColor }}
      >
        {title && <p className="font-medium mb-3">{title}</p>}
        <div className="flex items-center justify-center gap-2 text-2xl font-bold">
          {timeUnits.map((unit, index) => (
            <span key={unit.label} className="flex items-center">
              {index > 0 && <span className="mx-1 opacity-50">:</span>}
              <span style={{ color: accentColor }}>
                {String(unit.value).padStart(2, '0')}
              </span>
              <span className="text-xs ml-1 opacity-70">{unit.label}</span>
            </span>
          ))}
        </div>
        {subtitle && <p className="text-sm mt-3 opacity-80">{subtitle}</p>}
      </div>
    );
  }

  // Default: boxes style
  return (
    <div
      className="py-6 px-4 rounded-lg text-center"
      style={{ backgroundColor, color: textColor }}
    >
      {title && <p className="font-semibold text-lg mb-4">{title}</p>}
      
      <div className="flex items-center justify-center gap-3">
        {timeUnits.map((unit) => (
          <div key={unit.label} className="flex flex-col items-center">
            <div
              className="w-16 h-16 rounded-lg flex items-center justify-center text-2xl font-bold"
              style={{ backgroundColor: accentColor }}
            >
              {String(unit.value).padStart(2, '0')}
            </div>
            <span className="text-xs mt-2 opacity-80">{unit.label}</span>
          </div>
        ))}
      </div>

      {subtitle && <p className="text-sm mt-4 opacity-80">{subtitle}</p>}
    </div>
  );
}
