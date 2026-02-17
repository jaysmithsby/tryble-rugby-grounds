import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { CreateInvitationDialog } from "./CreateInvitationDialog";
import { ReviewSubmissionDialog } from "./ReviewSubmissionDialog";

type Invitation = {
  id: string;
  school_name: string;
  contact_email: string;
  status: string;
  created_at: string;
  expires_at: string;
  submitted_at: string | null;
};

const statusColors: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  submitted: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  approved: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  rejected: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  expired: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
};

export function SchoolOnboardingTab() {
  const { toast } = useToast();
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [reviewInvitationId, setReviewInvitationId] = useState<string | null>(null);

  const fetchInvitations = async () => {
    setLoading(true);
    let query = supabase.from("school_invitations").select("*").order("created_at", { ascending: false });

    if (filter !== "all") {
      query = query.eq("status", filter);
    }

    const { data, error } = await query;
    if (error) {
      toast({ title: "Error", description: "Failed to load invitations", variant: "destructive" });
    } else {
      // Sort: submitted first, then pending, then rest
      const sorted = (data || []).sort((a, b) => {
        const order: Record<string, number> = { submitted: 0, pending: 1, approved: 2, rejected: 3, expired: 4 };
        // Mark expired ones that are past their expiry date
        const now = new Date();
        const aStatus = a.status === "pending" && new Date(a.expires_at) < now ? "expired" : a.status;
        const bStatus = b.status === "pending" && new Date(b.expires_at) < now ? "expired" : b.status;
        return (order[aStatus] ?? 5) - (order[bStatus] ?? 5);
      });
      setInvitations(sorted);
    }
    setLoading(false);
  };

  useEffect(() => { fetchInvitations(); }, [filter]);

  const getDisplayStatus = (inv: Invitation) => {
    if (inv.status === "pending" && new Date(inv.expires_at) < new Date()) return "expired";
    return inv.status;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-foreground">School Onboarding</h2>
          <p className="text-muted-foreground mt-1">Invite schools and manage their onboarding submissions</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={fetchInvitations}><RefreshCw className="h-4 w-4" /></Button>
          <Button onClick={() => setCreateOpen(true)} className="gap-2"><Plus className="h-4 w-4" /> Invite School</Button>
        </div>
      </div>

      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm text-muted-foreground">Filter:</span>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>School Name</TableHead>
              <TableHead>Contact Email</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead>Expires</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
            ) : invitations.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No invitations yet</TableCell></TableRow>
            ) : invitations.map(inv => {
              const displayStatus = getDisplayStatus(inv);
              return (
                <TableRow key={inv.id}>
                  <TableCell className="font-medium">{inv.school_name}</TableCell>
                  <TableCell>{inv.contact_email}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className={statusColors[displayStatus] || ""}>
                      {displayStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{format(new Date(inv.expires_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    {displayStatus === "submitted" && (
                      <Button size="sm" variant="outline" className="gap-1" onClick={() => setReviewInvitationId(inv.id)}>
                        <Eye className="h-3 w-3" /> Review
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <CreateInvitationDialog open={createOpen} onOpenChange={setCreateOpen} onSuccess={fetchInvitations} />
      <ReviewSubmissionDialog invitationId={reviewInvitationId} onClose={() => setReviewInvitationId(null)} onSuccess={fetchInvitations} />
    </div>
  );
}
