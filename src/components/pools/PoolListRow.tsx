import { useNavigate } from "react-router-dom";
import { Users, Trophy } from "lucide-react";
import { getPoolIconComponent, getPoolColorValue } from "./PoolIconSelector";

interface PoolListRowProps {
  pool: {
    id: string;
    name: string;
    icon_id?: string | null;
    color_id?: string | null;
  };
  memberCount: number;
  userRank?: number | null;
}

export const PoolListRow = ({ pool, memberCount, userRank }: PoolListRowProps) => {
  const navigate = useNavigate();
  const PoolIcon = getPoolIconComponent(pool.icon_id || "trophy");
  const poolColor = getPoolColorValue(pool.color_id || "green");

  return (
    <div
      className="-mx-4 px-4 flex items-center justify-between py-3 hover:bg-muted/50 cursor-pointer transition-colors"
      onClick={() => navigate(`/pool/${pool.id}`)}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: `${poolColor}15` }}
        >
          <PoolIcon className="w-4 h-4" style={{ color: poolColor }} />
        </div>
        <span className="text-sm font-medium truncate">{pool.name}</span>
      </div>

      <div className="flex items-center gap-5 shrink-0">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Users className="w-3 h-3" />
          <span>{memberCount}</span>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground w-8 justify-end">
          <Trophy className="w-3 h-3" />
          <span>{userRank ?? "--"}</span>
        </div>
      </div>
    </div>
  );
};
