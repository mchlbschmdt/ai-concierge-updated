import React from 'react';
import { AlertCircle, X } from 'lucide-react';
import { Button } from './button';

/**
 * Error alert component for forms
 * Displays error messages with optional retry action
 */
export const FormErrorAlert = ({ 
  error, 
  onDismiss = null, 
  onRetry = null,
  className = ''
}) => {
  if (!error) return null;

  return (
    <div className={`bg-destructive/10 border border-destructive/20 rounded-lg p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-destructive mb-1">Error</h3>
          <p className="text-sm text-destructive/90">{error}</p>
          {onRetry && (
            <Button
              onClick={onRetry}
              variant="outline"
              size="sm"
              className="mt-3"
            >
              Try Again
            </Button>
          )}
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="text-destructive/60 hover:text-destructive transition-colors"
            aria-label="Dismiss error"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
};
