
import { useState } from 'react';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { addProperty, uploadFile } from '../services/propertyService';

export default function useAddPropertyForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
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

  const handleSubmit = async (file) => {
    try {
      setLoading(true);
      
      if (!form.property_name || !form.address) {
        toast({
          title: "Missing Information",
          description: "Please fill in property name and address.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      const propertyCode = form.code || `PROP-${Date.now()}`;
      
      console.log("Saving property with data:", {
        ...form,
        code: propertyCode
      });
      
      const result = await addProperty({
        ...form,
        code: propertyCode,
        amenities: JSON.stringify(form.amenities)
      });
      
      console.log("Property added:", result);
      
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
        
        const fileResult = await uploadFile(result.propertyId, file);
        console.log("File uploaded:", fileResult);
        
        clearInterval(progressInterval);
        setUploadProgress(100);
      }
      
      toast({
        title: "Success!",
        description: "Property has been successfully added.",
      });
      
      navigate("/dashboard/properties?t=" + Date.now());
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        title: "Error",
        description: `Failed to add property: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return {
    form,
    loading,
    uploadProgress,
    handleChange,
    handleAmenityToggle,
    handleSubmit
  };
}
