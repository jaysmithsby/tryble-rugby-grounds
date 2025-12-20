import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (color: string) => void;
  showAdjustments?: boolean;
  compact?: boolean;
  className?: string;
}

// Convert hex to HSL
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return { h: 0, s: 50, l: 50 };
  
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

// Convert HSL to hex
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;
  let r = 0, g = 0, b = 0;

  if (0 <= h && h < 60) { r = c; g = x; b = 0; }
  else if (60 <= h && h < 120) { r = x; g = c; b = 0; }
  else if (120 <= h && h < 180) { r = 0; g = c; b = x; }
  else if (180 <= h && h < 240) { r = 0; g = x; b = c; }
  else if (240 <= h && h < 300) { r = x; g = 0; b = c; }
  else if (300 <= h && h < 360) { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function ColorPicker({ 
  label, 
  value, 
  onChange, 
  showAdjustments = false,
  compact = false,
  className 
}: ColorPickerProps) {
  const [hsl, setHsl] = useState(() => hexToHsl(value));
  
  useEffect(() => {
    setHsl(hexToHsl(value));
  }, [value]);

  const handleHslChange = (type: "s" | "l", newValue: number) => {
    const newHsl = { ...hsl, [type]: newValue };
    setHsl(newHsl);
    onChange(hslToHex(newHsl.h, newHsl.s, newHsl.l));
  };

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 rounded border border-input cursor-pointer"
        />
        <Label className="text-xs font-medium text-muted-foreground">{label}</Label>
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <Label className="text-xs font-medium">{label}</Label>
      <div className="flex gap-2 items-center">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 rounded-md border border-input cursor-pointer"
        />
        <Input
          value={value.toUpperCase()}
          onChange={(e) => {
            const val = e.target.value;
            if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
              onChange(val);
            }
          }}
          className="flex-1 font-mono text-xs h-9"
          placeholder="#000000"
        />
      </div>
      
      {showAdjustments && (
        <div className="space-y-3 pt-2">
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Saturation</span>
              <span>{hsl.s}%</span>
            </div>
            <Slider
              value={[hsl.s]}
              min={0}
              max={100}
              step={1}
              onValueChange={([val]) => handleHslChange("s", val)}
              className="w-full"
            />
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Brightness</span>
              <span>{hsl.l}%</span>
            </div>
            <Slider
              value={[hsl.l]}
              min={0}
              max={100}
              step={1}
              onValueChange={([val]) => handleHslChange("l", val)}
              className="w-full"
            />
          </div>
        </div>
      )}
    </div>
  );
}
