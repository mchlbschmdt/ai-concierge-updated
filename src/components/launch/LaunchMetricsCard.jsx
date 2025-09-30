import React from 'react';
import { Card } from '@/components/ui/card';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

export const LaunchMetricsCard = ({ title, value, subtitle, change, icon: Icon }) => {
  const getTrendIcon = () => {
    if (!change) return <Minus className="w-4 h-4 text-gray-400" />;
    if (change > 0) return <ArrowUp className="w-4 h-4 text-success" />;
    return <ArrowDown className="w-4 h-4 text-error" />;
  };

  const getTrendColor = () => {
    if (!change) return 'text-gray-400';
    return change > 0 ? 'text-success' : 'text-error';
  };

  return (
    <Card className="p-6 bg-card shadow-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-3xl font-bold text-heading mt-2">{value}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {Icon && (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="w-6 h-6 text-primary" />
          </div>
        )}
      </div>
      {change !== undefined && (
        <div className={`flex items-center gap-1 mt-3 text-sm font-medium ${getTrendColor()}`}>
          {getTrendIcon()}
          <span>{Math.abs(change)}% vs benchmark</span>
        </div>
      )}
    </Card>
  );
};