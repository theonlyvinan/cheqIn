import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays } from 'date-fns';
import { Smile, Frown, Meh, AlertCircle, Heart } from 'lucide-react';

interface SentimentChartProps {
  sessions: Array<{
    timestamp: string;
    sentiment: {
      mood_rating: number;
    };
  }>;
}

const SentimentChart = ({ sessions }: SentimentChartProps) => {
  // Map mood rating to sentiment category
  const getMoodCategory = (moodRating: number): number => {
    if (moodRating <= 2) return 1; // Very concerned
    if (moodRating <= 4) return 2; // Concerned
    if (moodRating <= 6) return 3; // Neutral
    if (moodRating <= 8) return 4; // Positive
    return 5; // Very positive
  };

  const getCategoryLabel = (category: number): string => {
    const labels = ['', 'Very Concerned', 'Concerned', 'Neutral', 'Positive', 'Very Positive'];
    return labels[category];
  };

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
      mood: avgMood !== null ? getMoodCategory(avgMood) : null,
      rawMood: avgMood
    };
  });

  // Custom dot component with mood icons
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    if (!payload.mood) return null;

    const getMoodColor = (mood: number) => {
      if (mood === 1) return { bg: '#dc2626', emoji: '😟' };
      if (mood === 2) return { bg: '#f97316', emoji: '😕' };
      if (mood === 3) return { bg: '#6b7280', emoji: '😐' };
      if (mood === 4) return { bg: '#16a34a', emoji: '😊' };
      return { bg: '#2563eb', emoji: '😄' };
    };

    const { bg, emoji } = getMoodColor(payload.mood);

    return (
      <g>
        <circle cx={cx} cy={cy} r={18} fill={bg} stroke="#fff" strokeWidth={3} />
        <foreignObject x={cx - 12} y={cy - 12} width="24" height="24">
          <div className="flex items-center justify-center w-full h-full text-xl">
            {emoji}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Your Week at a Glance</h3>
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis 
            dataKey="day" 
            tick={{ fontSize: 12 }}
            stroke="#6b7280"
          />
          <YAxis 
            domain={[1, 5]} 
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fontSize: 11 }}
            stroke="#6b7280"
            tickFormatter={(value) => getCategoryLabel(value)}
            width={100}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: any, name: string, props: any) => {
              if (!value) return ['No data', ''];
              return [getCategoryLabel(value), 'Mood'];
            }}
          />
          <ReferenceLine 
            y={3} 
            stroke="#ef4444" 
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{ value: 'Neutral', position: 'right', fill: '#ef4444', fontSize: 12 }}
          />
          <Line 
            type="monotone" 
            dataKey="mood" 
            stroke="#000000" 
            strokeWidth={2}
            dot={<CustomDot />}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
};

export default SentimentChart;
