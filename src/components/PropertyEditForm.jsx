
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Wifi, Key, MapPin, Car, Phone, FileText, Home, AlertTriangle } from "lucide-react";
import { validateServiceFees, sanitizeServiceFees } from "@/utils/inputValidation";
import { useToast } from "@/context/ToastContext";
import { SaveButton } from "@/components/ui/SaveButton";
import { FormLoadingOverlay } from "@/components/ui/FormLoadingOverlay";

export default function PropertyEditForm({ formData, setFormData, handleUpdate, handleCancel }) {
  const [amenities, setAmenities] = useState(() => {
    if (formData.amenities) {
      return typeof formData.amenities === 'string' ? JSON.parse(formData.amenities) : formData.amenities;
    }
    return [];
  });

  const [serviceFees, setServiceFees] = useState(() => {
    if (formData.service_fees) {
      return typeof formData.service_fees === 'string' ? JSON.parse(formData.service_fees) : formData.service_fees;
    }
    return {};
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const { showToast } = useToast();

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

  const handleServiceFeeChange = (serviceKey, field, value) => {
    const updatedFees = { ...serviceFees };
    if (!updatedFees[serviceKey]) {
      updatedFees[serviceKey] = {};
    }
    updatedFees[serviceKey][field] = value;
    setServiceFees(updatedFees);
    setFormData({ ...formData, service_fees: JSON.stringify(updatedFees) });
    
    // Real-time validation
    const validation = validateServiceFees(updatedFees);
    setValidationErrors(validation.errors);
    setValidationWarnings(validation.warnings);
  };

  const removeServiceFee = (serviceKey) => {
    const updatedFees = { ...serviceFees };
    delete updatedFees[serviceKey];
    setServiceFees(updatedFees);
    setFormData({ ...formData, service_fees: JSON.stringify(updatedFees) });
  };

  const addServiceFee = (serviceKey) => {
    if (!serviceKey || serviceFees[serviceKey]) return;
    const updatedFees = { ...serviceFees, [serviceKey]: { price: '', unit: 'per_day', description: '', notes: '' } };
    setServiceFees(updatedFees);
    setFormData({ ...formData, service_fees: JSON.stringify(updatedFees) });
  };

  const handleUpdateWithValidation = async () => {
    setIsSubmitting(true);
    setSubmitSuccess(false);
    
    try {
      // Validate service fees
      const validation = validateServiceFees(serviceFees);
      
      if (!validation.isValid) {
        setValidationErrors(validation.errors);
        showToast('Please fix validation errors before saving', 'error');
        return;
      }
      
      if (validation.hasWarnings) {
        setValidationWarnings(validation.warnings);
      }
      
      // Sanitize and proceed
      const sanitizedFees = sanitizeServiceFees(serviceFees);
      const updatedFormData = { ...formData, service_fees: sanitizedFees };
      setFormData(updatedFormData);
      
      await handleUpdate(updatedFormData);
      
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 2000);
    } catch (error) {
      showToast(`Failed to update property: ${error.message}`, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-h-96 overflow-y-auto relative">
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
          <Input 
            value={formData.management_company_name || ''} 
            onChange={(e) => handleInputChange('management_company_name', e.target.value)} 
            placeholder="Management Company or Host Name (e.g., Lauren & Mike)" 
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

      {/* Service Fees */}
      <div className="bg-purple-50 p-4 rounded-lg">
        <h3 className="font-medium mb-3 flex items-center gap-2">
          <FileText size={18} /> Service Fees & Offerings
        </h3>
        <div className="space-y-4">
          {Object.entries(serviceFees).map(([serviceKey, service]) => (
            <div key={serviceKey} className="bg-white p-3 rounded border border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-sm">{serviceKey.replace(/_/g, ' ').toUpperCase()}</span>
                <Button 
                  type="button"
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeServiceFee(serviceKey)}
                  className="text-red-500 h-6 px-2"
                >
                  Remove
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="space-y-1">
                    <Input 
                      type="number"
                      value={service.price || ''} 
                      onChange={(e) => handleServiceFeeChange(serviceKey, 'price', parseFloat(e.target.value) || '')} 
                      placeholder="Price" 
                      className={`text-sm ${validationErrors[serviceKey]?.price ? 'border-destructive' : ''}`}
                    />
                    {validationErrors[serviceKey]?.price && (
                      <p className="text-destructive text-xs flex items-center gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        {validationErrors[serviceKey].price}
                      </p>
                    )}
                </div>
                <div className="space-y-1">
                  <select
                    value={service.unit || 'per_day'}
                    onChange={(e) => handleServiceFeeChange(serviceKey, 'unit', e.target.value)}
                    className={`text-sm border rounded-md px-2 ${validationErrors[serviceKey]?.unit ? 'border-destructive' : 'border-gray-300'}`}
                  >
                    <option value="per_day">Per Day</option>
                    <option value="per_booking">Per Booking</option>
                    <option value="per_person">Per Person</option>
                    <option value="flat_fee">Flat Fee</option>
                  </select>
                  {validationErrors[serviceKey]?.unit && (
                    <p className="text-destructive text-xs flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      {validationErrors[serviceKey].unit}
                    </p>
                  )}
                </div>
              </div>
              <div className="space-y-1">
                <Input 
                  value={service.description || ''} 
                  onChange={(e) => handleServiceFeeChange(serviceKey, 'description', e.target.value)} 
                  placeholder="Description (e.g., includes waterpark, pools, gym)" 
                  className={`text-sm ${validationErrors[serviceKey]?.description ? 'border-destructive' : ''}`}
                />
                {validationErrors[serviceKey]?.description && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationErrors[serviceKey].description}
                  </p>
                )}
                {validationWarnings[`${serviceKey}_description`] && !validationErrors[serviceKey]?.description && (
                  <p className="text-yellow-600 text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationWarnings[`${serviceKey}_description`]}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Textarea
                  value={service.notes || ''}
                  onChange={(e) => handleServiceFeeChange(serviceKey, 'notes', e.target.value)}
                  placeholder="Notes (e.g., Must be scheduled 24 hours in advance)"
                  className={`text-sm resize-y min-h-[50px] ${validationErrors[serviceKey]?.notes ? 'border-destructive' : ''}`}
                />
                {validationErrors[serviceKey]?.notes && (
                  <p className="text-destructive text-xs flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    {validationErrors[serviceKey].notes}
                  </p>
                )}
              </div>
            </div>
          ))}
          
          <div className="flex gap-2">
            <select
              id="newServiceKey"
              className="flex-1 text-sm border border-gray-300 rounded-md px-2 py-1"
            >
              <option value="">Select service to add...</option>
              <option value="pool_heat">Pool Heating</option>
              <option value="resort_amenities">Resort Amenities</option>
              <option value="grocery_delivery">Grocery Delivery</option>
              <option value="private_chef">Private Chef</option>
              <option value="massage">Massage Service</option>
              <option value="cleaning">Additional Cleaning</option>
            </select>
            <Button 
              type="button"
              variant="outline" 
              size="sm"
              onClick={() => {
                const select = document.getElementById('newServiceKey');
                if (select.value) {
                  addServiceFee(select.value);
                  select.value = '';
                }
              }}
            >
              + Add Service
            </Button>
          </div>
        </div>
      </div>

      {/* Additional Information */}
      <div className="bg-yellow-50 p-4 rounded-lg">
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
      
      <FormLoadingOverlay show={isSubmitting} message="Saving property..." />
      
      <div className="flex gap-2 pt-4 border-t">
        <SaveButton 
          onClick={handleUpdateWithValidation} 
          loading={isSubmitting}
          success={submitSuccess}
          className="flex-1"
        >
          Save Changes
        </SaveButton>
        <SaveButton
          variant="outline" 
          onClick={handleCancel} 
          className="flex-1"
          showIcon={false}
        >
          Cancel
        </SaveButton>
      </div>
      
      {Object.keys(validationWarnings).length > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800 font-medium mb-1 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            Warnings (can still save):
          </p>
          <ul className="text-xs text-yellow-700 list-disc list-inside">
            {Object.values(validationWarnings).map((warning, idx) => (
              <li key={idx}>{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
