import React from 'react';
import { Check, X, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { OptimisticUpdateIndicator } from '@/components/ui/OptimisticUpdateIndicator';
import { InlineSuccessBadge } from '@/components/ui/InlineSuccessBadge';
import { useInlineEdit } from '@/hooks/useInlineEdit';

/**
 * Reusable inline edit field component
 */
export const InlineEditField = ({ 
  label, 
  value, 
  onSave, 
  type = 'text',
  placeholder = '',
  showSuccess = false 
}) => {
  const {
    isEditing,
    value: editValue,
    isDirty,
    isSaving,
    error,
    startEdit,
    cancelEdit,
    saveEdit,
    handleChange,
    handleKeyDown
  } = useInlineEdit(value, onSave);

  if (!isEditing) {
    return (
      <div className="flex items-center justify-between group">
        <div>
          <p className="text-sm font-medium text-muted-foreground mb-1">{label}</p>
          <p className="text-base text-heading">{value || 'Not set'}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={startEdit}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        {showSuccess && <InlineSuccessBadge show={showSuccess} />}
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground mb-2 block">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <Input
          type={type}
          value={editValue}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1"
          autoFocus
        />
        <Button
          size="sm"
          onClick={saveEdit}
          disabled={!isDirty || isSaving}
          variant="default"
        >
          <Check className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={cancelEdit}
          disabled={isSaving}
          variant="ghost"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      {isSaving && <OptimisticUpdateIndicator show={true} />}
      {error && <p className="text-xs text-destructive mt-1">{error}</p>}
    </div>
  );
};
