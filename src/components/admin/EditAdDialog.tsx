import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface Advertisement {
  id: string;
  campaign_name: string;
  sponsor_name: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  expires_at: string | null;
}

interface EditAdDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ad: Advertisement | null;
  onSuccess: () => void;
}

export function EditAdDialog({ open, onOpenChange, ad, onSuccess }: EditAdDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    campaign_name: "",
    sponsor_name: "",
    image_url: "",
    link_url: "",
    is_active: true,
    display_order: 0,
    starts_at: "",
    expires_at: "",
  });

  useEffect(() => {
    if (ad) {
      setFormData({
        campaign_name: ad.campaign_name,
        sponsor_name: ad.sponsor_name,
        image_url: ad.image_url,
        link_url: ad.link_url,
        is_active: ad.is_active,
        display_order: ad.display_order,
        starts_at: ad.starts_at ? ad.starts_at.slice(0, 16) : "",
        expires_at: ad.expires_at ? ad.expires_at.slice(0, 16) : "",
      });
    }
  }, [ad]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ad) return;
    
    setLoading(true);

    const { error } = await supabase
      .from("advertisements")
      .update({
        campaign_name: formData.campaign_name,
        sponsor_name: formData.sponsor_name,
        image_url: formData.image_url,
        link_url: formData.link_url,
        is_active: formData.is_active,
        display_order: formData.display_order,
        starts_at: formData.starts_at || null,
        expires_at: formData.expires_at || null,
      })
      .eq("id", ad.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Update Failed",
        description: "Could not update the advertisement. Please try again.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Advertisement updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Advertisement</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="campaign_name">Campaign Name *</Label>
            <Input
              id="campaign_name"
              value={formData.campaign_name}
              onChange={(e) => setFormData({ ...formData, campaign_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="sponsor_name">Sponsor Name *</Label>
            <Input
              id="sponsor_name"
              value={formData.sponsor_name}
              onChange={(e) => setFormData({ ...formData, sponsor_name: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL *</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_url">Click-through URL *</Label>
            <Input
              id="link_url"
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="starts_at">Start Date</Label>
              <Input
                id="starts_at"
                type="datetime-local"
                value={formData.starts_at}
                onChange={(e) => setFormData({ ...formData, starts_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="expires_at">End Date</Label>
              <Input
                id="expires_at"
                type="datetime-local"
                value={formData.expires_at}
                onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_order">Display Order</Label>
            <Input
              id="display_order"
              type="number"
              value={formData.display_order}
              onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Active</Label>
            <Switch
              id="is_active"
              checked={formData.is_active}
              onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
