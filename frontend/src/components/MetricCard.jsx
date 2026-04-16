import React from 'react';

const MetricCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-foreground">{value}</h3>

          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-green-500' : 'text-destructive'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}%</span>
            </div>
          )}
        </div>

        {Icon && (
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20 text-primary">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
