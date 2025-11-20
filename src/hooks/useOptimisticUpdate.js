import { useState, useCallback, useRef } from 'react';

/**
 * Hook for managing optimistic UI updates with automatic rollback on failure
 * @param {Function} updateFn - Async function that performs the actual update
 * @returns {Object} - { optimisticUpdate, pending, error }
 */
export const useOptimisticUpdate = (updateFn) => {
  const [pending, setPending] = useState({});
  const [error, setError] = useState(null);
  const snapshotsRef = useRef({});
  const timeoutsRef = useRef({});

  const optimisticUpdate = useCallback(async (id, optimisticData, rollbackData) => {
    const transactionId = `${id}-${Date.now()}`;
    
    // Store snapshot for rollback
    snapshotsRef.current[transactionId] = rollbackData;
    
    // Mark as pending
    setPending(prev => ({ ...prev, [id]: true }));
    setError(null);

    // Set timeout for automatic failure
    timeoutsRef.current[transactionId] = setTimeout(() => {
      if (pending[id]) {
        setError(`Update timed out for ${id}`);
        setPending(prev => {
          const newPending = { ...prev };
          delete newPending[id];
          return newPending;
        });
      }
    }, 30000); // 30 second timeout

    try {
      // Perform the actual update
      await updateFn(id, optimisticData);
      
      // Clear timeout
      clearTimeout(timeoutsRef.current[transactionId]);
      
      // Remove from pending
      setPending(prev => {
        const newPending = { ...prev };
        delete newPending[id];
        return newPending;
      });
      
      // Clean up snapshot
      delete snapshotsRef.current[transactionId];
      
      return { success: true };
    } catch (err) {
      console.error('Optimistic update failed:', err);
      
      // Clear timeout
      clearTimeout(timeoutsRef.current[transactionId]);
      
      // Remove from pending
      setPending(prev => {
        const newPending = { ...prev };
        delete newPending[id];
        return newPending;
      });
      
      // Set error
      setError(err.message || 'Update failed');
      
      // Return rollback data so caller can revert
      return {
        success: false,
        error: err.message,
        rollbackData: snapshotsRef.current[transactionId]
      };
    }
  }, [updateFn, pending]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    optimisticUpdate,
    pending,
    error,
    clearError,
    isPending: (id) => !!pending[id]
  };
};
