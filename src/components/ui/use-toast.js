
import { useState, useCallback } from 'react';

// Simple in-memory toast state
let toastQueue = [];
let listeners = [];

const addToast = (toast) => {
  const id = Date.now() + Math.random();
  const newToast = { 
    ...toast, 
    id,
    timestamp: Date.now()
  };
  
  toastQueue = [...toastQueue, newToast];
  listeners.forEach(listener => listener(toastQueue));
  
  // Auto remove after 5 seconds
  setTimeout(() => {
    toastQueue = toastQueue.filter(t => t.id !== id);
    listeners.forEach(listener => listener(toastQueue));
  }, 5000);
};

const removeToast = (id) => {
  toastQueue = toastQueue.filter(t => t.id !== id);
  listeners.forEach(listener => listener(toastQueue));
};

export function useToast() {
  const [toasts, setToasts] = useState(toastQueue);

  const subscribe = useCallback((listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter(l => l !== listener);
    };
  }, []);

  React.useEffect(() => {
    const unsubscribe = subscribe(setToasts);
    return unsubscribe;
  }, [subscribe]);

  const toast = useCallback(({ title, description, variant = 'default' }) => {
    console.log(`Toast: ${title} - ${description} (${variant})`);
    addToast({ title, description, variant });
  }, []);

  const dismiss = useCallback((id) => {
    removeToast(id);
  }, []);

  return {
    toast,
    dismiss,
    toasts
  };
}
