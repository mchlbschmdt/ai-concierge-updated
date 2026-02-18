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
    <div className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
      {/* Accent bar */}
      <div className="h-1 bg-primary" />
      
      <div className="p-5">
        <div className="flex items-start justify-between mb-3">
          {nameEdit.isEditing ? (
            <div className="flex-1 flex items-center gap-2">
              <input
                type="text"
                value={nameEdit.value}
                onChange={(e) => nameEdit.handleChange(e.target.value)}
                onKeyDown={nameEdit.handleKeyDown}
                className="flex-1 px-3 py-1.5 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                autoFocus
              />
              <button onClick={nameEdit.saveEdit} disabled={nameEdit.isSaving} className="p-1.5 text-success hover:bg-success/10 rounded-md transition-colors">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={nameEdit.cancelEdit} className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex-1 flex items-center gap-2 group">
              <h3 className="text-base font-semibold text-foreground">
                {nameEdit.value || "Unnamed Property"}
              </h3>
              <button onClick={nameEdit.startEdit} className="p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-primary transition-all" title="Edit name">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          
          {nameEdit.isSaving && <OptimisticUpdateIndicator show={true} message="Saving..." />}
          {showSuccess && <InlineSuccessBadge show={true} message="Saved!" />}
        </div>

        {nameEdit.error && <p className="text-xs text-error mb-2">{nameEdit.error}</p>}

        <p className="text-xs text-muted-foreground mb-1">
          Code: <span className="font-medium text-foreground">{property.code || "N/A"}</span>
        </p>
        
        <p className="text-sm text-foreground/80 mb-4">{property.address || "No Address"}</p>
        
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <span className="text-xs bg-muted text-muted-foreground px-2.5 py-1 rounded-full font-medium">
            {property.files?.length || 0} files
          </span>
          <Link 
            to={`/property/${property.id}`}
            className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
          >
            View Details →
          </Link>
        </div>
      </div>
    </div>
  );
}
