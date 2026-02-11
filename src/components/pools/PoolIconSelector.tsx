import { useState } from "react";
import {
  Shield, Trophy, Swords, Flag, Star, Zap, Target, Crown,
  Flame, Medal, Mountain, Castle, Users, GraduationCap,
  Anchor, BookOpen, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const POOL_ICON_OPTIONS: { id: string; icon: LucideIcon; label: string }[] = [
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
  { id: "users", icon: Users, label: "Team" },
  { id: "graduation-cap", icon: GraduationCap, label: "Scholar" },
  { id: "anchor", icon: Anchor, label: "Anchor" },
  { id: "book-open", icon: BookOpen, label: "Book" },
];

const POOL_COLOR_OPTIONS = [
  { id: "green", value: "#10B981", label: "Green" },
  { id: "red", value: "#EF4444", label: "Red" },
  { id: "blue", value: "#3B82F6", label: "Blue" },
  { id: "gold", value: "#F59E0B", label: "Gold" },
  { id: "white", value: "#FFFFFF", label: "White" },
];

export interface PoolIconConfig {
  iconId: string;
  colorId: string;
}

export function getPoolIconComponent(iconId: string): LucideIcon {
  return POOL_ICON_OPTIONS.find((o) => o.id === iconId)?.icon ?? Trophy;
}

export function getPoolColorValue(colorId: string): string {
  return POOL_COLOR_OPTIONS.find((o) => o.id === colorId)?.value ?? "#10B981";
}

interface PoolIconSelectorProps {
  config: PoolIconConfig;
  onChange: (config: PoolIconConfig) => void;
}

export function PoolIconSelector({ config, onChange }: PoolIconSelectorProps) {
  const PreviewIcon = getPoolIconComponent(config.iconId);
  const previewColor = getPoolColorValue(config.colorId);

  return (
    <div className="space-y-4">
      {/* Live Preview */}
      <div className="flex justify-center py-3">
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center border-2 transition-all duration-300"
          style={{ borderColor: previewColor, backgroundColor: `${previewColor}15` }}
        >
          <PreviewIcon className="w-8 h-8 transition-all duration-300" style={{ color: previewColor }} />
        </div>
      </div>

      {/* Icon Grid */}
      <div className="max-h-40 overflow-y-auto pr-1">
        <div className="grid grid-cols-4 gap-2">
          {POOL_ICON_OPTIONS.map(({ id, icon: Icon, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => onChange({ ...config, iconId: id })}
              title={label}
              className={cn(
                "flex flex-col items-center justify-center gap-1 p-2.5 rounded-lg transition-all duration-200 hover:bg-muted/30",
                config.iconId === id ? "ring-2 bg-muted/20" : "bg-muted/5"
              )}
              style={config.iconId === id ? { "--tw-ring-color": previewColor } as React.CSSProperties : undefined}
            >
              <Icon
                className="w-5 h-5"
                style={{ color: config.iconId === id ? previewColor : "hsl(var(--muted-foreground))" }}
              />
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Color Swatches */}
      <div className="flex justify-center gap-4 py-2">
        {POOL_COLOR_OPTIONS.map(({ id, value, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange({ ...config, colorId: id })}
            title={label}
            className={cn(
              "w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center",
              config.colorId === id ? "ring-2 ring-offset-2 ring-offset-background" : "hover:scale-110"
            )}
            style={{
              backgroundColor: value,
              "--tw-ring-color": config.colorId === id ? value : undefined,
            } as React.CSSProperties}
          >
            {config.colorId === id && (
              <CheckCircle2 className="w-4 h-4" style={{ color: id === "white" ? "#000" : "#fff" }} />
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
