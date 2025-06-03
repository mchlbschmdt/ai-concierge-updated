
import React from 'react';
import { Textarea } from "@/components/ui/textarea";
import { MapPin, Car } from "lucide-react";

export default function DirectionsParkingSection({ form, handleChange }) {
  return (
    <div className="bg-green-50 p-4 rounded-lg">
      <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
        <MapPin size={20} /> Directions & Parking
      </h2>
      <div>
        <label htmlFor="directions_to_property" className="block text-sm font-medium mb-1">Directions to Property</label>
        <Textarea
          id="directions_to_property"
          name="directions_to_property"
          value={form.directions_to_property}
          onChange={handleChange}
          placeholder="From PCH, turn west on Malibu Road. House is the blue one with white trim, #123."
          className="resize-y min-h-[80px] mb-4"
        />
      </div>
      
      <div>
        <label htmlFor="parking_instructions" className="block text-sm font-medium mb-1">
          <Car size={16} className="inline mr-1" />
          Parking Instructions
        </label>
        <Textarea
          id="parking_instructions"
          name="parking_instructions"
          value={form.parking_instructions}
          onChange={handleChange}
          placeholder="Two spaces in driveway. Additional street parking available."
          className="resize-y min-h-[80px]"
        />
      </div>
    </div>
  );
}
