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
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PROVINCES = [
  "Eastern Cape",
  "Free State",
  "Gauteng",
  "KwaZulu-Natal",
  "Limpopo",
  "Mpumalanga",
  "North West",
  "Northern Cape",
  "Western Cape",
];

interface School {
  id: string;
  name: string;
  nickname?: string | null;
  province: string | null;
  website: string | null;
  icon_url: string | null;
  emblem_url?: string | null;
  jersey_url?: string | null;
  main_rival: string | null;
  established_year: number | null;
  springboks_count: number | null;
  trivia_fact: string | null;
  motto: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  status: string;
  is_visible?: boolean;
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
    nickname: "",
    province: "",
    website: "",
    icon_url: "",
    emblem_url: "",
    jersey_url: "",
    main_rival: "",
    established_year: "",
    springboks_count: "",
    trivia_fact: "",
    motto: "",
    primary_color: "#1e3a5f",
    secondary_color: "#c9a227",
    status: "verified",
    is_visible: true,
  });

  useEffect(() => {
    if (school) {
      setFormData({
        name: school.name || "",
        nickname: school.nickname || "",
        province: school.province || "",
        website: school.website || "",
        icon_url: school.icon_url || "",
        emblem_url: school.emblem_url || "",
        jersey_url: school.jersey_url || "",
        main_rival: school.main_rival || "",
        established_year: school.established_year?.toString() || "",
        springboks_count: school.springboks_count?.toString() || "",
        trivia_fact: school.trivia_fact || "",
        motto: school.motto || "",
        primary_color: school.primary_color || "#1e3a5f",
        secondary_color: school.secondary_color || "#c9a227",
        status: school.status || "verified",
        is_visible: school.is_visible !== false,
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
          nickname: formData.nickname || null,
          province: formData.province || null,
          website: formData.website || null,
          icon_url: formData.icon_url || null,
          emblem_url: formData.emblem_url || null,
          jersey_url: formData.jersey_url || null,
          main_rival: formData.main_rival || null,
          established_year: formData.established_year
            ? parseInt(formData.established_year)
            : null,
          springboks_count: formData.springboks_count
            ? parseInt(formData.springboks_count)
            : null,
          trivia_fact: formData.trivia_fact || null,
          motto: formData.motto || null,
          primary_color: formData.primary_color || null,
          secondary_color: formData.secondary_color || null,
          status: formData.status,
          is_visible: formData.is_visible,
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

  // Get display image for preview (emblem > jersey > icon)
  const displayImage = formData.emblem_url || formData.jersey_url || formData.icon_url;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit School</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
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
              <Label htmlFor="nickname">Nickname</Label>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) =>
                  setFormData({ ...formData, nickname: e.target.value })
                }
                placeholder="e.g., The Maroon Machine"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="province">Province</Label>
              <Select
                value={formData.province}
                onValueChange={(value) =>
                  setFormData({ ...formData, province: value })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select province" />
                </SelectTrigger>
                <SelectContent>
                  {PROVINCES.map((province) => (
                    <SelectItem key={province} value={province}>
                      {province}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <Label htmlFor="motto">School Motto</Label>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) =>
                  setFormData({ ...formData, motto: e.target.value })
                }
                placeholder="e.g., Per Aspera Ad Astra"
              />
            </div>
          </div>

          {/* Images Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">School Images</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="emblem_url">Emblem/Crest URL</Label>
                <Input
                  id="emblem_url"
                  value={formData.emblem_url}
                  onChange={(e) =>
                    setFormData({ ...formData, emblem_url: e.target.value })
                  }
                  placeholder="Primary display image URL"
                />
                <p className="text-xs text-muted-foreground">Primary image shown on profile and fixtures</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="jersey_url">Jersey Image URL</Label>
                <Input
                  id="jersey_url"
                  value={formData.jersey_url}
                  onChange={(e) =>
                    setFormData({ ...formData, jersey_url: e.target.value })
                  }
                  placeholder="Fallback jersey image URL"
                />
                <p className="text-xs text-muted-foreground">Fallback if no emblem uploaded</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="icon_url">Legacy Icon URL</Label>
                <Input
                  id="icon_url"
                  value={formData.icon_url}
                  onChange={(e) =>
                    setFormData({ ...formData, icon_url: e.target.value })
                  }
                  placeholder="Legacy icon (deprecated)"
                />
              </div>

              {/* Image Preview */}
              <div className="space-y-2">
                <Label>Image Preview</Label>
                <div className="h-20 w-20 rounded-lg border border-border bg-muted/50 flex items-center justify-center overflow-hidden">
                  {displayImage ? (
                    <img 
                      src={displayImage} 
                      alt="School preview"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <span className="text-xs text-muted-foreground">No image</span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* School Branding Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">School Branding</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primary_color">Primary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="primary_color"
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    className="h-10 w-14 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, primary_color: e.target.value })
                    }
                    placeholder="#1e3a5f"
                    className="flex-1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="secondary_color">Secondary Color</Label>
                <div className="flex gap-2">
                  <input
                    type="color"
                    id="secondary_color"
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    className="h-10 w-14 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) =>
                      setFormData({ ...formData, secondary_color: e.target.value })
                    }
                    placeholder="#c9a227"
                    className="flex-1"
                  />
                </div>
              </div>

              {/* Color Preview */}
              <div className="col-span-2 space-y-2">
                <Label>Color Preview</Label>
                <div 
                  className="h-12 rounded-md flex items-center justify-center text-sm font-medium"
                  style={{ 
                    background: `linear-gradient(135deg, ${formData.primary_color} 0%, ${formData.secondary_color} 100%)`,
                    color: '#fff',
                    textShadow: '0 1px 2px rgba(0,0,0,0.5)'
                  }}
                >
                  {formData.name || "School Name"}
                </div>
              </div>
            </div>
          </div>

          {/* Status and Visibility */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">Status & Visibility</h3>
            <div className="grid grid-cols-2 gap-4">
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

              <div className="space-y-2">
                <Label htmlFor="is_visible">Visibility</Label>
                <div className="flex items-center gap-3 h-10">
                  <Switch
                    id="is_visible"
                    checked={formData.is_visible}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_visible: checked })
                    }
                  />
                  <span className="text-sm text-muted-foreground">
                    {formData.is_visible ? "Visible" : "Hidden"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Trivia */}
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