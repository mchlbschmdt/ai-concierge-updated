import { useState, useCallback, useEffect } from 'react';

/**
 * Hook for managing inline edit mode with auto-save and cancel support
 * @param {*} initialValue - Initial value of the field
 * @param {Function} onSave - Callback when save is triggered
 * @returns {Object} - Edit state and handlers
 */
export const useInlineEdit = (initialValue, onSave) => {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);

  // Update value when initialValue changes
  useEffect(() => {
    if (!isEditing) {
      setValue(initialValue);
      setIsDirty(false);
    }
  }, [initialValue, isEditing]);

  const startEdit = useCallback(() => {
    setIsEditing(true);
    setError(null);
  }, []);

  const cancelEdit = useCallback(() => {
    setValue(initialValue);
    setIsEditing(false);
    setIsDirty(false);
    setError(null);
  }, [initialValue]);

  const handleChange = useCallback((newValue) => {
    setValue(newValue);
    setIsDirty(newValue !== initialValue);
  }, [initialValue]);

  const saveEdit = useCallback(async () => {
    if (!isDirty) {
      setIsEditing(false);
      return { success: true };
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave(value);
      setIsEditing(false);
      setIsDirty(false);
      setIsSaving(false);
      return { success: true };
    } catch (err) {
      setError(err.message || 'Failed to save');
      setIsSaving(false);
      return { success: false, error: err.message };
    }
  }, [isDirty, value, onSave]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      saveEdit();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      cancelEdit();
    }
  }, [saveEdit, cancelEdit]);

  return {
    isEditing,
    value,
    isDirty,
    isSaving,
    error,
    startEdit,
    cancelEdit,
    saveEdit,
    handleChange,
    handleKeyDown
  };
};
