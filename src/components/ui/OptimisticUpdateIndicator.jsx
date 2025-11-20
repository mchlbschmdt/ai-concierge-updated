import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Small indicator showing optimistic update in progress
 */
export const OptimisticUpdateIndicator = ({ show = false, message = 'Saving...' }) => {
  if (!show) return null;

  return (
    <div className="inline-flex items-center gap-2 text-xs text-muted-foreground animate-fade-in">
      <Loader2 className="h-3 w-3 animate-spin" />
      <span>{message}</span>
    </div>
  );
};
