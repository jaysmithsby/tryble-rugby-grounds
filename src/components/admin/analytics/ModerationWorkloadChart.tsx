import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { format } from 'date-fns';

interface ModerationWorkloadChartProps {
  data: Array<{ date: string; actions: number }>;
}

export function ModerationWorkloadChart({ data }: ModerationWorkloadChartProps) {
  const formatDate = (date: string) => {
    return format(new Date(date), 'MMM dd');
  };

  const chartData = data.map(item => ({
    ...item,
    date: formatDate(item.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="date" 
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <YAxis 
          className="text-xs"
          stroke="hsl(var(--muted-foreground))"
        />
        <Tooltip 
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="actions" 
          name="Admin Actions"
          stroke="hsl(var(--chart-3))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--chart-3))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}