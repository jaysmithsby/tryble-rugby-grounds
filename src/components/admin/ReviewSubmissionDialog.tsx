import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Props {
  invitationId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

type SchoolSubmission = {
  id: string;
  name: string;
  nickname: string | null;
  province: string | null;
  established_year: number | null;
  motto: string | null;
  main_rival: string | null;
  springboks_count: number | null;
  trivia_fact: string | null;
  emblem_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
};

export function ReviewSubmissionDialog({ invitationId, onClose, onSuccess }: Props) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submission, setSubmission] = useState<SchoolSubmission | null>(null);
  const [schoolId, setSchoolId] = useState<string | null>(null);
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
        .from("schools")
        .select("*")
        .eq("invitation_id", invitationId)
        .eq("status", "pending_review")
        .single();

      if (error || !data) {
        toast({ title: "Error", description: "Could not load submission", variant: "destructive" });
        setSubmission(null);
        setSchoolId(null);
      } else {
        setSchoolId(data.id);
        setSubmission({
          id: data.id,
          name: data.name,
          nickname: data.nickname,
          province: data.province,
          established_year: data.established_year,
          motto: data.motto,
          main_rival: data.main_rival,
          springboks_count: data.springboks_count,
          trivia_fact: data.trivia_fact,
          emblem_url: data.emblem_url,
          primary_color: data.primary_color,
          secondary_color: data.secondary_color,
          contact_name: data.contact_name,
          contact_email: data.contact_email,
          contact_phone: data.contact_phone,
        });
      }
      setLoading(false);
    })();
  }, [invitationId]);

  const handleApprove = async () => {
    if (!submission || !invitationId || !schoolId) return;
    setProcessing(true);

    // Simply update the school status to approved and make visible
    await supabase.from("schools").update({
      status: "approved",
      is_visible: true,
    }).eq("id", schoolId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("school_invitations").update({
      status: "approved",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id || null,
    }).eq("id", invitationId);

    toast({ title: "Approved", description: `${submission.name} has been added to Trybal!` });
    setProcessing(false);
    onSuccess();
    onClose();
  };

  const handleReject = async () => {
    if (!invitationId || !schoolId) return;
    setProcessing(true);

    // Update school status to rejected
    await supabase.from("schools").update({
      status: "rejected",
      is_visible: false,
    }).eq("id", schoolId);

    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from("school_invitations").update({
      status: "rejected",
      reviewed_at: new Date().toISOString(),
      reviewed_by: user?.id || null,
    }).eq("id", invitationId);

    toast({ title: "Rejected", description: "Submission has been rejected." });
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
            {submission.emblem_url && (
              <div className="flex justify-center">
                <img src={submission.emblem_url} alt="School crest" className="h-24 w-24 object-contain rounded border" />
              </div>
            )}

            <div className="space-y-3">
              <h3 className="font-semibold text-sm text-foreground">School Information</h3>
              <div className="grid grid-cols-2 gap-3">
                {field("Official Name", submission.name)}
                {field("Nickname", submission.nickname)}
                {field("Province", submission.province)}
                {field("Year Established", submission.established_year)}
                {field("Motto", submission.motto)}
                {field("Main Rival", submission.main_rival)}
                {field("Springboks", submission.springboks_count)}
                {field("Primary Color", submission.primary_color)}
                {field("Secondary Color", submission.secondary_color)}
              </div>
              {submission.trivia_fact && (
                <div>
                  <p className="text-xs text-muted-foreground">Trivia</p>
                  <p className="text-sm">{submission.trivia_fact}</p>
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
