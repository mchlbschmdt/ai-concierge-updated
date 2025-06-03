
import React from 'react';
import { Wifi, Key, MapPin, Car, Phone, FileText, Home, AlertTriangle, Users } from "lucide-react";

export default function PropertyDetails({ property }) {
  const amenities = property.amenities ? 
    (typeof property.amenities === 'string' ? JSON.parse(property.amenities) : property.amenities) : [];

  return (
    <div className="space-y-6">
      {/* Basic Info */}
      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Home size={18} /> Basic Information
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-500">Check-in:</span> {property.check_in_time || 'Not specified'}
          </div>
          <div>
            <span className="text-gray-500">Check-out:</span> {property.check_out_time || 'Not specified'}
          </div>
        </div>
      </div>

      {/* WiFi & Access */}
      {(property.wifi_name || property.wifi_password || property.access_instructions) && (
        <div className="bg-blue-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Wifi size={18} /> WiFi & Access
          </h3>
          <div className="space-y-2 text-sm">
            {property.wifi_name && (
              <div>
                <span className="text-gray-500">WiFi Network:</span> {property.wifi_name}
              </div>
            )}
            {property.wifi_password && (
              <div>
                <span className="text-gray-500">WiFi Password:</span> {property.wifi_password}
              </div>
            )}
            {property.access_instructions && (
              <div className="mt-3">
                <div className="flex items-center gap-1 text-gray-500 mb-1">
                  <Key size={14} /> Access Instructions:
                </div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.access_instructions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Directions & Parking */}
      {(property.directions_to_property || property.parking_instructions) && (
        <div className="bg-green-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <MapPin size={18} /> Directions & Parking
          </h3>
          <div className="space-y-3 text-sm">
            {property.directions_to_property && (
              <div>
                <div className="text-gray-500 mb-1">Directions:</div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.directions_to_property}
                </div>
              </div>
            )}
            {property.parking_instructions && (
              <div>
                <div className="flex items-center gap-1 text-gray-500 mb-1">
                  <Car size={14} /> Parking:
                </div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.parking_instructions}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Emergency Contact */}
      {property.emergency_contact && (
        <div className="bg-red-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <Phone size={18} /> Emergency Contact
          </h3>
          <div className="whitespace-pre-line bg-white p-2 rounded border text-sm">
            {property.emergency_contact}
          </div>
        </div>
      )}

      {/* House Rules & Amenities */}
      <div className="bg-yellow-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <Users size={18} /> House Rules & Amenities
        </h3>
        <div className="space-y-3">
          {property.house_rules && (
            <div>
              <div className="text-gray-500 text-sm mb-1">House Rules:</div>
              <div className="whitespace-pre-line bg-white p-2 rounded border text-sm">
                {property.house_rules}
              </div>
            </div>
          )}
          {amenities.length > 0 && (
            <div>
              <div className="text-gray-500 text-sm mb-2">Amenities:</div>
              <div className="flex flex-wrap gap-2">
                {amenities.map((amenity, index) => (
                  <span key={index} className="bg-white px-2 py-1 rounded border text-xs">
                    {amenity}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Additional Information */}
      {(property.local_recommendations || property.cleaning_instructions || property.special_notes) && (
        <div className="bg-purple-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <AlertTriangle size={18} /> Additional Information
          </h3>
          <div className="space-y-3 text-sm">
            {property.local_recommendations && (
              <div>
                <div className="text-gray-500 mb-1">Local Recommendations:</div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.local_recommendations}
                </div>
              </div>
            )}
            {property.cleaning_instructions && (
              <div>
                <div className="text-gray-500 mb-1">Cleaning Instructions:</div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.cleaning_instructions}
                </div>
              </div>
            )}
            {property.special_notes && (
              <div>
                <div className="text-gray-500 mb-1">Special Notes:</div>
                <div className="whitespace-pre-line bg-white p-2 rounded border">
                  {property.special_notes}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Knowledge Base */}
      {property.knowledge_base && (
        <div className="bg-gray-50 p-4 rounded-lg">
          <h3 className="font-medium mb-3 flex items-center gap-2">
            <FileText size={18} /> Knowledge Base
          </h3>
          <div className="overflow-auto bg-white p-3 rounded border text-sm whitespace-pre-line max-h-64">
            {property.knowledge_base}
          </div>
        </div>
      )}
    </div>
  );
}
