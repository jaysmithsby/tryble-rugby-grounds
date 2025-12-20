import { useState, useEffect } from "react";
import { Shirt, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { 
  JerseyConfig, 
  JerseyLayout, 
  CollarStyle,
  DEFAULT_JERSEY_CONFIG, 
  LAYOUT_OPTIONS,
  COLLAR_OPTIONS 
} from "./types";
import { JerseyPreview } from "./JerseyPreview";
import { ColorPicker } from "./ColorPicker";
import { StripeEditor } from "./StripeEditor";
import { SleeveBandEditor } from "./SleeveBandEditor";
import { cn } from "@/lib/utils";

interface JerseyDesignerProps {
  value: JerseyConfig | null;
  onChange: (config: JerseyConfig) => void;
  primaryColor?: string;
  secondaryColor?: string;
}

export function JerseyDesigner({ 
  value, 
  onChange,
  primaryColor,
  secondaryColor,
}: JerseyDesignerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<JerseyConfig>(() => {
    if (value) {
      // Ensure sleeveBands exists for legacy configs
      return {
        ...value,
        sleeveBands: value.sleeveBands || (value.sleeveTrimColor ? [{ color: value.sleeveTrimColor, order: 0 }] : []),
      };
    }
    return {
      ...DEFAULT_JERSEY_CONFIG,
      baseColor: primaryColor || DEFAULT_JERSEY_CONFIG.baseColor,
      sleeveTrimColor: secondaryColor || DEFAULT_JERSEY_CONFIG.sleeveTrimColor,
      sleeveBands: secondaryColor ? [{ color: secondaryColor, order: 0 }] : DEFAULT_JERSEY_CONFIG.sleeveBands,
    };
  });

  // Sync with external value changes
  useEffect(() => {
    if (value) {
      setConfig({
        ...value,
        sleeveBands: value.sleeveBands || (value.sleeveTrimColor ? [{ color: value.sleeveTrimColor, order: 0 }] : []),
      });
    }
  }, [value]);

  // Sync with primary/secondary color changes when no custom config exists
  useEffect(() => {
    if (!value && (primaryColor || secondaryColor)) {
      setConfig(prev => ({
        ...prev,
        baseColor: primaryColor || prev.baseColor,
        sleeveTrimColor: secondaryColor || prev.sleeveTrimColor,
        sleeveBands: secondaryColor ? [{ color: secondaryColor, order: 0 }] : prev.sleeveBands,
      }));
    }
  }, [primaryColor, secondaryColor, value]);

  const updateConfig = (updates: Partial<JerseyConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    onChange(newConfig);
  };

  const handleLayoutChange = (layout: JerseyLayout) => {
    // Clear stripes when switching to solid
    if (layout === "solid") {
      updateConfig({ layout, stripes: [] });
    } else {
      // Add default stripe when switching to stripes layout
      if (config.stripes.length === 0) {
        updateConfig({ 
          layout, 
          stripes: [{ color: "#ffffff", order: 0 }] 
        });
      } else {
        updateConfig({ layout });
      }
    }
  };

  const handleCollarChange = (collarStyle: CollarStyle) => {
    updateConfig({ collarStyle });
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      ...DEFAULT_JERSEY_CONFIG,
      baseColor: primaryColor || DEFAULT_JERSEY_CONFIG.baseColor,
      sleeveTrimColor: secondaryColor || DEFAULT_JERSEY_CONFIG.sleeveTrimColor,
      sleeveBands: secondaryColor ? [{ color: secondaryColor, order: 0 }] : DEFAULT_JERSEY_CONFIG.sleeveBands,
    };
    setConfig(defaultConfig);
    onChange(defaultConfig);
  };

  return (
    <div className="border border-border/50 rounded-lg bg-muted/20">
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            className="w-full flex items-center justify-between p-4 h-auto"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Shirt className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <span className="font-medium text-sm">Design Jersey Icon</span>
                <p className="text-xs text-muted-foreground">
                  Create a custom jersey design instead of uploading an image
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Mini preview */}
              <JerseyPreview config={config} size="sm" />
              {isOpen ? (
                <ChevronUp className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </Button>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <div className="px-4 pb-4 space-y-6">
            {/* Divider */}
            <div className="border-t border-border/50" />
            
            <div className="grid grid-cols-2 gap-6">
              {/* Left side: Controls */}
              <div className="space-y-5">
                {/* Layout Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Layout Type</Label>
                  <RadioGroup
                    value={config.layout}
                    onValueChange={(val) => handleLayoutChange(val as JerseyLayout)}
                    className="grid grid-cols-1 gap-2"
                  >
                    {LAYOUT_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          config.layout === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border"
                        )}
                      >
                        <RadioGroupItem value={option.value} id={`layout-${option.value}`} />
                        <Label 
                          htmlFor={`layout-${option.value}`} 
                          className="cursor-pointer text-sm flex-1"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Collar Style Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-medium">Collar Style</Label>
                  <RadioGroup
                    value={config.collarStyle || "polo"}
                    onValueChange={(val) => handleCollarChange(val as CollarStyle)}
                    className="grid grid-cols-2 gap-2"
                  >
                    {COLLAR_OPTIONS.map((option) => (
                      <div
                        key={option.value}
                        className={cn(
                          "flex items-center space-x-2 p-2 rounded-lg border cursor-pointer transition-colors",
                          (config.collarStyle || "polo") === option.value
                            ? "border-primary bg-primary/5"
                            : "border-border/50 hover:border-border"
                        )}
                      >
                        <RadioGroupItem value={option.value} id={`collar-${option.value}`} />
                        <Label 
                          htmlFor={`collar-${option.value}`} 
                          className="cursor-pointer text-sm flex-1"
                        >
                          {option.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>

                {/* Stripe Editor - only show if stripes layout selected */}
                {config.layout !== "solid" && (
                  <StripeEditor
                    stripes={config.stripes}
                    onChange={(stripes) => updateConfig({ stripes })}
                  />
                )}

                {/* Color Customization */}
                <div className="space-y-3">
                  <Label className="text-xs font-semibold text-foreground">Colors</Label>
                  
                  <ColorPicker
                    label="Base Jersey Color"
                    value={config.baseColor}
                    onChange={(baseColor) => updateConfig({ baseColor })}
                    showAdjustments
                  />
                  
                  <ColorPicker
                    label="Collar Color"
                    value={config.collarColor}
                    onChange={(collarColor) => updateConfig({ collarColor })}
                  />
                </div>

                {/* Sleeve Bands Editor */}
                <SleeveBandEditor
                  sleeveBands={config.sleeveBands || []}
                  onChange={(sleeveBands) => updateConfig({ sleeveBands })}
                  maxBands={3}
                />
              </div>
              
              {/* Right side: Live Preview */}
              <div className="flex flex-col items-center justify-start gap-4">
                <Label className="text-xs font-medium text-muted-foreground">
                  Live Preview
                </Label>
                <JerseyPreview config={config} size="xl" />
                
                <div className="text-center space-y-2">
                  <p className="text-xs text-muted-foreground">
                    This design will be used as the school's jersey icon
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetToDefaults}
                    className="text-xs"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}
