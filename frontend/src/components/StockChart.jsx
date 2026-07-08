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

const StockChart = ({ data }) => {
  // Format data for Recharts (parse dates, etc)
  const formattedData = data.map(item => ({
    ...item,
    date: new Date(item.timestamp).toLocaleDateString(),
    open_price: Number(item.open_price),
    close_price: Number(item.close_price),
    high_price: Number(item.high_price),
    low_price: Number(item.low_price),
  }));

  return (
    <div className="h-[400px] w-full bg-card p-4 rounded-xl border border-border">
      <h3 className="text-foreground font-bold mb-4">Price History</h3>
      {formattedData.length === 0 ? (
        <div className="h-full flex items-center justify-center text-muted-foreground">No data available</div>
      ) : (
        <ResponsiveContainer width="100%" height="85%">
          <LineChart data={formattedData} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
            <XAxis dataKey="date" stroke="#94A3B8" tick={{ fill: '#94A3B8' }} />
            <YAxis domain={['auto', 'auto']} stroke="#94A3B8" tick={{ fill: '#94A3B8' }} tickFormatter={(value) => `₹${value}`} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#1E293B', borderColor: '#334155', color: '#F8FAFC' }}
              itemStyle={{ color: '#F8FAFC' }}
            />
            <Legend />
            <Line type="monotone" dataKey="close_price" name="Close Price" stroke="#2563EB" strokeWidth={2} dot={false} activeDot={{ r: 8 }} />
            <Line type="monotone" dataKey="open_price" name="Open Price" stroke="#94A3B8" strokeWidth={1} dot={false} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default StockChart;
