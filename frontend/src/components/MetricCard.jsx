import React from 'react';

const MetricCard = ({ title, value, icon: Icon, trend }) => {
  return (
    <div className="bg-dark-card border border-dark-bor rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm font-medium text-dark-muted mb-1">{title}</p>
          <h3 className="text-2xl font-bold text-white">{value}</h3>
          
          {trend && (
            <div className={`mt-2 flex items-center gap-1 text-sm font-medium ${trend.isPositive ? 'text-success' : 'text-danger'}`}>
              <span>{trend.isPositive ? '↑' : '↓'}</span>
              <span>{trend.value}%</span>
            </div>
          )}
        </div>
        
        {Icon && (
          <div className="p-3 bg-dark-bg rounded-xl border border-dark-bor text-primary">
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
};

export default MetricCard;
