import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

const IndicatorsChart = ({ data }) => {
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.timestamp).toLocaleDateString(),
    ma_50: item.ma_50 ? Number(item.ma_50) : null,
    ma_200: item.ma_200 ? Number(item.ma_200) : null,
    rsi: item.rsi ? Number(item.rsi) : null,
  }));

  return (
    <div className="h-[400px] w-full bg-card p-4 rounded-xl border border-border">
      <h3 className="text-foreground font-bold mb-4">Technical Indicators</h3>
      {formattedData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94A3B8" tick={{ fill: '#94A3B8' }} />
            <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8' }} yAxisId="left" />
            <YAxis stroke="#94A3B8" tick={{ fill: '#94A3B8' }} yAxisId="right" orientation="right" domain={[0, 100]} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="ma_50" name="50 DMA" stroke="#10B981" dot={false} strokeWidth={2} />
            <Line yAxisId="left" type="monotone" dataKey="ma_200" name="200 DMA" stroke="#F59E0B" dot={false} strokeWidth={2} />
            <Line yAxisId="right" type="monotone" dataKey="rsi" name="RSI (Right Axis)" stroke="#8B5CF6" dot={false} strokeWidth={1} strokeDasharray="5 5" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default IndicatorsChart;
