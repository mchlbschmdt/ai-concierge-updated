
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/context/ToastContext";
import { addProperty, uploadFile } from '../services/propertyService';
import { useFormState } from './useFormState';

export default function useAddPropertyForm() {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [uploadProgress, setUploadProgress] = useState(0);
  
  const [form, setForm] = useState({
    property_name: '',
    code: '',
    address: '',
    check_in_time: '4:00 PM',
    check_out_time: '11:00 AM',
    local_recommendations: '',
    knowledge_base: '',
    wifi_name: '',
    wifi_password: '',
    access_instructions: '',
    directions_to_property: '',
    parking_instructions: '',
    emergency_contact: '',
    house_rules: '',
    amenities: [],
    cleaning_instructions: '',
    special_notes: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleAmenityToggle = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }));
  };

  // Validation function
  const validateForm = () => {
    const errors = {};
    
    if (!form.property_name || form.property_name.trim() === '') {
      errors.property_name = 'Property name is required';
    }
    
    if (!form.address || form.address.trim() === '') {
      errors.address = 'Address is required';
    }
    
    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      message: Object.keys(errors).length > 0 ? 'Please fill in all required fields' : null
    };
  };

  // Submit handler
  const submitProperty = async (file) => {
    const propertyCode = form.code || `PROP-${Date.now()}`;
    
    const propertyData = {
      property_name: form.property_name,
      code: propertyCode,
      address: form.address,
      check_in_time: form.check_in_time,
      check_out_time: form.check_out_time,
      knowledge_base: form.knowledge_base,
      local_recommendations: form.local_recommendations
    };
    
    const result = await addProperty(propertyData);
    
    if (file) {
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      try {
        await uploadFile(result.propertyId, file);
        clearInterval(progressInterval);
        setUploadProgress(100);
      } catch (fileError) {
        console.error("File upload failed:", fileError);
        clearInterval(progressInterval);
        setUploadProgress(0);
        showToast("Property saved successfully, but file upload failed. You can add files later.", "warning");
      }
    }
    
    showToast("Property has been successfully added!", "success");
    navigate("/dashboard/properties?t=" + Date.now());
    
    return result;
  };

  // Use the form state hook
  const {
    loading,
    error,
    fieldErrors,
    handleSubmit: handleFormSubmit
  } = useFormState(submitProperty, {
    validateBeforeSubmit: validateForm,
    onError: (err) => {
      showToast(`Failed to add property: ${err.message}`, "error");
      setUploadProgress(0);
    }
  });

  const handleSubmit = async (file) => {
    return await handleFormSubmit(file);
  };

  return {
    form,
    loading,
    error,
    fieldErrors,
    uploadProgress,
    handleChange,
    handleAmenityToggle,
    handleSubmit
  };
}
