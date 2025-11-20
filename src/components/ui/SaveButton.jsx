import React from 'react';
import { Button } from './button';
import { Loader2, Save, Check } from 'lucide-react';

/**
 * Reusable save button with loading and success states
 */
export const SaveButton = ({ 
  loading = false,
  success = false,
  disabled = false,
  onClick,
  children = 'Save',
  loadingText = 'Saving...',
  successText = 'Saved!',
  variant = 'default',
  size = 'default',
  className = '',
  showIcon = true,
  type = 'button'
}) => {
  const getContent = () => {
    if (success) {
      return (
        <>
          {showIcon && <Check className="h-4 w-4" />}
          {successText}
        </>
      );
    }
    
    if (loading) {
      return (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          {loadingText}
        </>
      );
    }
    
    return (
      <>
        {showIcon && <Save className="h-4 w-4" />}
        {children}
      </>
    );
  };

  return (
    <Button
      type={type}
      variant={success ? 'secondary' : variant}
      size={size}
      disabled={disabled || loading || success}
      onClick={onClick}
      className={`flex items-center gap-2 transition-all ${className}`}
    >
      {getContent()}
    </Button>
  );
};
