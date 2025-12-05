import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle, XCircle, User, Calendar, MessageSquare } from "lucide-react";
import { saProvinces } from "@/data/saProvinces";
import { format } from "date-fns";

interface SchoolRequest {
  id: string;
  school_name: string;
  province: string;
  school_type: string;
  logo_url: string | null;
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
  requests: SchoolRequest[];
  latest_logo_url: string | null;
}

interface ReviewSchoolRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupedRequest: GroupedRequest | null;
  onSuccess: () => void;
}

export function ReviewSchoolRequestDialog({ 
  open, 
  onOpenChange, 
  groupedRequest,
  onSuccess 
}: ReviewSchoolRequestDialogProps) {
  const [schoolName, setSchoolName] = useState("");
  const [province, setProvince] = useState("");
  const [schoolType, setSchoolType] = useState<string>("co-ed");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [userProfiles, setUserProfiles] = useState<Record<string, any>>({});
  const { toast } = useToast();

  useEffect(() => {
    if (groupedRequest) {
      setSchoolName(groupedRequest.school_name);
      setProvince(groupedRequest.province);
      setSchoolType(groupedRequest.school_type);
      setLogoPreview(groupedRequest.latest_logo_url);
      fetchUserProfiles();
    }
  }, [groupedRequest]);

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

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleApprove = async () => {
    if (!groupedRequest || !schoolName.trim() || !province) {
      toast({
        title: "Missing Fields",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl = groupedRequest.latest_logo_url;

      // Upload new logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('school-jerseys')
          .upload(fileName, logoFile);

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('school-jerseys')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // Generate slug
      const slug = schoolName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      // Create the school
      const { error: schoolError } = await supabase
        .from('schools')
        .insert({
          name: schoolName.trim(),
          slug,
          province,
          emblem_url: logoUrl,
          status: 'verified',
        });

      if (schoolError) throw schoolError;

      // Update all related requests to approved
      const requestIds = groupedRequest.requests.map(r => r.id);
      const { error: updateError } = await supabase
        .from('school_requests')
        .update({ 
          status: 'approved',
          reviewed_at: new Date().toISOString(),
        })
        .in('id', requestIds);

      if (updateError) throw updateError;

      toast({
        title: "School Approved!",
        description: `${schoolName} has been created and is now available for users.`,
      });

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error approving school:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to approve school request.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecline = async () => {
    if (!groupedRequest) return;

    setIsSubmitting(true);

    try {
      const requestIds = groupedRequest.requests.map(r => r.id);
      const { error } = await supabase
        .from('school_requests')
        .update({ 
          status: 'declined',
          reviewed_at: new Date().toISOString(),
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
        title: "Error",
        description: "Failed to decline requests.",
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
          {/* Edit Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-school-name">School Name</Label>
              <Input
                id="edit-school-name"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-province">Province</Label>
              <Select value={province} onValueChange={setProvince}>
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {saProvinces.map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>School Type</Label>
              <RadioGroup 
                value={schoolType} 
                onValueChange={setSchoolType}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="boys" id="edit-boys" />
                  <Label htmlFor="edit-boys" className="cursor-pointer">Boys</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="girls" id="edit-girls" />
                  <Label htmlFor="edit-girls" className="cursor-pointer">Girls</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="co-ed" id="edit-co-ed" />
                  <Label htmlFor="edit-co-ed" className="cursor-pointer">Co-Ed</Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Logo</Label>
              <div className="flex items-center gap-3">
                {logoPreview && (
                  <img 
                    src={logoPreview} 
                    alt="Logo preview"
                    className="h-12 w-12 rounded object-cover border"
                  />
                )}
                <Input
                  id="edit-logo"
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => document.getElementById('edit-logo')?.click()}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
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
            {isSubmitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <CheckCircle className="h-4 w-4" />
            )}
            Approve & Create School
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
