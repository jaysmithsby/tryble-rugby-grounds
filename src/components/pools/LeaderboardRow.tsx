import { ReactNode } from "react";
import { Users, Trophy } from "lucide-react";

interface LeaderboardRowProps {
  icon: ReactNode;
  name: string;
  memberCount: number;
  userRank: number | null;
  onClick: () => void;
}

export const LeaderboardRow = ({ icon, name, memberCount, userRank, onClick }: LeaderboardRowProps) => {
  return (
    <div
      className="-mx-4 px-4 flex items-center justify-between py-3 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={onClick}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10">
          {icon}
        </div>
        <span className="text-sm font-medium truncate">{name}</span>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{memberCount.toLocaleString()}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground w-8 justify-end">
          <Trophy className="w-3 h-3" />
          <span>{userRank ? `#${userRank}` : "--"}</span>
        </div>
      </div>
    </div>
  );
};
