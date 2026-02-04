import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle } from "lucide-react";
import { saProvinces } from "@/data/saProvinces";

interface SchoolRequestModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialSchoolName?: string;
}

export function SchoolRequestModal({ open, onOpenChange, initialSchoolName = "" }: SchoolRequestModalProps) {
  const [schoolName, setSchoolName] = useState(initialSchoolName);
  const [province, setProvince] = useState("");
  const [schoolType, setSchoolType] = useState<"boys" | "girls" | "co-ed">("co-ed");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [noteToAdmin, setNoteToAdmin] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const { toast } = useToast();

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setLogoFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!schoolName.trim() || !province) {
      toast({
        title: "Missing Fields",
        description: "Please fill in school name and province.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      let logoUrl: string | null = null;

      // Upload logo if provided
      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('school-request-logos')
          .upload(fileName, logoFile);

        if (uploadError) {
          console.error('Logo upload error:', uploadError);
        } else {
          const { data: { publicUrl } } = supabase.storage
            .from('school-request-logos')
            .getPublicUrl(fileName);
          logoUrl = publicUrl;
        }
      }

      // Get current user if logged in
      const { data: { user } } = await supabase.auth.getUser();

      // Insert school request
      const { error } = await supabase
        .from('school_requests')
        .insert({
          school_name: schoolName.trim(),
          province,
          school_type: schoolType,
          logo_url: logoUrl,
          note_to_admin: noteToAdmin.trim() || null,
          submitted_by_user_id: user?.id || null,
        });

      if (error) throw error;

      setIsSuccess(true);
      
      // Reset form after delay
      setTimeout(() => {
        onOpenChange(false);
        setIsSuccess(false);
        setSchoolName("");
        setProvince("");
        setSchoolType("co-ed");
        setLogoFile(null);
        setNoteToAdmin("");
      }, 2000);

    } catch (error: any) {
      console.error('Error submitting school request:', error);
      toast({
        title: "Request Failed",
        description: "Could not submit your school request. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircle className="h-16 w-16 text-primary mb-4" />
            <h3 className="text-xl font-bold mb-2">Thanks!</h3>
            <p className="text-muted-foreground">
              Your school has been submitted for approval. You can continue registering — we'll notify you once it's live.
            </p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Request a New School</DialogTitle>
          <DialogDescription>
            Submit your school details and we'll review it for approval.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name *</Label>
            <Input
              id="school-name"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              placeholder="Enter school name"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="province">Province *</Label>
            <Select value={province} onValueChange={setProvince} required>
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
            <Label>School Type *</Label>
            <RadioGroup 
              value={schoolType} 
              onValueChange={(v) => setSchoolType(v as "boys" | "girls" | "co-ed")}
              className="flex gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="boys" id="boys" />
                <Label htmlFor="boys" className="cursor-pointer">Boys</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="girls" id="girls" />
                <Label htmlFor="girls" className="cursor-pointer">Girls</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="co-ed" id="co-ed" />
                <Label htmlFor="co-ed" className="cursor-pointer">Co-Ed</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="logo">Upload Logo (optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="logo"
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('logo')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {logoFile ? logoFile.name : "Choose file"}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Note to Admins (optional)</Label>
            <Textarea
              id="note"
              value={noteToAdmin}
              onChange={(e) => setNoteToAdmin(e.target.value)}
              placeholder="Any additional information..."
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Request"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
