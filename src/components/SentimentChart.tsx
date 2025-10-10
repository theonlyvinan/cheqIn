import { Card } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { format, subDays } from 'date-fns';
import { Brain, Heart, Scale } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useState } from 'react';

interface SentimentChartProps {
  sessions: Array<{
    timestamp: string;
    sentiment: {
      mood_rating?: number;
      mental_health_score?: number;
      physical_health_score?: number;
      overall_score?: number;
    };
  }>;
}

type ViewMode = 'mental' | 'physical' | 'overall';

const SentimentChart = ({ sessions }: SentimentChartProps) => {
  const [viewMode, setViewMode] = useState<ViewMode>('overall');

  const getCategoryLabel = (category: number): string => {
    const labels = ['', 'Low', 'Dim', 'Steady', 'Bright', 'Radiant'];
    return labels[category] || '';
  };

  const getCategoryIcon = (category: number) => {
    const config = [
      { emoji: '', color: '#9ca3af' },
      { emoji: '🥺', color: '#7BA3D0' }, // muted blue
      { emoji: '😕', color: '#B8B3C8' }, // lavender gray
      { emoji: '🙂', color: '#8FD6A1' }, // mint green
      { emoji: '😊', color: '#FFD75E' }, // sunny yellow
      { emoji: '🤗', color: '#FF9F6B' }  // warm coral
    ];
    const { emoji, color } = config[category] || config[0];
    return (
      <g>
        <circle cx="0" cy="0" r="8" fill={color} stroke="#fff" strokeWidth="2" />
        <text 
          x="0" 
          y="0" 
          textAnchor="middle" 
          dominantBaseline="central" 
          fontSize="10"
        >
          {emoji}
        </text>
      </g>
    );
  };

  const getViewConfig = (mode: ViewMode) => {
    switch (mode) {
      case 'mental':
        return {
          name: 'MindGlow',
          icon: Brain,
          color: '#3b82f6', // blue
          label: 'Mental Health'
        };
      case 'physical':
        return {
          name: 'BodyPulse',
          icon: Heart,
          color: '#f97316', // coral/orange
          label: 'Physical Health'
        };
      case 'overall':
        return {
          name: 'Balance',
          icon: Scale,
          color: '#fbbf24', // golden yellow
          label: 'Overall Well-Being'
        };
    }
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

    if (daysSessions.length === 0) {
      return { day, mental: null, physical: null, overall: null };
    }

    const avgMental = daysSessions.reduce((sum, s) => sum + (s.sentiment.mental_health_score || 0), 0) / daysSessions.length;
    const avgPhysical = daysSessions.reduce((sum, s) => sum + (s.sentiment.physical_health_score || 0), 0) / daysSessions.length;
    const avgOverall = daysSessions.reduce((sum, s) => sum + (s.sentiment.overall_score || 0), 0) / daysSessions.length;

    return {
      day,
      mental: avgMental || null,
      physical: avgPhysical || null,
      overall: avgOverall || null
    };
  });

  // Custom dot component with emoji styling
  const CustomDot = (props: any) => {
    const { cx, cy, payload } = props;
    const value = payload[viewMode];
    if (!value) return null;

    const getMoodEmoji = (score: number) => {
      if (score <= 1.5) return { emoji: '🥺', color: '#7BA3D0' }; // muted blue
      if (score <= 2.5) return { emoji: '😕', color: '#B8B3C8' }; // lavender gray
      if (score <= 3.5) return { emoji: '🙂', color: '#8FD6A1' }; // mint green
      if (score <= 4.5) return { emoji: '😊', color: '#FFD75E' }; // sunny yellow
      return { emoji: '🤗', color: '#FF9F6B' }; // warm coral
    };

    const { emoji, color } = getMoodEmoji(value);

    return (
      <g>
        <circle cx={cx} cy={cy} r={16} fill={color} opacity={0.2} />
        <circle cx={cx} cy={cy} r={14} fill={color} stroke="#fff" strokeWidth={2} />
        <text 
          x={cx} 
          y={cy} 
          textAnchor="middle" 
          dominantBaseline="central" 
          fontSize="16"
          style={{ userSelect: 'none' }}
        >
          {emoji}
        </text>
      </g>
    );
  };

  const config = getViewConfig(viewMode);

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Your Week at a Glance</h3>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={viewMode === 'mental' ? 'default' : 'outline'}
            onClick={() => setViewMode('mental')}
            className="gap-2"
          >
            <Brain className="w-4 h-4" />
            MindGlow
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'physical' ? 'default' : 'outline'}
            onClick={() => setViewMode('physical')}
            className="gap-2"
          >
            <Heart className="w-4 h-4" />
            BodyPulse
          </Button>
          <Button
            size="sm"
            variant={viewMode === 'overall' ? 'default' : 'outline'}
            onClick={() => setViewMode('overall')}
            className="gap-2"
          >
            <Scale className="w-4 h-4" />
            Balance
          </Button>
        </div>
      </div>
      
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData} margin={{ top: 30, right: 20, bottom: 10, left: 10 }}>
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
            width={110}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'white', 
              border: '1px solid #e5e7eb',
              borderRadius: '8px'
            }}
            formatter={(value: any) => {
              if (!value) return ['No data', ''];
              return [getCategoryLabel(Math.round(value)), config.label];
            }}
          />
          <ReferenceLine 
            y={3} 
            stroke="#9ca3af" 
            strokeWidth={1}
            strokeDasharray="5 5"
            label={{ value: 'Steady', position: 'right', fill: '#6b7280', fontSize: 11 }}
          />
          <Line 
            type="monotone" 
            dataKey={viewMode}
            stroke="#000000"
            strokeWidth={1.5}
            dot={<CustomDot />}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      
      <div className="mt-4 text-sm text-muted-foreground text-center">
        <config.icon className="w-4 h-4 inline mr-2" />
        Viewing {config.name} — {config.label}
      </div>
    </Card>
  );
};

export default SentimentChart;
