
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { FileText } from "lucide-react";

const commonAmenities = [
  'WiFi', 'Kitchen', 'Washer/Dryer', 'Parking', 'Pool', 'Hot Tub', 'BBQ Grill',
  'Ocean View', 'Mountain View', 'Fireplace', 'Air Conditioning', 'Heating',
  'Pet Friendly', 'Balcony/Deck', 'Beach Access', 'Ski Storage', 'Gym Access'
];

export default function HouseRulesAmenitiesSection({ form, handleChange, handleAmenityToggle }) {
  return (
    <div className="bg-yellow-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <FileText size={20} /> House Rules & Amenities
      </h2>
      <div className="mb-4">
        <label htmlFor="house_rules" className="block text-sm font-medium mb-1">House Rules</label>
        <Textarea
          id="house_rules"
          name="house_rules"
          value={form.house_rules}
          onChange={handleChange}
          placeholder="No smoking. No pets. Quiet hours 10 PM - 8 AM. Maximum 6 guests."
          className="resize-y min-h-[80px]"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium mb-2">Amenities</label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {commonAmenities.map((amenity) => (
            <label key={amenity} className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.amenities.includes(amenity)}
                onChange={() => handleAmenityToggle(amenity)}
                className="rounded"
              />
              <span className="text-sm">{amenity}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
