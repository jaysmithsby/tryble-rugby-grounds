import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Share2, Copy } from "lucide-react";
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

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteUrl);
    toast({
      title: "Copied!",
      description: "Invite link copied to clipboard",
    });
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Join ${poolName} on Trybal`,
          text: `🏉 Join my Trybal pool "${poolName}"! Use code: ${inviteCode}`,
          url: inviteUrl,
        });
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          copyInviteLink();
        }
      }
    } else {
      copyInviteLink();
    }
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
      <DialogContent className="max-w-sm rounded-2xl p-5">
        <DialogHeader className="text-center">
          <DialogTitle className="text-lg">Invite to {poolName}</DialogTitle>
          <DialogDescription>
            Share the code or scan the QR
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 pt-2">
          {/* QR Code */}
          <div className="rounded-xl border bg-background p-4">
            <QRCodeSVG value={inviteUrl} size={140} level="M" includeMargin={false} />
          </div>

          {/* Invite Code + Copy */}
          <div className="flex w-full items-center gap-2">
            <div className="flex-1 rounded-lg bg-muted px-4 py-3 text-center font-mono text-xl font-bold tracking-widest">
              {inviteCode}
            </div>
            <Button variant="outline" size="icon" onClick={copyInviteLink} className="shrink-0">
              <Copy className="h-4 w-4" />
            </Button>
          </div>

          {/* Share CTA */}
          <Button onClick={handleShare} className="w-full" size="lg">
            <Share2 className="w-5 h-5 mr-2" />
            Share
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
