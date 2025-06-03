
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { Phone } from "lucide-react";

export default function EmergencyContactSection({ form, handleChange }) {
  return (
    <div className="bg-red-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Phone size={20} /> Emergency & Contact Information
      </h2>
      <div>
        <label htmlFor="emergency_contact" className="block text-sm font-medium mb-1">Emergency Contact</label>
        <Textarea
          id="emergency_contact"
          name="emergency_contact"
          value={form.emergency_contact}
          onChange={handleChange}
          placeholder="Property Manager: Sarah Johnson - (555) 123-4567. Emergency: 911."
          className="resize-y min-h-[80px]"
        />
      </div>
    </div>
  );
}
