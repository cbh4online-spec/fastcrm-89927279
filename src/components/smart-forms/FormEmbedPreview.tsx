import { Card, CardContent } from '@/components/ui/card';

interface FormEmbedPreviewProps {
  mode: 'iframe' | 'script' | 'popup';
  formName: string;
}

export function FormEmbedPreview({ mode, formName }: FormEmbedPreviewProps) {
  if (mode === 'popup') {
    return (
      <Card className="border-dashed">
        <CardContent className="p-4">
          <p className="text-xs text-muted-foreground mb-3">Preview — Popup</p>
          <div className="relative bg-muted rounded-lg h-32 flex items-end justify-end p-3">
            <div className="absolute inset-0 flex items-center justify-center opacity-30">
              <div className="w-3/4 h-1 bg-muted-foreground/20 rounded mb-1" />
            </div>
            <div className="bg-primary text-primary-foreground text-xs px-3 py-1.5 rounded-full shadow-lg">
              {formName}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-dashed">
      <CardContent className="p-4">
        <p className="text-xs text-muted-foreground mb-3">
          Preview — {mode === 'iframe' ? 'iFrame' : 'Script Inline'}
        </p>
        <div className="border rounded-lg p-4 bg-background space-y-2">
          <div className="h-3 w-1/3 bg-muted-foreground/20 rounded" />
          <div className="h-2 w-2/3 bg-muted-foreground/10 rounded" />
          <div className="space-y-1.5 mt-3">
            <div className="h-8 w-full bg-muted rounded" />
            <div className="h-8 w-full bg-muted rounded" />
            <div className="h-8 w-1/3 bg-primary/20 rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
