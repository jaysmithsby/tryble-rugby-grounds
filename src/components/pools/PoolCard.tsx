import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Users, Trophy } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PoolCardProps {
  pool: {
    id: string;
    name: string;
    invite_code: string;
    voting_mode: boolean;
    schools: string[];
  };
  memberCount?: number;
}

export const PoolCard = ({ pool, memberCount = 0 }: PoolCardProps) => {
  const navigate = useNavigate();

  return (
    <Card className="hover:bg-muted/30 transition-colors">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{pool.name}</CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="font-mono text-xs">
                  {pool.invite_code}
                </Badge>
                {pool.voting_mode && (
                  <Badge variant="secondary" className="text-xs">
                    🗳️ Voting
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="w-4 h-4" />
          <span>{memberCount} {memberCount === 1 ? 'member' : 'members'}</span>
        </div>

        {pool.schools.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {pool.schools.slice(0, 5).map((school) => (
              <Badge key={school} variant="outline" className="text-xs">
                {school}
              </Badge>
            ))}
            {pool.schools.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{pool.schools.length - 5} more
              </Badge>
            )}
          </div>
        )}

        <Button
          variant="default"
          size="sm"
          className="w-full"
          onClick={() => navigate(`/pool/${pool.id}`)}
        >
          View Leaderboard
        </Button>
      </CardContent>
    </Card>
  );
};
