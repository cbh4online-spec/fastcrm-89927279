import { Share2, Copy, MessageCircle, Facebook, Twitter, QrCode } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useState } from "react";
import QRCode from "react-qr-code";

interface ShareListingButtonProps {
  url: string;
  title: string;
  description?: string;
  className?: string;
}

export function ShareListingButton({ url, title, description, className }: ShareListingButtonProps) {
  const [showQR, setShowQR] = useState(false);
  const fullUrl = url.startsWith("http") ? url : `${window.location.origin}${url}`;
  const encodedUrl = encodeURIComponent(fullUrl);
  const encodedTitle = encodeURIComponent(title);
  const encodedDesc = encodeURIComponent(description || "");

  const copyLink = async () => {
    await navigator.clipboard.writeText(fullUrl);
    toast.success("Link copiado!");
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className={className}>
            <Share2 className="h-4 w-4 mr-1.5" />
            Partilhar
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem onClick={copyLink}>
            <Copy className="h-4 w-4 mr-2" /> Copiar link
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageCircle className="h-4 w-4 mr-2" /> WhatsApp
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook className="h-4 w-4 mr-2" /> Facebook
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a
              href={`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Twitter className="h-4 w-4 mr-2" /> X / Twitter
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <a href={`mailto:?subject=${encodedTitle}&body=${encodedDesc}%0A${encodedUrl}`}>
              <Share2 className="h-4 w-4 mr-2" /> Email
            </a>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setShowQR(true)}>
            <QrCode className="h-4 w-4 mr-2" /> QR Code
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showQR} onOpenChange={setShowQR}>
        <DialogContent className="max-w-xs">
          <DialogHeader>
            <DialogTitle className="text-center">QR Code</DialogTitle>
          </DialogHeader>
          <div className="flex justify-center p-4 bg-background rounded-lg">
            <QRCode value={fullUrl} size={200} />
          </div>
          <p className="text-xs text-muted-foreground text-center">{title}</p>
        </DialogContent>
      </Dialog>
    </>
  );
}
