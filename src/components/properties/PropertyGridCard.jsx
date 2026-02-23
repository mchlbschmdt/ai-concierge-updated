
import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Edit2, X, Check, MessageSquare, Wifi } from "lucide-react";
import { useInlineEdit } from "@/hooks/useInlineEdit";
import { OptimisticUpdateIndicator } from "@/components/ui/OptimisticUpdateIndicator";
import { InlineSuccessBadge } from "@/components/ui/InlineSuccessBadge";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/integrations/supabase/client";

export default function PropertyGridCard({ property, onUpdate }) {
  const { showToast } = useToast();
  const [showSuccess, setShowSuccess] = useState(false);
  const [responsesThisMonth, setResponsesThisMonth] = useState(null);

  const nameEdit = useInlineEdit(property.property_name, async (newValue) => {
    await onUpdate(property.id, { property_name: newValue });
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 2000);
  });

  useEffect(() => {
    const fetchResponseCount = async () => {
      try {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        
        // Get conversations for this property code
        const { data: convos } = await supabase
          .from("sms_conversations")
          .select("id")
          .eq("property_id", property.code);

        if (!convos || convos.length === 0) {
          setResponsesThisMonth(0);
          return;
        }

        const convoIds = convos.map(c => c.id);
        const { count } = await supabase
          .from("sms_conversation_messages")
          .select("*", { count: "exact", head: true })
          .in("sms_conversation_id", convoIds)
          .eq("role", "assistant")
          .gte("timestamp", startOfMonth);

        setResponsesThisMonth(count || 0);
      } catch {
        setResponsesThisMonth(0);
      }
    };
    if (property.code) fetchResponseCount();
  }, [property.code]);

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
        
        <p className="text-sm text-foreground/80 mb-2">{property.address || "No Address"}</p>

        {/* SMS status & response count */}
        <div className="flex items-center gap-2 mb-4">
          <Badge variant="secondary" className="text-[10px] gap-1">
            <Wifi className="h-3 w-3" />
            SMS Ready
          </Badge>
          {responsesThisMonth !== null && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <MessageSquare className="h-3 w-3" />
              {responsesThisMonth} responses this month
            </span>
          )}
        </div>
        
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
