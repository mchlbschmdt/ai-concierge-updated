import React from 'react';
import { Loader2 } from 'lucide-react';

/**
 * Loading overlay component for forms
 * Displays a semi-transparent overlay with loading spinner and message
 */
export const FormLoadingOverlay = ({ message = 'Loading...', show = false }) => {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-lg">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm font-medium text-foreground">{message}</p>
      </div>
    </div>
  );
};
