import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Info, ChevronRight } from "lucide-react";

export const ScoringInfoCard = () => {
  return (
    <Card className="bg-muted/30 border-muted">
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-primary/10">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 space-y-2">
            <h4 className="font-medium text-sm">How Points Work</h4>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>✓ Correct winner: <strong>10 pts</strong></li>
              <li>✓ Exact margin: <strong>+25 bonus</strong></li>
              <li>✓ Within 3 pts: <strong>+15 bonus</strong></li>
              <li>✓ Within 7 pts: <strong>+10 bonus</strong></li>
            </ul>
            <Button
              variant="link"
              size="sm"
              className="h-auto p-0 text-primary"
              asChild
            >
              <Link to="/how-scoring-works">
                Learn more <ChevronRight className="w-3 h-3 ml-1" />
              </Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
