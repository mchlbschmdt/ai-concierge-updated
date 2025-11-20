import React, { useEffect, useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Animated success badge that appears and fades out
 */
export const InlineSuccessBadge = ({ show = false, message = 'Saved', duration = 2000 }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setVisible(true);
      const timer = setTimeout(() => {
        setVisible(false);
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration]);

  if (!visible) return null;

  return (
    <div className="inline-flex items-center gap-1.5 text-xs text-success font-medium animate-fade-in">
      <Check className="h-3.5 w-3.5" />
      <span>{message}</span>
    </div>
  );
};
