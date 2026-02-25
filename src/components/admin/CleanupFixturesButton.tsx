import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Trash2, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cleanupExistingDuplicates } from "@/lib/fixtureImportService";

interface CleanupFixturesButtonProps {
  onSuccess?: () => void;
}

export function CleanupFixturesButton({ onSuccess }: CleanupFixturesButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleCleanup = async () => {
    if (!confirm("Are you sure? This will permanently delete duplicate fixtures based on school pairs and date.")) {
      return;
    }

    setLoading(true);
    try {
      const removed = await cleanupExistingDuplicates();
      toast({
        title: "Cleanup Complete",
        description: removed > 0
          ? `${removed} duplicate fixture${removed === 1 ? "" : "s"} removed.`
          : "No duplicates found.",
      });
      if (removed > 0) onSuccess?.();
    } catch (error: any) {
      toast({
        title: "Cleanup Failed",
        description: error.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleCleanup} disabled={loading} className="gap-2">
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
      Cleanup Duplicates
    </Button>
  );
}
