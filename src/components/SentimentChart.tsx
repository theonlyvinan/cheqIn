import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { format, subDays } from 'date-fns';

interface SentimentChartProps {
  sessions: Array<{
    timestamp: string;
    sentiment: {
      mood_rating: number;
    };
  }>;
}

const SentimentChart = ({ sessions }: SentimentChartProps) => {
  // Generate last 7 days of data
  const last7Days = Array.from({ length: 7 }, (_, i) => {
    const date = subDays(new Date(), 6 - i);
    return format(date, 'MMM dd');
  });

  // Map sessions to days
  const chartData = last7Days.map(day => {
    const daysSessions = sessions.filter(session => {
      const sessionDate = format(new Date(session.timestamp), 'MMM dd');
      return sessionDate === day;
    });

    const avgMood = daysSessions.length > 0
      ? daysSessions.reduce((sum, s) => sum + s.sentiment.mood_rating, 0) / daysSessions.length
      : null;

    return {
      day,
      mood: avgMood
    };
  });

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Your Week at a Glance</h3>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            domain={[0, 10]} 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: any) => value ? [`${value.toFixed(1)}/10`, 'Mood'] : ['No data', '']}
          />
          <Line 
            type="monotone" 
            dataKey="mood" 
            stroke="#000000" 
            strokeWidth={2}
            dot={{ fill: '#000000', r: 4 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default SentimentChart;
