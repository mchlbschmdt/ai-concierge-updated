import React from 'react';
import { AlertCircle } from 'lucide-react';

/**
 * Inline field error component
 * Displays validation errors below form fields
 */
export const FieldError = ({ error, className = '' }) => {
  if (!error) return null;

  return (
    <div className={`flex items-center gap-1.5 mt-1.5 ${className}`}>
      <AlertCircle className="h-3.5 w-3.5 text-destructive flex-shrink-0" />
      <p className="text-xs text-destructive">{error}</p>
    </div>
  );
};
