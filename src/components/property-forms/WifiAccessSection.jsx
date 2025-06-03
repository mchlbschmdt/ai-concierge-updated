
import React from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wifi, Key } from "lucide-react";

export default function WifiAccessSection({ form, handleChange }) {
  return (
    <div className="bg-blue-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <Wifi size={20} /> WiFi & Access Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="wifi_name" className="block text-sm font-medium mb-1">WiFi Network Name</label>
          <Input 
            id="wifi_name"
            name="wifi_name" 
            value={form.wifi_name} 
            onChange={handleChange} 
            placeholder="BeachHouse_Guest" 
          />
        </div>
        <div>
          <label htmlFor="wifi_password" className="block text-sm font-medium mb-1">WiFi Password</label>
          <Input 
            id="wifi_password"
            name="wifi_password" 
            value={form.wifi_password} 
            onChange={handleChange} 
            placeholder="Ocean2024!" 
          />
        </div>
      </div>
      
      <div className="mt-4">
        <label htmlFor="access_instructions" className="block text-sm font-medium mb-1">
          <Key size={16} className="inline mr-1" />
          Access Instructions
        </label>
        <Textarea
          id="access_instructions"
          name="access_instructions"
          value={form.access_instructions}
          onChange={handleChange}
          placeholder="Front door smart lock code: 1234. Backup key in lockbox by garage (code: 5678)."
          className="resize-y min-h-[80px]"
        />
      </div>
    </div>
  );
}
