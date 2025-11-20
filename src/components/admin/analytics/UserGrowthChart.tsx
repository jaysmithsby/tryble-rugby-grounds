import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface UserGrowthChartProps {
  data: Array<{ month: string; count: number }>;
}

export function UserGrowthChart({ data }: UserGrowthChartProps) {
  const formatMonth = (month: string) => {
    const [year, monthNum] = month.split('-');
    const date = new Date(parseInt(year), parseInt(monthNum) - 1);
    return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
  };

  const chartData = data.map(item => ({
    ...item,
    month: formatMonth(item.month),
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <LineChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis 
          dataKey="month" 
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
          dataKey="count" 
          name="New Users"
          stroke="hsl(var(--primary))" 
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}