
import React from 'react';
import { Input } from "@/components/ui/input";
import { Home } from "lucide-react";

export default function BasicInfoSection({ form, handleChange }) {
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Home size={20} /> Basic Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="property_name" className="block text-sm font-medium mb-1">Property Name *</label>
          <Input 
            id="property_name"
            name="property_name" 
            value={form.property_name} 
            onChange={handleChange} 
            placeholder="Beach House Paradise" 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-1">Unique Code</label>
          <Input 
            id="code"
            name="code" 
            value={form.code} 
            onChange={handleChange} 
            placeholder="BHP-001 (auto-generated if empty)" 
          />
        </div>
      </div>
      
      <div className="mt-4">
        <label htmlFor="address" className="block text-sm font-medium mb-1">Address *</label>
        <Input 
          id="address"
          name="address" 
          value={form.address} 
          onChange={handleChange} 
          placeholder="123 Ocean Drive, Malibu, CA 90265" 
          required 
        />
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div>
          <label htmlFor="check_in_time" className="block text-sm font-medium mb-1">Check-in Time</label>
          <Input 
            id="check_in_time"
            name="check_in_time" 
            value={form.check_in_time} 
            onChange={handleChange} 
            placeholder="4:00 PM"
          />
        </div>
        <div>
          <label htmlFor="check_out_time" className="block text-sm font-medium mb-1">Check-out Time</label>
          <Input 
            id="check_out_time"
            name="check_out_time" 
            value={form.check_out_time} 
            onChange={handleChange} 
            placeholder="11:00 AM"
          />
        </div>
      </div>
    </div>
  );
}
