import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertCircle, CheckCircle2, Sparkles } from "lucide-react";
import { useSchoolAutomation } from "@/hooks/useSchoolAutomation";
import { AutomateSchoolDialog } from "./AutomateSchoolDialog";
import { 
  calculateCompleteness, 
  getCompletenessColor, 
  FIELD_WEIGHTS,
  FIELD_LABELS,
  type SchoolFieldWeights 
} from "@/lib/schoolCompleteness";
import { cn } from "@/lib/utils";
import { JerseyDesigner, JerseyConfig, generateJerseySvg, svgToBlob } from "./JerseyDesigner";

// Moved outside component to prevent recreation on every render
interface FieldWrapperProps {
  field: keyof SchoolFieldWeights;
  children: React.ReactNode;
  label: string;
  isIncomplete: boolean;
}

const FieldWrapper = ({ field, children, label, isIncomplete }: FieldWrapperProps) => (
  <div className="space-y-2">
    <div className="flex items-center gap-2">
      <Label htmlFor={field}>{label}</Label>
      {isIncomplete && (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger>
              <AlertCircle className="h-3.5 w-3.5 text-red-500" />
            </TooltipTrigger>
            <TooltipContent>
              <p className="text-xs">This field is optional but improves profile completeness (+{FIELD_WEIGHTS[field]} brags)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      )}
      {!isIncomplete && (
        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
      )}
    </div>
    {children}
  </div>
);

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

export interface PrefilledSchoolData {
  name?: string;
  province?: string;
  school_type?: string;
  logo_url?: string | null;
  requestIds?: string[];
}

interface CreateSchoolDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefillData?: PrefilledSchoolData | null;
  onSuccess?: () => void;
}

