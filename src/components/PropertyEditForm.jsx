
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Wifi, Key, MapPin, Car, Phone, FileText, Home, AlertTriangle } from "lucide-react";

export default function PropertyEditForm({ formData, setFormData, handleUpdate, handleCancel }) {
  const [amenities, setAmenities] = useState(() => {
    if (formData.amenities) {
      return typeof formData.amenities === 'string' ? JSON.parse(formData.amenities) : formData.amenities;
    }
    return [];
  });

  const commonAmenities = [
    'WiFi', 'Kitchen', 'Washer/Dryer', 'Parking', 'Pool', 'Hot Tub', 'BBQ Grill',
    'Ocean View', 'Mountain View', 'Fireplace', 'Air Conditioning', 'Heating',
    'Pet Friendly', 'Balcony/Deck', 'Beach Access', 'Ski Storage', 'Gym Access'
  ];

  const handleAmenityToggle = (amenity) => {
    const newAmenities = amenities.includes(amenity)
      ? amenities.filter(a => a !== amenity)
      : [...amenities, amenity];
    
    setAmenities(newAmenities);
    setFormData({ ...formData, amenities: JSON.stringify(newAmenities) });
  };

  const handleInputChange = (field, value) => {
    setFormData({ ...formData, [field]: value });
  };

  return (
    <div className="space-y-6 max-h-96 overflow-y-auto">
      {/* Basic Information */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Home size={18} /> Basic Information
        </h3>
        <div className="space-y-3">
          <Input 
            value={formData.property_name || ''} 
            onChange={(e) => handleInputChange('property_name', e.target.value)} 
            placeholder="Property Name" 
          />
          <Input 
            value={formData.address || ''} 
            onChange={(e) => handleInputChange('address', e.target.value)} 
            placeholder="Address" 
          />
          <div className="grid grid-cols-2 gap-3">
            <Input 
              value={formData.check_in_time || ''} 
              onChange={(e) => handleInputChange('check_in_time', e.target.value)} 
              placeholder="Check-in Time" 
            />
            <Input 
              value={formData.check_out_time || ''} 
              onChange={(e) => handleInputChange('check_out_time', e.target.value)} 
              placeholder="Check-out Time" 
            />
          </div>
        </div>
      </div>

      {/* WiFi & Access */}
      <div className="bg-blue-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Wifi size={18} /> WiFi & Access
        </h3>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input 
              value={formData.wifi_name || ''} 
              onChange={(e) => handleInputChange('wifi_name', e.target.value)} 
              placeholder="WiFi Network Name" 
            />
            <Input 
              value={formData.wifi_password || ''} 
              onChange={(e) => handleInputChange('wifi_password', e.target.value)} 
              placeholder="WiFi Password" 
            />
          </div>
          <Textarea
            value={formData.access_instructions || ''}
            onChange={(e) => handleInputChange('access_instructions', e.target.value)}
            placeholder="Access Instructions (door codes, keys, etc.)"
            className="resize-y min-h-[80px]"
          />
        </div>
      </div>

      {/* Directions & Parking */}
      <div className="bg-green-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <MapPin size={18} /> Directions & Parking
        </h3>
        <div className="space-y-3">
          <Textarea
            value={formData.directions_to_property || ''}
            onChange={(e) => handleInputChange('directions_to_property', e.target.value)}
            placeholder="Directions to Property"
            className="resize-y min-h-[80px]"
          />
          <Textarea
            value={formData.parking_instructions || ''}
            onChange={(e) => handleInputChange('parking_instructions', e.target.value)}
            placeholder="Parking Instructions"
            className="resize-y min-h-[80px]"
          />
        </div>
      </div>

      {/* Emergency Contact */}
      <div className="bg-red-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Phone size={18} /> Emergency Contact
        </h3>
        <Textarea
          value={formData.emergency_contact || ''}
          onChange={(e) => handleInputChange('emergency_contact', e.target.value)}
          placeholder="Emergency contact information"
          className="resize-y min-h-[80px]"
        />
      </div>

      {/* House Rules & Amenities */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <FileText size={18} /> House Rules & Amenities
        </h3>
        <div className="space-y-3">
          <Textarea
            value={formData.house_rules || ''}
            onChange={(e) => handleInputChange('house_rules', e.target.value)}
            placeholder="House Rules"
            className="resize-y min-h-[80px]"
          />
          
          <div>
            <label className="block text-sm font-medium mb-2">Amenities</label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-32 overflow-y-auto">
              {commonAmenities.map((amenity) => (
                <label key={amenity} className="flex items-center space-x-2 cursor-pointer text-sm">
                  <input
                    type="checkbox"
                    checked={amenities.includes(amenity)}
                    onChange={() => handleAmenityToggle(amenity)}
                    className="rounded"
                  />
                  <span>{amenity}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <AlertTriangle size={18} /> Additional Information
        </h3>
        <div className="space-y-3">
          <Textarea 
            value={formData.local_recommendations || ''} 
            onChange={(e) => handleInputChange('local_recommendations', e.target.value)} 
            placeholder="Local Recommendations" 
            className="resize-y min-h-[80px]"
          />
          <Textarea
            value={formData.cleaning_instructions || ''}
            onChange={(e) => handleInputChange('cleaning_instructions', e.target.value)}
            placeholder="Cleaning Instructions"
            className="resize-y min-h-[80px]"
          />
          <Textarea
            value={formData.special_notes || ''}
            onChange={(e) => handleInputChange('special_notes', e.target.value)}
            placeholder="Special Notes"
            className="resize-y min-h-[80px]"
          />
          <Textarea
            value={formData.knowledge_base || ''}
            onChange={(e) => handleInputChange('knowledge_base', e.target.value)}
            placeholder="Knowledge Base"
            className="resize-y min-h-[100px]"
          />
        </div>
      </div>
      
      <div className="flex gap-2 pt-4 border-t">
        <Button onClick={handleUpdate} className="flex-1">Save Changes</Button>
        <Button variant="outline" onClick={handleCancel} className="flex-1">Cancel</Button>
      </div>
    </div>
  );
}
