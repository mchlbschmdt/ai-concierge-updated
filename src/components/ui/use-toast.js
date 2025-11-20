/**
 * DEPRECATED: This file is kept for backward compatibility only.
 * Please use @/context/ToastContext directly in new code.
 * 
 * This wrapper redirects to the centralized ToastContext.
 */

import { useToast as useToastContext } from '../../context/ToastContext';

export function useToast() {
  const { showToast } = useToastContext();
  
  // Provide backward-compatible toast function that matches old API
  const toast = ({ title, description, variant }) => {
    const message = description || title;
    const type = variant === 'destructive' ? 'error' : 'success';
    showToast(message, type);
  };
  
  return {
    toast,
    dismiss: () => {}, // No-op for backward compatibility
    toasts: [] // Empty array for backward compatibility
  };
}
