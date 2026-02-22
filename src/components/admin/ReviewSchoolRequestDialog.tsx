import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, XCircle, User, Calendar, MessageSquare, ArrowRight } from "lucide-react";
import { format } from "date-fns";

interface DraftSchool {
  id: string;
  name: string;
  province: string | null;
  school_type: string | null;
  request_logo_url: string | null;
  note_to_admin: string | null;
  submitted_by_user_id: string | null;
  created_at: string;
  status: string;
}

interface GroupedRequest {
  school_name: string;
  school_type: string;
  province: string;
  request_count: number;
  requests: DraftSchool[];
  latest_logo_url: string | null;
}

interface ReviewSchoolRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedRequest: GroupedRequest | null;
  onSuccess: () => void;
  onApproveAndCreate: (prefillData: {
    name: string;
    province: string;
    school_type: string;
    logo_url: string | null;
    requestIds: string[];
  }) => void;
}

export function ReviewSchoolRequestDialog({ 
  open, 
  onOpenChange, 
  groupedRequest,
  onSuccess,
  onApproveAndCreate,
}: ReviewSchoolRequestDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (groupedRequest && open) {
      fetchUserProfiles();
    }
  }, [groupedRequest, open]);

  const fetchUserProfiles = async () => {
    if (!groupedRequest) return;
    
    const userIds = groupedRequest.requests
      .map(r => r.submitted_by_user_id)
      .filter((id): id is string => id !== null);
    
    if (userIds.length === 0) return;

    const { data } = await supabase
      .from('profiles')
      .select('id, first_name, contact_value')
      .in('id', userIds);

    if (data) {
      const profileMap = data.reduce((acc, profile) => {
        acc[profile.id] = profile;
        return acc;
      }, {} as Record<string, any>);
      setUserProfiles(profileMap);
    }
  };

  const handleApprove = () => {
    if (!groupedRequest) return;

    onApproveAndCreate({
      name: groupedRequest.school_name,
      province: groupedRequest.province,
      school_type: groupedRequest.school_type,
      logo_url: groupedRequest.latest_logo_url,
      requestIds: groupedRequest.requests.map(r => r.id),
    });
    
    onOpenChange(false);
  };

  const handleDecline = async () => {
    if (!groupedRequest) return;

    setIsSubmitting(true);

    try {
      const requestIds = groupedRequest.requests.map(r => r.id);
      // Update schools status to rejected
      const { error } = await supabase
        .from('schools')
        .update({ 
          status: 'rejected',
          is_visible: false,
        })
        .in('id', requestIds);

      if (error) throw error;

      toast({
        title: "Requests Declined",
        description: `${groupedRequest.request_count} request(s) for ${groupedRequest.school_name} have been declined.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error declining requests:', error);
      toast({
        title: "Decline Failed",
        description: "Could not decline the requests. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!groupedRequest) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Review School Request</DialogTitle>
          <DialogDescription>
            {groupedRequest.request_count} user(s) requested this school
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col gap-6">
          {/* Request Summary */}
          <div className="rounded-lg border p-4 bg-muted/30">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">School Name</Label>
                <p className="font-medium">{groupedRequest.school_name}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Province</Label>
                <p className="font-medium">{groupedRequest.province}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">School Type</Label>
                <Badge variant="outline" className="capitalize">
                  {groupedRequest.school_type}
                </Badge>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Logo</Label>
                {groupedRequest.latest_logo_url ? (
                  <img 
                    src={groupedRequest.latest_logo_url} 
                    alt="Submitted logo"
                    className="h-12 w-12 rounded object-cover border mt-1"
                  />
                ) : (
                  <p className="text-sm text-muted-foreground">No logo provided</p>
                )}
              </div>
            </div>
          </div>

          {/* User Requests List */}
          <div className="flex-1 overflow-hidden">
            <Label className="mb-2 block">Requesting Users</Label>
            <ScrollArea className="h-48 rounded-md border p-3">
              <div className="space-y-3">
                {groupedRequest.requests.map((request) => {
                  const profile = request.submitted_by_user_id 
                    ? userProfiles[request.submitted_by_user_id] 
                    : null;
                  
                  return (
                    <div 
                      key={request.id}
                      className="p-3 rounded-lg bg-muted/50 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">
                            {profile?.first_name || profile?.contact_value || 'Anonymous User'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {format(new Date(request.created_at), 'MMM d, yyyy')}
                        </div>
                      </div>
                      {request.note_to_admin && (
                        <div className="flex items-start gap-2 text-sm text-muted-foreground">
                          <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                          <span>{request.note_to_admin}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-4 border-t">
          <Button 
            variant="destructive" 
            onClick={handleDecline}
            disabled={isSubmitting}
            className="gap-2"
          >
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Decline
          </Button>
          <div className="flex-1" />
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleApprove}
            disabled={isSubmitting}
            className="gap-2"
          >
            <ArrowRight className="h-4 w-4" />
            Continue to Create School
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
