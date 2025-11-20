import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface School {
  id: string;
  name: string;
  province: string | null;
  website: string | null;
  icon_url: string | null;
  main_rival: string | null;
  established_year: number | null;
  springboks_count: number | null;
  trivia_fact: string | null;
  status: string;
}

interface EditSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: School | null;
}

export function EditSchoolDialog({
  open,
  onOpenChange,
  school,
}: EditSchoolDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    province: "",
    website: "",
    icon_url: "",
    main_rival: "",
    established_year: "",
    springboks_count: "",
    trivia_fact: "",
    status: "verified",
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || "",
        province: school.province || "",
        website: school.website || "",
        icon_url: school.icon_url || "",
        main_rival: school.main_rival || "",
        established_year: school.established_year?.toString() || "",
        springboks_count: school.springboks_count?.toString() || "",
        trivia_fact: school.trivia_fact || "",
        status: school.status || "verified",
      });
    }
  }, [school]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("schools")
        .update({
          name: formData.name,
          province: formData.province || null,
          website: formData.website || null,
          icon_url: formData.icon_url || null,
          main_rival: formData.main_rival || null,
          established_year: formData.established_year
            ? parseInt(formData.established_year)
            : null,
          springboks_count: formData.springboks_count
            ? parseInt(formData.springboks_count)
            : null,
          trivia_fact: formData.trivia_fact || null,
          status: formData.status,
        })
        .eq("id", school.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "School updated successfully",
      });

      onOpenChange(false);
      window.location.reload();
    } catch (error) {
      console.error("Error updating school:", error);
      toast({
        title: "Error",
        description: "Failed to update school",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">School Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) =>
                  setFormData({ ...formData, province: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="website">Website</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) =>
                  setFormData({ ...formData, website: e.target.value })
                }
                placeholder="https://..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="icon_url">Crest/Logo URL</Label>
              <Input
                id="icon_url"
                value={formData.icon_url}
                onChange={(e) =>
                  setFormData({ ...formData, icon_url: e.target.value })
                }
                placeholder="URL or storage path"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="main_rival">Main Rival (Derby)</Label>
              <Input
                id="main_rival"
                value={formData.main_rival}
                onChange={(e) =>
                  setFormData({ ...formData, main_rival: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="established_year">Established Year</Label>
              <Input
                id="established_year"
                type="number"
                value={formData.established_year}
                onChange={(e) =>
                  setFormData({ ...formData, established_year: e.target.value })
                }
                placeholder="e.g., 1856"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="springboks_count">Number of Springboks</Label>
              <Input
                id="springboks_count"
                type="number"
                value={formData.springboks_count}
                onChange={(e) =>
                  setFormData({ ...formData, springboks_count: e.target.value })
                }
                placeholder="0"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(value) =>
                  setFormData({ ...formData, status: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verified">Verified</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="trivia_fact">Trivia Fact</Label>
            <Textarea
              id="trivia_fact"
              value={formData.trivia_fact}
              onChange={(e) =>
                setFormData({ ...formData, trivia_fact: e.target.value })
              }
              placeholder="Interesting fact about the school..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
