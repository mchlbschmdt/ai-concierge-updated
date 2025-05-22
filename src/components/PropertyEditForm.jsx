
import React from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export default function PropertyEditForm({ formData, setFormData, handleUpdate, handleCancel }) {
  return (
    <div className="space-y-4">
      <Input 
        value={formData.property_name || ''} 
        onChange={(e) => setFormData({ ...formData, property_name: e.target.value })} 
        placeholder="Property Name" 
      />
      <Input 
        value={formData.address || ''} 
        onChange={(e) => setFormData({ ...formData, address: e.target.value })} 
        placeholder="Address" 
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Input 
          value={formData.check_in_time || ''} 
          onChange={(e) => setFormData({ ...formData, check_in_time: e.target.value })} 
          placeholder="Check-in Time" 
        />
        <Input 
          value={formData.check_out_time || ''} 
          onChange={(e) => setFormData({ ...formData, check_out_time: e.target.value })} 
          placeholder="Check-out Time" 
        />
      </div>
      <Input 
        value={formData.local_recommendations || ''} 
        onChange={(e) => setFormData({ ...formData, local_recommendations: e.target.value })} 
        placeholder="Local Recommendations" 
      />
      <Textarea
        value={formData.knowledge_base || ''}
        onChange={e => setFormData({ ...formData, knowledge_base: e.target.value })}
        placeholder="Knowledge Base"
        className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
      />
      <div className="flex gap-2">
        <Button onClick={handleUpdate} className="flex-1">Save</Button>
        <Button variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
      </div>
    </div>
  );
}
