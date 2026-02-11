import { useState } from "react";
import {
  Shield, Trophy, Swords, Flag, Star, Zap, Target, Crown,
  Flame, Medal, Mountain, Castle, Dribbble, Users, GraduationCap,
  Goal, CheckCircle2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const ICON_OPTIONS: { id: string; icon: LucideIcon; label: string }[] = [
  { id: "shield", icon: Shield, label: "Shield" },
  { id: "trophy", icon: Trophy, label: "Trophy" },
  { id: "swords", icon: Swords, label: "Swords" },
  { id: "flag", icon: Flag, label: "Flag" },
  { id: "star", icon: Star, label: "Star" },
  { id: "zap", icon: Zap, label: "Lightning" },
  { id: "target", icon: Target, label: "Target" },
  { id: "crown", icon: Crown, label: "Crown" },
  { id: "flame", icon: Flame, label: "Flame" },
  { id: "medal", icon: Medal, label: "Medal" },
  { id: "mountain", icon: Mountain, label: "Mountain" },
  { id: "castle", icon: Castle, label: "Castle" },
  { id: "dribbble", icon: Dribbble, label: "Ball" },
  { id: "users", icon: Users, label: "Team" },
  { id: "graduation-cap", icon: GraduationCap, label: "Scholar" },
  { id: "goal", icon: Goal, label: "Goal Posts" },
];

const COLOR_OPTIONS = [
  { id: "green", value: "#10B981", label: "Green" },
  { id: "red", value: "#EF4444", label: "Red" },
  { id: "blue", value: "#3B82F6", label: "Blue" },
  { id: "gold", value: "#F59E0B", label: "Gold" },
  { id: "white", value: "#FFFFFF", label: "White" },
];

export interface ProfileIconConfig {
  iconId: string;
  colorId: string;
}

interface ProfileIconSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentConfig: ProfileIconConfig;
  onSave: (config: ProfileIconConfig) => void;
}

export function getIconComponent(iconId: string): LucideIcon {
  return ICON_OPTIONS.find((o) => o.id === iconId)?.icon ?? Shield;
}

export function getColorValue(colorId: string): string {
  return COLOR_OPTIONS.find((o) => o.id === colorId)?.value ?? "#10B981";
}

export function ProfileIconSelector({ open, onOpenChange, currentConfig, onSave }: ProfileIconSelectorProps) {
  const [selectedIcon, setSelectedIcon] = useState(currentConfig.iconId);
  const [selectedColor, setSelectedColor] = useState(currentConfig.colorId);

  const PreviewIcon = getIconComponent(selectedIcon);
  const previewColor = getColorValue(selectedColor);

  const handleSave = () => {
    onSave({ iconId: selectedIcon, colorId: selectedColor });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border/40">
        <DialogHeader>
          <DialogTitle>Customize Profile Icon</DialogTitle>
        </DialogHeader>

        {/* Live Preview */}
        <div className="flex justify-center py-4">
          <div
            className="w-24 h-24 rounded-full flex items-center justify-center border-2 transition-all duration-300"
            style={{ borderColor: previewColor, backgroundColor: `${previewColor}15` }}
          >
            <PreviewIcon className="w-12 h-12 transition-all duration-300" style={{ color: previewColor }} />
          </div>
        </div>

        {/* Icon Grid */}
        <div className="max-h-48 overflow-y-auto pr-1">
          <div className="grid grid-cols-4 gap-2">
            {ICON_OPTIONS.map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setSelectedIcon(id)}
                title={label}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 p-3 rounded-lg transition-all duration-200 hover:bg-muted/30",
                  selectedIcon === id
                    ? "ring-2 bg-muted/20"
                    : "bg-muted/5"
                )}
                style={selectedIcon === id ? { "--tw-ring-color": previewColor } as React.CSSProperties : undefined}
              >
                <Icon
                  className="w-6 h-6"
                  style={{ color: selectedIcon === id ? previewColor : "hsl(var(--muted-foreground))" }}
                />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Color Swatches */}
        <div className="flex justify-center gap-4 py-3">
          {COLOR_OPTIONS.map(({ id, value, label }) => (
            <button
              key={id}
              onClick={() => setSelectedColor(id)}
              title={label}
              className={cn(
                "w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center",
                selectedColor === id ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110"
              )}
              style={{
                backgroundColor: value,
                "--tw-ring-color": selectedColor === id ? value : undefined,
              } as React.CSSProperties}
            >
              {selectedColor === id && (
                <CheckCircle2 className="w-4 h-4" style={{ color: id === "white" ? "#000" : "#fff" }} />
              )}
            </button>
          ))}
        </div>

        <Button onClick={handleSave} className="w-full">
          Save
        </Button>
      </DialogContent>
    </Dialog>
  );
}
