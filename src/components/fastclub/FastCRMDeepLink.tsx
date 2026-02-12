import { ReactNode } from 'react';
import { Button, type ButtonProps } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import { useFastCRMDeepLink } from '@/hooks/useFastCRMDeepLink';

interface FastCRMDeepLinkProps {
  targetPath: string;
  moduleId?: string;
  children: ReactNode;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
  fallbackBehavior?: 'navigate' | 'login';
}

export function FastCRMDeepLink({
  targetPath,
  moduleId,
  children,
  variant = 'default',
  size = 'default',
  className,
  fallbackBehavior = 'login',
}: FastCRMDeepLinkProps) {
  const { navigate, isLoading } = useFastCRMDeepLink({
    targetPath,
    moduleId,
    fallbackBehavior,
  });

  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={navigate}
      disabled={isLoading}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
      {children}
    </Button>
  );
}
