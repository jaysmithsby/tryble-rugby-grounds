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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

interface NewsArticle {
  id: string;
  title: string;
  summary: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  display_order: number;
  starts_at: string | null;
  expires_at: string | null;
}

interface EditNewsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article: NewsArticle | null;
  onSuccess: () => void;
}

export function EditNewsDialog({ open, onOpenChange, article, onSuccess }: EditNewsDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    summary: "",
    image_url: "",
    link_url: "",
    is_active: true,
    display_order: 0,
    starts_at: "",
    expires_at: "",
  });

  useEffect(() => {
    if (article) {
      setFormData({
        title: article.title,
        summary: article.summary || "",
        image_url: article.image_url || "",
        link_url: article.link_url || "",
        is_active: article.is_active,
        display_order: article.display_order,
        starts_at: article.starts_at ? article.starts_at.slice(0, 16) : "",
        expires_at: article.expires_at ? article.expires_at.slice(0, 16) : "",
      });
    }
  }, [article]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!article) return;
    
    setLoading(true);

    const { error } = await supabase
      .from("news_articles")
      .update({
        title: formData.title,
        summary: formData.summary || null,
        image_url: formData.image_url || null,
        link_url: formData.link_url || null,
        is_active: formData.is_active,
        display_order: formData.display_order,
        starts_at: formData.starts_at || null,
        expires_at: formData.expires_at || null,
      })
      .eq("id", article.id);

    setLoading(false);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update news article",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "News article updated successfully",
      });
      onOpenChange(false);
      onSuccess();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit News Article</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title *</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="summary">Summary</Label>
            <Textarea
              id="summary"
              value={formData.summary}
              onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="image_url">Image URL</Label>
            <Input
              id="image_url"
              type="url"
              value={formData.image_url}
              onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="link_url">Article Link</Label>
            <Input
              id="link_url"
              type="url"
              value={formData.link_url}
              onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
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
