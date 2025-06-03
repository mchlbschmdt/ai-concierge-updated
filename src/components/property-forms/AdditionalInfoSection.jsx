
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle } from "lucide-react";

export default function AdditionalInfoSection({ form, handleChange }) {
  return (
    <div className="bg-purple-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <AlertTriangle size={20} /> Additional Information
      </h2>
      
      <div className="space-y-4">
        <div>
          <label htmlFor="local_recommendations" className="block text-sm font-medium mb-1">Local Recommendations</label>
          <Textarea
            id="local_recommendations"
            name="local_recommendations"
            value={form.local_recommendations}
            onChange={handleChange}
            placeholder="Nobu Malibu (5 min drive), Malibu Pier (10 min walk), Point Dume Beach (15 min drive)"
            className="resize-y min-h-[80px]"
          />
        </div>
        
        <div>
          <label htmlFor="cleaning_instructions" className="block text-sm font-medium mb-1">Cleaning Instructions</label>
          <Textarea
            id="cleaning_instructions"
            name="cleaning_instructions"
            value={form.cleaning_instructions}
            onChange={handleChange}
            placeholder="Cleaning crew comes Fridays at 10 AM. Please strip beds and start dishwasher before checkout."
            className="resize-y min-h-[80px]"
          />
        </div>
        
        <div>
          <label htmlFor="special_notes" className="block text-sm font-medium mb-1">Special Notes</label>
          <Textarea
            id="special_notes"
            name="special_notes"
            value={form.special_notes}
            onChange={handleChange}
            placeholder="Beach chairs in garage. Tide chart on refrigerator. Watch for high tide warnings."
            className="resize-y min-h-[80px]"
          />
        </div>
        
        <div>
          <label htmlFor="knowledge_base" className="block text-sm font-medium mb-1">General Knowledge Base</label>
          <Textarea
            id="knowledge_base"
            name="knowledge_base"
            value={form.knowledge_base}
            onChange={handleChange}
            placeholder="Beautiful oceanfront property with private beach access. Recently renovated with modern amenities."
            className="resize-y min-h-[100px]"
          />
        </div>
      </div>
    </div>
  );
}
