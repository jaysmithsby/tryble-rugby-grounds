import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { ColorPicker } from "./ColorPicker";
import { SleeveBandConfig } from "./types";

interface SleeveBandEditorProps {
  sleeveBands: SleeveBandConfig[];
  onChange: (sleeveBands: SleeveBandConfig[]) => void;
  maxBands?: number;
}

export function SleeveBandEditor({ 
  sleeveBands, 
  onChange, 
  maxBands = 3 
}: SleeveBandEditorProps) {
  const sortedBands = [...sleeveBands].sort((a, b) => a.order - b.order);

  const addBand = () => {
    if (sleeveBands.length >= maxBands) return;
    const newBand: SleeveBandConfig = {
      color: "#ffffff",
      order: sleeveBands.length,
    };
    onChange([...sleeveBands, newBand]);
  };

  const removeBand = (index: number) => {
    const newBands = sortedBands.filter((_, i) => i !== index);
    // Reorder remaining bands
    const reorderedBands = newBands.map((band, i) => ({
      ...band,
      order: i,
    }));
    onChange(reorderedBands);
  };

  const updateBandColor = (index: number, color: string) => {
    const newBands = sortedBands.map((band, i) =>
      i === index ? { ...band, color } : band
    );
    onChange(newBands);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold text-foreground">
          Sleeve Bands ({sleeveBands.length}/{maxBands})
        </Label>
        {sleeveBands.length < maxBands && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addBand}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3 w-3" />
            Add Band
          </Button>
        )}
      </div>

      {sleeveBands.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">
          No sleeve bands. Click "Add Band" to add up to {maxBands} bands.
        </p>
      ) : (
        <div className="space-y-2">
          {sortedBands.map((band, index) => (
            <div
              key={index}
              className="flex items-center gap-2 p-2 rounded-lg border border-border/50 bg-background/50"
            >
              <div className="flex-1">
                <ColorPicker
                  label={`Band ${index + 1}`}
                  value={band.color}
                  onChange={(color) => updateBandColor(index, color)}
                  compact
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeBand(index)}
                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Bands are rendered from top to bottom on the sleeve edge.
      </p>
    </div>
  );
}
