export type BoxWhiskerStats = {
  min: number;
  max: number;
  q1: number;
  median: number;
  q3: number;
  userValue: number | null;
  maxValue: number;
};

export function computeBoxWhisker(values: number[], userVal: number | null): BoxWhiskerStats | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    max: sorted[sorted.length - 1],
    q1: sorted[Math.floor(sorted.length * 0.25)],
    median: sorted[Math.floor(sorted.length * 0.5)],
    q3: sorted[Math.floor(sorted.length * 0.75)],
    userValue: userVal,
    maxValue: sorted[sorted.length - 1],
  };
}

export function BoxWhiskerChart({ stats }: { stats: BoxWhiskerStats }) {
  const scale = stats.maxValue > 0 ? stats.maxValue : 1;
  const toPos = (val: number) => 20 + (val / scale) * 360;

  return (
    <div className="rounded-lg border border-border bg-muted/30 p-4">
      <h3 className="text-xs font-semibold text-muted-foreground">Points Efficiency Distribution</h3>
      <p className="text-[10px] text-muted-foreground/70 mb-3">
        Avg brags earned per pick. Higher = precise winner and margin picks.
      </p>
      <svg viewBox="0 0 400 60" className="w-full h-[60px]" preserveAspectRatio="xMidYMid meet">
        {/* Background track */}
        <rect x="20" y="22" width="360" height="16" rx="8" fill="hsl(var(--muted))" />

        {/* Whisker line: min to max */}
        <line x1={toPos(stats.min)} x2={toPos(stats.max)} y1="30" y2="30" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />

        {/* Min cap */}
        <line x1={toPos(stats.min)} x2={toPos(stats.min)} y1="24" y2="36" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />

        {/* Max cap */}
        <line x1={toPos(stats.max)} x2={toPos(stats.max)} y1="24" y2="36" stroke="hsl(var(--muted-foreground))" strokeWidth="1.5" />

        {/* IQR box */}
        <rect
          x={toPos(stats.q1)}
          y="20"
          width={toPos(stats.q3) - toPos(stats.q1)}
          height="20"
          rx="3"
          fill="hsl(var(--primary) / 0.2)"
          stroke="hsl(var(--primary))"
          strokeWidth="1.5"
        />

        {/* Median line */}
        <line x1={toPos(stats.median)} x2={toPos(stats.median)} y1="18" y2="42" stroke="hsl(var(--primary))" strokeWidth="2" />

        {/* User marker (triangle) */}
        {stats.userValue !== null && (
          <polygon
            points={`${toPos(stats.userValue)},14 ${toPos(stats.userValue) - 5},6 ${toPos(stats.userValue) + 5},6`}
            fill="hsl(var(--accent-foreground))"
          />
        )}

        {/* Labels */}
        <text x={toPos(stats.min)} y="54" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{stats.min.toFixed(1)}</text>
        <text x={toPos(stats.max)} y="54" textAnchor="middle" fontSize="9" fill="hsl(var(--muted-foreground))">{stats.max.toFixed(1)}</text>
        {stats.userValue !== null && (
          <text x={toPos(stats.userValue)} y="4" textAnchor="middle" fontSize="8" fontWeight="bold" fill="hsl(var(--accent-foreground))">You</text>
        )}
      </svg>
      <div className="flex justify-between text-[10px] text-muted-foreground mt-1 px-1">
        <span>Min</span>
        <span>Q1: {stats.q1.toFixed(1)} pts</span>
        <span>Median: {stats.median.toFixed(1)} pts</span>
        <span>Q3: {stats.q3.toFixed(1)} pts</span>
        <span>Max</span>
      </div>
    </div>
  );
}
