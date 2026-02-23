import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy, MessageCircle } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";
import { useToast } from "@/hooks/use-toast";

interface PoolInviteProps {
  poolName: string;
  inviteCode: string;
  triggerElement?: React.ReactNode;
}

export const PoolInvite = ({ poolName, inviteCode, triggerElement }: PoolInviteProps) => {
  const { toast } = useToast();
  const inviteUrl = `${window.location.origin}/join-pool/${inviteCode}`;
  const shareMessage = `🏉 Join my Trybal pool "${poolName}"!\n\nUse code: ${inviteCode}\nor click: ${inviteUrl}`;
  
  // Check if native share is available (mainly mobile)
  const canNativeShare = typeof navigator !== 'undefined' && !!navigator.share;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${poolName} on Trybal`,
          text: `🏉 Join my Trybal pool "${poolName}"! Use code: ${inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        // User cancelled or error - silently ignore
        if ((err as Error).name !== 'AbortError') {
          console.error('Share failed:', err);
        }
      }
    }
  };

  const shareViaWhatsApp = () => {
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareMessage)}`;
    window.open(whatsappUrl, '_blank');
  };

  const shareViaTelegram = () => {
    const telegramUrl = `https://t.me/share/url?url=${encodeURIComponent(inviteUrl)}&text=${encodeURIComponent(`🏉 Join my Trybal pool "${poolName}"! Use code: ${inviteCode}`)}`;
    window.open(telegramUrl, '_blank');
  };

  const shareViaTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(`🏉 Join my Trybal pool "${poolName}"!`)}&url=${encodeURIComponent(inviteUrl)}`;
    window.open(twitterUrl, '_blank');
  };

  const shareViaFacebook = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(inviteUrl)}`;
    window.open(facebookUrl, '_blank');
  };

  const copyInviteCode = () => {
    navigator.clipboard.writeText(inviteCode);
    toast({
      title: "Copied!",
      description: "Invite code copied to clipboard"
    });
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard"
    });
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {triggerElement || (
          <Button variant="outline" size="sm" className="w-full">
            <Share2 className="w-4 h-4 mr-2" />
            Share Pool
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite Friends to {poolName}</DialogTitle>
          <DialogDescription>
            Share your pool code or scan the QR code
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* QR Code */}
          <div className="flex flex-col items-center gap-4 p-6 bg-background border rounded-lg">
            <QRCodeSVG
              value={inviteUrl}
              size={180}
              level="M"
              includeMargin
            />
            <p className="text-sm text-muted-foreground text-center">
              Scan this QR code to join the pool
            </p>
          </div>

          {/* Invite Code */}
          <div className="space-y-2">
            <Label>Invite Code</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-center font-mono text-2xl font-bold">
                {inviteCode}
              </div>
              <Button variant="outline" onClick={copyInviteCode}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Invite Link */}
          <div className="space-y-2">
            <Label>Invite Link</Label>
            <div className="flex gap-2">
              <div className="flex-1 p-3 bg-muted rounded-lg text-xs break-all overflow-hidden">
                {inviteUrl}
              </div>
              <Button variant="outline" onClick={copyInviteLink}>
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <Label>Share via</Label>
            
            {/* Native Share - Primary on mobile */}
            {canNativeShare && (
              <Button
                onClick={handleNativeShare}
                className="w-full"
                size="lg"
              >
                <Share2 className="w-5 h-5 mr-2" />
                Share
              </Button>
            )}

            {/* Social Platform Buttons */}
            <div className="grid grid-cols-4 gap-2">
              {/* WhatsApp */}
              <Button
                onClick={shareViaWhatsApp}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-[#25D366]/10 hover:border-[#25D366]"
              >
                <svg className="w-6 h-6 text-[#25D366]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                </svg>
                <span className="text-xs">WhatsApp</span>
              </Button>

              {/* Telegram */}
              <Button
                onClick={shareViaTelegram}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-[#0088cc]/10 hover:border-[#0088cc]"
              >
                <svg className="w-6 h-6 text-[#0088cc]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z"/>
                </svg>
                <span className="text-xs">Telegram</span>
              </Button>

              {/* Twitter/X */}
              <Button
                onClick={shareViaTwitter}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-foreground/10"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
                <span className="text-xs">X</span>
              </Button>

              {/* Facebook */}
              <Button
                onClick={shareViaFacebook}
                variant="outline"
                className="flex flex-col items-center gap-1 h-auto py-3 hover:bg-[#1877F2]/10 hover:border-[#1877F2]"
              >
                <svg className="w-6 h-6 text-[#1877F2]" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
                <span className="text-xs">Facebook</span>
              </Button>
            </div>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            💡 Friends can join by entering the code in the "Join Pool" section
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const Label = ({ children }: { children: React.ReactNode }) => (
  <label className="text-sm font-medium">{children}</label>
);
