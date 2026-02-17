import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function CreateInvitationDialog({ open, onOpenChange, onSuccess }: Props) {
  const { toast } = useToast();
  const [schoolName, setSchoolName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [expiryDays, setExpiryDays] = useState("7");
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!schoolName.trim() || !contactEmail.trim()) return;
    setLoading(true);

    // Check for existing pending invite for this school
    const { data: existing } = await supabase
      .from("school_invitations")
      .select("id")
      .eq("school_name", schoolName.trim())
      .eq("status", "pending");

    if (existing && existing.length > 0) {
      const proceed = window.confirm(`There's already a pending invitation for "${schoolName}". Create another?`);
      if (!proceed) { setLoading(false); return; }
    }

    // Generate token
    const token = crypto.randomUUID() + crypto.randomUUID();
    const tokenHash = await sha256(token);
    const days = Number(expiryDays);

    const { error } = await supabase.from("school_invitations").insert({
      school_name: schoolName.trim(),
      token_hash: tokenHash,
      contact_email: contactEmail.trim(),
      expiry_days: days,
      expires_at: new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (error) {
      toast({ title: "Error", description: "Failed to create invitation", variant: "destructive" });
    } else {
      const link = `${window.location.origin}/school-setup/${token}`;
      setGeneratedLink(link);
      toast({ title: "Invitation created", description: `Link ready for ${schoolName}` });
      onSuccess();
    }
    setLoading(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClose = (o: boolean) => {
    if (!o) {
      setSchoolName("");
      setContactEmail("");
      setExpiryDays("7");
      setGeneratedLink("");
      setCopied(false);
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Invite School</DialogTitle>
          <DialogDescription>Create a unique onboarding link for a school representative.</DialogDescription>
        </DialogHeader>

        {generatedLink ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Share this link with the school representative:</p>
            <div className="flex items-center gap-2">
              <Input value={generatedLink} readOnly className="text-xs" />
              <Button size="icon" variant="outline" onClick={handleCopy}>
                {copied ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <Button className="w-full" onClick={() => handleClose(false)}>Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inv-school">School Name *</Label>
              <Input id="inv-school" value={schoolName} onChange={e => setSchoolName(e.target.value)} placeholder="e.g. Grey College" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="inv-email">Contact Email *</Label>
              <Input id="inv-email" type="email" value={contactEmail} onChange={e => setContactEmail(e.target.value)} placeholder="rep@school.co.za" />
            </div>
            <div className="space-y-2">
              <Label>Link Expiry</Label>
              <Select value={expiryDays} onValueChange={setExpiryDays}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">7 days</SelectItem>
                  <SelectItem value="14">14 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={handleCreate} disabled={loading || !schoolName.trim() || !contactEmail.trim()} className="w-full">
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Creating...</> : "Create Invitation"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
