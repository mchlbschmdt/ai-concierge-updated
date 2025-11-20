import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Edit2, X, Check } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { OptimisticUpdateIndicator } from "@/components/ui/OptimisticUpdateIndicator";
import { InlineSuccessBadge } from "@/components/ui/InlineSuccessBadge";
import { useToast } from "@/context/ToastContext";

export default function PropertyGridCard({ property, onUpdate }) {
  const { showToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);

  const nameEdit = useInlineEdit(property.property_name, async (newValue) => {
    await onUpdate(property.id, { property_name: newValue });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  });

  return (
    <div className="border border-border rounded-lg p-6 bg-card shadow-card hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between mb-3">
        {nameEdit.isEditing ? (
          <div className="flex-1 flex items-center gap-2">
            <input
              type="text"
              value={nameEdit.value}
              onChange={(e) => nameEdit.handleChange(e.target.value)}
              onKeyDown={nameEdit.handleKeyDown}
              className="flex-1 px-3 py-1.5 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <button
              onClick={nameEdit.saveEdit}
              disabled={nameEdit.isSaving}
              className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              onClick={nameEdit.cancelEdit}
              className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="flex-1 flex items-center gap-2">
            <h3 className="text-xl font-semibold text-heading">
              {nameEdit.value || "Unnamed Property"}
            </h3>
            <button
              onClick={nameEdit.startEdit}
              className="p-1 text-muted hover:text-primary transition-colors"
            >
              <Edit2 className="h-4 w-4" />
            </button>
          </div>
        )}
        
        {nameEdit.isSaving && (
          <OptimisticUpdateIndicator show={true} message="Saving..." />
        )}
        
        {showSuccess && (
          <InlineSuccessBadge show={true} message="Saved!" />
        )}
      </div>

      {nameEdit.error && (
        <p className="text-xs text-error mb-2">{nameEdit.error}</p>
      )}

      <p className="text-sm text-muted-foreground mb-1">
        Code: <span className="font-medium">{property.code || "No Code"}</span>
      </p>
      
      <p className="text-foreground mb-4">{property.address || "No Address"}</p>
      
      <div className="flex items-center justify-between">
        <span className="text-xs bg-muted text-muted-foreground px-3 py-1 rounded-full">
          {property.files?.length || 0} files
        </span>
        <Link 
          to={`/properties#${property.id}`}
          className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
        >
          View Details →
        </Link>
      </div>
    </div>
  );
}