export function CreateSchoolDialog({
  open,
  onOpenChange,
  prefillData,
  onSuccess,
}: CreateSchoolDialogProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const automation = useSchoolAutomation();
  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    province: "",
    school_type: "co-ed",
    website: "",
    emblem_url: "",
    jersey_url: "",
    jersey_config: null as JerseyConfig | null,
    main_rival: "",
    established_year: "",
    springboks_count: "",
    trivia_fact: "",
    motto: "",
    primary_color: "#1e3a5f",
    secondary_color: "#c9a227",
    status: "pending",
    is_visible: true,
  });

  const handleAutomationSubmit = async () => {
    const data = await automation.fetchSchoolData(automation.schoolNameInput);
    if (data) {
      setFormData(prev => ({
        ...prev,
        name: data.name || prev.name,
        nickname: data.nickname || prev.nickname,
        province: data.province || prev.province,
        website: data.website || prev.website,
        main_rival: data.main_rival || prev.main_rival,
        established_year: data.established_year || prev.established_year,
        springboks_count: data.springboks_count || prev.springboks_count,
        motto: data.motto || prev.motto,
        primary_color: data.primary_color || prev.primary_color,
        secondary_color: data.secondary_color || prev.secondary_color,
        trivia_fact: data.trivia_fact || prev.trivia_fact,
      }));
    }
    automation.closePrompt();
  };

  // Pre-fill form data when prefillData changes
  useEffect(() => {
    if (prefillData && open) {
      setFormData(prev => ({
        ...prev,
        name: prefillData.name || "",
        province: prefillData.province || "",
        school_type: prefillData.school_type || "co-ed",
        emblem_url: prefillData.logo_url || "",
      }));
    }
  }, [prefillData, open]);

  const resetForm = () => {
    setFormData({
      name: "",
      nickname: "",
      province: "",
      school_type: "co-ed",
      website: "",
      emblem_url: "",
      jersey_url: "",
      jersey_config: null,
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
  };

  // Calculate completeness score
  const completeness = useMemo(() => {
    return calculateCompleteness({
      name: formData.name,
      province: formData.province,
      school_type: formData.school_type,
      nickname: formData.nickname,
      main_rival: formData.main_rival,
      motto: formData.motto,
      website: formData.website,
      established_year: formData.established_year,
      springboks_count: formData.springboks_count,
      emblem_url: formData.emblem_url,
      jersey_url: formData.jersey_url,
      logo_url: formData.emblem_url,
    });
  }, [formData]);

  const isFieldIncomplete = (field: keyof SchoolFieldWeights): boolean => {
    return completeness.missingFields.includes(field);
  };

  const getFieldClasses = (field: keyof SchoolFieldWeights): string => {
    return isFieldIncomplete(field) ? "border-red-500/50 focus-visible:ring-red-500" : "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Generate slug from school name
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');

      let jerseyUrl = formData.jersey_url;

      // If there's a custom jersey config, generate and upload SVG
      if (formData.jersey_config) {
        const svgString = generateJerseySvg(formData.jersey_config);
        const svgBlob = svgToBlob(svgString);
        const filename = `${slug}-${Date.now()}.svg`;

        // Upload to storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('custom-jerseys')
          .upload(filename, svgBlob, {
            contentType: 'image/svg+xml',
            upsert: true,
          });

        if (uploadError) {
          console.error('Error uploading jersey SVG:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('custom-jerseys')
            .getPublicUrl(filename);
          jerseyUrl = urlData.publicUrl;
        }
      }

      const { error } = await supabase.from("schools").insert({
        name: formData.name,
        slug: slug,
        nickname: formData.nickname || null,
        province: formData.province || null,
        website: formData.website || null,
        emblem_url: formData.emblem_url || null,
        jersey_url: jerseyUrl || null,
        jersey_config: formData.jersey_config as any,
        icon_url: formData.emblem_url || jerseyUrl || null,
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
      });

      if (error) throw error;

      // If this was from a school request, update the request status
      if (prefillData?.requestIds && prefillData.requestIds.length > 0) {
        const { error: updateError } = await supabase
          .from('school_requests')
          .update({ 
            status: 'approved',
            reviewed_at: new Date().toISOString(),
          })
          .in('id', prefillData.requestIds);

        if (updateError) {
          console.error('Error updating school requests:', updateError);
        }
      }

      toast({
        title: "Success",
        description: `School created successfully (${completeness.percentage}% complete)`,
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error("Error creating school:", error);
      toast({
        title: "Creation Failed",
        description: "Could not create the school. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const displayImage = formData.emblem_url || formData.jersey_url;

  return (
    <>
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm();
      onOpenChange(isOpen);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle>
                {prefillData ? "Create School from Request" : "Add New School"}
              </DialogTitle>
              {prefillData && (
                <DialogDescription>
                  Pre-filled with data from user request. Complete additional fields to improve the profile.
                </DialogDescription>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => automation.openPrompt(formData.name)}
                className="gap-1.5"
              >
                <Sparkles className="h-4 w-4" />
                Automate
              </Button>
              <Badge 
                variant={completeness.percentage >= 100 ? "default" : completeness.percentage >= 70 ? "secondary" : "destructive"}
                className="text-sm"
              >
                {completeness.score}/{completeness.maxScore}
              </Badge>
            </div>
          </div>
          
          {/* Completeness Progress Bar */}
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-muted-foreground">Profile Completeness</span>
              <span className={getCompletenessColor(completeness.percentage)}>
                {completeness.percentage}%
              </span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "h-full transition-all duration-300",
                  completeness.percentage >= 100 ? "bg-green-500" :
                  completeness.percentage >= 70 ? "bg-yellow-500" :
                  completeness.percentage >= 40 ? "bg-orange-500" : "bg-red-500"
                )}
                style={{ width: `${completeness.percentage}%` }}
              />
            </div>
            {completeness.missingFields.length > 0 && (
              <p className="text-xs text-muted-foreground mt-1">
                Missing: {completeness.missingFields.map(f => FIELD_LABELS[f]).join(", ")}
              </p>
            )}
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper field="name" label="School Name *" isIncomplete={isFieldIncomplete("name")}>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className={getFieldClasses("name")}
                required
              />
            </FieldWrapper>

            <FieldWrapper field="nickname" label="Nickname" isIncomplete={isFieldIncomplete("nickname")}>
              <Input
                id="nickname"
                value={formData.nickname}
                onChange={(e) => setFormData({ ...formData, nickname: e.target.value })}
                className={getFieldClasses("nickname")}
                placeholder="e.g., The Maroon Machine"
              />
            </FieldWrapper>

            <FieldWrapper field="province" label="Province" isIncomplete={isFieldIncomplete("province")}>
              <Select
                value={formData.province}
                onValueChange={(value) => setFormData({ ...formData, province: value })}
              >
                <SelectTrigger className={getFieldClasses("province")}>
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
            </FieldWrapper>

            <FieldWrapper field="school_type" label="School Type" isIncomplete={isFieldIncomplete("school_type")}>
              <RadioGroup 
                value={formData.school_type} 
                onValueChange={(value) => setFormData({ ...formData, school_type: value })}
                className="flex gap-4 h-10 items-center"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="boys" id="type-boys" />
                  <Label htmlFor="type-boys" className="cursor-pointer">Boys</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="girls" id="type-girls" />
                  <Label htmlFor="type-girls" className="cursor-pointer">Girls</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="co-ed" id="type-coed" />
                  <Label htmlFor="type-coed" className="cursor-pointer">Co-Ed</Label>
                </div>
              </RadioGroup>
            </FieldWrapper>

            <FieldWrapper field="main_rival" label="Main Rival (Derby)" isIncomplete={isFieldIncomplete("main_rival")}>
              <Input
                id="main_rival"
                value={formData.main_rival}
                onChange={(e) => setFormData({ ...formData, main_rival: e.target.value })}
                className={getFieldClasses("main_rival")}
              />
            </FieldWrapper>

            <FieldWrapper field="website" label="Website" isIncomplete={isFieldIncomplete("website")}>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className={getFieldClasses("website")}
                placeholder="https://..."
              />
            </FieldWrapper>

            <FieldWrapper field="established_year" label="Established Year" isIncomplete={isFieldIncomplete("established_year")}>
              <Input
                id="established_year"
                type="number"
                value={formData.established_year}
                onChange={(e) => setFormData({ ...formData, established_year: e.target.value })}
                className={getFieldClasses("established_year")}
                placeholder="e.g., 1856"
              />
            </FieldWrapper>

            <FieldWrapper field="springboks_count" label="Number of Springboks" isIncomplete={isFieldIncomplete("springboks_count")}>
              <Input
                id="springboks_count"
                type="number"
                value={formData.springboks_count}
                onChange={(e) => setFormData({ ...formData, springboks_count: e.target.value })}
                className={getFieldClasses("springboks_count")}
                placeholder="0"
              />
            </FieldWrapper>

            <FieldWrapper field="motto" label="School Motto" isIncomplete={isFieldIncomplete("motto")}>
              <Input
                id="motto"
                value={formData.motto}
                onChange={(e) => setFormData({ ...formData, motto: e.target.value })}
                className={getFieldClasses("motto")}
                placeholder="e.g., Per Aspera Ad Astra"
              />
            </FieldWrapper>
          </div>

          {/* Images Section */}
          <div className="border-t pt-4 mt-4">
            <h3 className="text-sm font-semibold mb-3 text-foreground">School Images</h3>
            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper field="emblem_url" label="Emblem/Crest URL" isIncomplete={isFieldIncomplete("emblem_url")}>
                <Input
                  id="emblem_url"
                  value={formData.emblem_url}
                  onChange={(e) => setFormData({ ...formData, emblem_url: e.target.value })}
                  className={getFieldClasses("emblem_url")}
                  placeholder="Primary display image URL"
                />
                <p className="text-xs text-muted-foreground">Primary image shown on profile and fixtures</p>
              </FieldWrapper>

              <FieldWrapper field="jersey_url" label="Jersey Image URL" isIncomplete={isFieldIncomplete("jersey_url")}>
                <Input
                  id="jersey_url"
                  value={formData.jersey_url}
                  onChange={(e) => setFormData({ ...formData, jersey_url: e.target.value })}
                  className={getFieldClasses("jersey_url")}
                  placeholder="Fallback jersey image URL"
                />
                <p className="text-xs text-muted-foreground">Fallback if no emblem uploaded</p>
              </FieldWrapper>

              {/* Image Preview */}
              <div className="col-span-2 space-y-2">
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
            
            {/* Jersey Designer */}
            <div className="col-span-2 mt-4">
              <JerseyDesigner
                value={formData.jersey_config}
                onChange={(jersey_config) => setFormData({ ...formData, jersey_config })}
                primaryColor={formData.primary_color}
                secondaryColor={formData.secondary_color}
              />
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
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                    className="h-10 w-14 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.primary_color}
                    onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
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
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
                    className="h-10 w-14 rounded-md border border-input cursor-pointer"
                  />
                  <Input
                    value={formData.secondary_color}
                    onChange={(e) => setFormData({ ...formData, secondary_color: e.target.value })}
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
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
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
                    onCheckedChange={(checked) => setFormData({ ...formData, is_visible: checked })}
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
              onChange={(e) => setFormData({ ...formData, trivia_fact: e.target.value })}
              placeholder="Interesting fact about the school..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                resetForm();
                onOpenChange(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : `Create School (${completeness.percentage}%)`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
    
    <AutomateSchoolDialog
      open={automation.showPrompt}
      onOpenChange={(open) => !open && automation.closePrompt()}
      schoolName={automation.schoolNameInput}
      onSchoolNameChange={automation.setSchoolNameInput}
      onSubmit={handleAutomationSubmit}
      isLoading={automation.isLoading}
    />
    </>
  );
}
