import { useState, useCallback } from 'react';

/**
 * Reusable hook for managing form state with loading, errors, and validation
 * 
 * @param {Function} onSubmit - The async function to call when form is submitted
 * @param {Object} options - Configuration options
 * @returns {Object} Form state and handlers
 */
export const useFormState = (onSubmit, options = {}) => {
  const {
    validateBeforeSubmit = null,
    onSuccess = null,
    onError = null,
    resetOnSuccess = false
  } = options;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const setFieldError = useCallback((field, message) => {
    setFieldErrors(prev => ({
      ...prev,
      [field]: message
    }));
  }, []);

  const clearFieldError = useCallback((field) => {
    setFieldErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setFieldErrors({});
    setSuccess(false);
  }, []);

  const handleSubmit = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      setFieldErrors({});
      setSuccess(false);

      // Run validation if provided
      if (validateBeforeSubmit) {
        const validationResult = await validateBeforeSubmit(...args);
        if (validationResult && !validationResult.isValid) {
          if (validationResult.errors) {
            setFieldErrors(validationResult.errors);
          }
          if (validationResult.message) {
            setError(validationResult.message);
          }
          return { success: false, errors: validationResult };
        }
      }

      // Execute the submit function
      const result = await onSubmit(...args);
      
      setSuccess(true);
      
      // Reset state if configured
      if (resetOnSuccess) {
        setTimeout(() => {
          clearErrors();
        }, 2000);
      }

      // Call success callback
      if (onSuccess) {
        onSuccess(result);
      }

      return { success: true, data: result };
    } catch (err) {
      console.error('Form submission error:', err);
      const errorMessage = err.message || 'An error occurred';
      setError(errorMessage);

      // Call error callback
      if (onError) {
        onError(err);
      }

      return { success: false, error: err };
    } finally {
      setLoading(false);
    }
  }, [onSubmit, validateBeforeSubmit, onSuccess, onError, resetOnSuccess, clearErrors]);

  return {
    loading,
    error,
    fieldErrors,
    success,
    setLoading,
    setError,
    setFieldError,
    clearFieldError,
    clearErrors,
    handleSubmit
  };
};
