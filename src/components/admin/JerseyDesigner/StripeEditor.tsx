import { Plus, Trash2, GripVertical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { StripeConfig } from "./types";
import { ColorPicker } from "./ColorPicker";
import { cn } from "@/lib/utils";

interface StripeEditorProps {
  stripes: StripeConfig[];
  onChange: (stripes: StripeConfig[]) => void;
  maxStripes?: number;
}

const DEFAULT_STRIPE_COLORS = ["#ffffff", "#c9a227", "#ff0000"];

export function StripeEditor({ 
  stripes, 
  onChange, 
  maxStripes = 3 
}: StripeEditorProps) {
  
  const addStripe = () => {
    if (stripes.length >= maxStripes) return;
    
    const newOrder = stripes.length;
    const defaultColor = DEFAULT_STRIPE_COLORS[newOrder] || "#ffffff";
    
    onChange([...stripes, { color: defaultColor, order: newOrder }]);
  };

  const removeStripe = (index: number) => {
    const newStripes = stripes
      .filter((_, i) => i !== index)
      .map((s, i) => ({ ...s, order: i }));
    onChange(newStripes);
  };

  const updateStripeColor = (index: number, color: string) => {
    const newStripes = stripes.map((s, i) => 
      i === index ? { ...s, color } : s
    );
    onChange(newStripes);
  };

  const moveStripe = (fromIndex: number, direction: "up" | "down") => {
    const toIndex = direction === "up" ? fromIndex - 1 : fromIndex + 1;
    if (toIndex < 0 || toIndex >= stripes.length) return;
    
    const newStripes = [...stripes];
    [newStripes[fromIndex], newStripes[toIndex]] = [newStripes[toIndex], newStripes[fromIndex]];
    
    // Update order values
    onChange(newStripes.map((s, i) => ({ ...s, order: i })));
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-medium">Stripes ({stripes.length}/{maxStripes})</Label>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={addStripe}
          disabled={stripes.length >= maxStripes}
          className="h-7 text-xs gap-1"
        >
          <Plus className="h-3 w-3" />
          Add Stripe
        </Button>
      </div>
      
      {stripes.length === 0 ? (
        <p className="text-xs text-muted-foreground italic py-2">
          No stripes added. Click "Add Stripe" to customize.
        </p>
      ) : (
        <div className="space-y-2">
          {stripes.map((stripe, index) => (
            <div 
              key={index}
              className={cn(
                "flex items-center gap-2 p-2 rounded-lg border border-border/50",
                "bg-muted/30 group"
              )}
            >
              {/* Reorder controls */}
              <div className="flex flex-col gap-0.5">
                <button
                  type="button"
                  onClick={() => moveStripe(index, "up")}
                  disabled={index === 0}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                >
                  <GripVertical className="h-3 w-3 rotate-90" />
                </button>
                <button
                  type="button"
                  onClick={() => moveStripe(index, "down")}
                  disabled={index === stripes.length - 1}
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30 disabled:cursor-not-allowed p-0.5"
                >
                  <GripVertical className="h-3 w-3 -rotate-90" />
                </button>
              </div>
              
              {/* Stripe number */}
              <span className="text-xs text-muted-foreground w-6">#{index + 1}</span>
              
              {/* Color picker */}
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={stripe.color}
                    onChange={(e) => updateStripeColor(index, e.target.value)}
                    className="h-7 w-10 rounded border border-input cursor-pointer"
                  />
                  <span className="text-xs font-mono text-muted-foreground">
                    {stripe.color.toUpperCase()}
                  </span>
                </div>
              </div>
              
              {/* Delete button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeStripe(index)}
                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
