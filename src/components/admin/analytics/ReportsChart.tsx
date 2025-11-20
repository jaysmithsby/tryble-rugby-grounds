import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface ReportsChartProps {
  data: Array<{ month: string; reports: number; resolved: number }>;
}

export function ReportsChart({ data }: ReportsChartProps) {
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
      <AreaChart data={chartData}>
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
        <Area 
          type="monotone" 
          dataKey="reports" 
          name="Total Reports"
          stackId="1"
          stroke="hsl(var(--primary))" 
          fill="hsl(var(--primary))"
          fillOpacity={0.6}
        />
        <Area 
          type="monotone" 
          dataKey="resolved" 
          name="Resolved"
          stackId="2"
          stroke="hsl(var(--chart-2))" 
          fill="hsl(var(--chart-2))"
          fillOpacity={0.6}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}