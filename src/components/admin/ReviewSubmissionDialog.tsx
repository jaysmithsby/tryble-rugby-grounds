import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  invitationId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Submission = {
  id: string;
  full_official_name: string;
  nickname: string;
  province: string;
  year_established: number;
  school_motto: string | null;
  main_rival: string | null;
  number_of_springboks: number;
  school_trivia: string | null;
  crest_image_url: string | null;
  primary_colour: string | null;
  secondary_colour: string | null;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
};

export function ReviewSubmissionDialog({ invitationId, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<Submission | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!invitationId) return;
    setLoading(true);
    setRejecting(false);
    setRejectReason("");
    (async () => {
      const { data, error } = await supabase
        .from("school_submissions")
        .select("*")
        .eq("invitation_id", invitationId)
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "Could not load submission", variant: "destructive" });
        setSubmission(null);
      } else {
        setSubmission(data as Submission);
      }
      setLoading(false);
    })();
  }, [invitationId]);

  const handleApprove = async () => {
    if (!submission || !invitationId) return;
    setProcessing(true);

    // Check for existing school
    const slug = submission.full_official_name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const { data: existing } = await supabase.from("schools").select("id, name").eq("slug", slug).maybeSingle();

    if (existing) {
      const update = window.confirm(`A school named "${existing.name}" already exists. Update it with this submission data?`);
      if (!update) { setProcessing(false); return; }

      await supabase.from("schools").update({
        name: submission.full_official_name,
        nickname: submission.nickname,
        province: submission.province,
        established_year: submission.year_established,
        motto: submission.school_motto,
        main_rival: submission.main_rival,
        springboks_count: submission.number_of_springboks,
        trivia_fact: submission.school_trivia,
        emblem_url: submission.crest_image_url,
        primary_color: submission.primary_colour,
        secondary_color: submission.secondary_colour,
      }).eq("id", existing.id);
    } else {
      await supabase.from("schools").insert({
        name: submission.full_official_name,
        slug,
        nickname: submission.nickname,
        province: submission.province,
        established_year: submission.year_established,
        motto: submission.school_motto,
        main_rival: submission.main_rival,
        springboks_count: submission.number_of_springboks,
        trivia_fact: submission.school_trivia,
        emblem_url: submission.crest_image_url,
        primary_color: submission.primary_colour,
        secondary_color: submission.secondary_colour,
      });
    }

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("school_invitations").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id || null,
    }).eq("id", invitationId);

    toast({ title: "Approved", description: `${submission.full_official_name} has been added to Trybal!` });
    setProcessing(false);
    onSuccess();
    onClose();
  };

  const handleReject = async () => {
    if (!invitationId) return;
    setProcessing(true);
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("school_invitations").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id || null,
    }).eq("id", invitationId);

    toast({ title: "Rejected", description: "Invitation has been rejected." });
    setProcessing(false);
    onSuccess();
    onClose();
  };

  const field = (label: string, value: string | number | null | undefined) => (
    value ? (
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    ) : null
  );

  return (
    <Dialog open={!!invitationId} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Review Submission</DialogTitle>
          <DialogDescription>Review the school's submitted details and approve or reject.</DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center"><Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" /></div>
        ) : !submission ? (
          <p className="text-center text-muted-foreground py-8">No submission data found.</p>
        ) : (
          <div className="space-y-6">
            {submission.crest_image_url && (
              <div className="flex justify-center">
                <img src={submission.crest_image_url} alt="School crest" className="h-24 w-24 object-contain rounded border" />
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">School Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {field("Official Name", submission.full_official_name)}
                {field("Nickname", submission.nickname)}
                {field("Province", submission.province)}
                {field("Year Established", submission.year_established)}
                {field("Motto", submission.school_motto)}
                {field("Main Rival", submission.main_rival)}
                {field("Springboks", submission.number_of_springboks)}
                {field("Primary Colour", submission.primary_colour)}
                {field("Secondary Colour", submission.secondary_colour)}
              </div>
              {submission.school_trivia && (
                <div>
                  <p className="text-xs text-muted-foreground">Trivia</p>
                  <p className="text-sm">{submission.school_trivia}</p>
                </div>
              )}
            </div>

            <div className="space-y-3 border-t pt-4">
              <h3 className="font-semibold text-sm text-foreground">Contact (Private)</h3>
              <div className="grid grid-cols-2 gap-3">
                {field("Name", submission.contact_name)}
                {field("Email", submission.contact_email)}
                {field("Phone", submission.contact_phone)}
              </div>
            </div>

            {rejecting ? (
              <div className="space-y-3 border-t pt-4">
                <Label>Rejection Reason (optional)</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Why is this being rejected?" />
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setRejecting(false)} className="flex-1">Cancel</Button>
                  <Button variant="destructive" onClick={handleReject} disabled={processing} className="flex-1">
                    {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm Reject"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="flex gap-2 pt-4 border-t">
                <Button variant="destructive" onClick={() => setRejecting(true)} disabled={processing} className="flex-1 gap-1">
                  <XCircle className="h-4 w-4" /> Reject
                </Button>
                <Button onClick={handleApprove} disabled={processing} className="flex-1 gap-1">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4" /> Approve</>}
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
