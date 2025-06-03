
import React, { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save, Wifi, Key, MapPin, Car, Phone, FileText, Home, AlertTriangle } from "lucide-react";
import { addProperty, uploadFile } from '../services/propertyService';
import FilePreview from '../components/FilePreview';

export default function AddProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [file, setFile] = useState(null);
  const [filePreview, setFilePreview] = useState(null);
  
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

  const commonAmenities = [
    'WiFi', 'Kitchen', 'Washer/Dryer', 'Parking', 'Pool', 'Hot Tub', 'BBQ Grill',
    'Ocean View', 'Mountain View', 'Fireplace', 'Air Conditioning', 'Heating',
    'Pet Friendly', 'Balcony/Deck', 'Beach Access', 'Ski Storage', 'Gym Access'
  ];

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

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    
    if (!selectedFile) {
      setFile(null);
      setFilePreview(null);
      return;
    }
    
    setFile(selectedFile);
    
    if (selectedFile.type === "application/json" || 
        selectedFile.type === "text/plain" || 
        selectedFile.type === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target.result;
          setFilePreview({
            type: selectedFile.type,
            content: content.slice(0, 500) + (content.length > 500 ? '...' : '')
          });
        } catch (error) {
          console.error("Error reading file:", error);
          setFilePreview(null);
        }
      };
      reader.readAsText(selectedFile);
    } else {
      setFilePreview({
        type: selectedFile.type,
        name: selectedFile.name,
        size: (selectedFile.size / 1024).toFixed(2) + " KB"
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
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

  const handleClearFile = () => {
    setFile(null);
    setFilePreview(null);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-primary">Add New Vacation Rental Property</h1>
      <form className="space-y-6" onSubmit={handleSubmit}>
        
        {/* Basic Information */}
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
          
          <div className="grid grid-cols-2 gap-4 mt-4">
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

        {/* WiFi & Access */}
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

        {/* Directions & Parking */}
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

        {/* Emergency & Contact */}
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

        {/* Rules & Amenities */}
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

        {/* Additional Information */}
        <div className="bg-purple-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <AlertTriangle size={20} /> Additional Information
          </h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="local_recommendations" className="block text-sm font-medium mb-1">Local Recommendations</label>
              <Textarea
                id="local_recommendations"
                name="local_recommendations"
                value={form.local_recommendations}
                onChange={handleChange}
                placeholder="Nobu Malibu (5 min drive), Malibu Pier (10 min walk), Point Dume Beach (15 min drive)"
                className="resize-y min-h-[80px]"
              />
            </div>
            
            <div>
              <label htmlFor="cleaning_instructions" className="block text-sm font-medium mb-1">Cleaning Instructions</label>
              <Textarea
                id="cleaning_instructions"
                name="cleaning_instructions"
                value={form.cleaning_instructions}
                onChange={handleChange}
                placeholder="Cleaning crew comes Fridays at 10 AM. Please strip beds and start dishwasher before checkout."
                className="resize-y min-h-[80px]"
              />
            </div>
            
            <div>
              <label htmlFor="special_notes" className="block text-sm font-medium mb-1">Special Notes</label>
              <Textarea
                id="special_notes"
                name="special_notes"
                value={form.special_notes}
                onChange={handleChange}
                placeholder="Beach chairs in garage. Tide chart on refrigerator. Watch for high tide warnings."
                className="resize-y min-h-[80px]"
              />
            </div>
            
            <div>
              <label htmlFor="knowledge_base" className="block text-sm font-medium mb-1">General Knowledge Base</label>
              <Textarea
                id="knowledge_base"
                name="knowledge_base"
                value={form.knowledge_base}
                onChange={handleChange}
                placeholder="Beautiful oceanfront property with private beach access. Recently renovated with modern amenities."
                className="resize-y min-h-[100px]"
              />
            </div>
          </div>
        </div>
        
        {/* File Upload */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Attach Files (optional)</h2>
          <Input
            id="file_upload"
            type="file"
            onChange={handleFileChange}
            className="mb-2"
            accept=".pdf,.docx,.txt,.csv,.xlsx,.json,.jpg,.jpeg,.png"
          />
          
          {file && (
            <div className="mt-2">
              <FilePreview 
                file={file}
                filePreview={filePreview}
                onClear={handleClearFile}
              />
              
              {uploadProgress > 0 && uploadProgress < 100 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                  <div 
                    className="bg-primary h-2.5 rounded-full transition-all duration-300" 
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2 py-3 text-lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {file ? 'Uploading...' : 'Adding Property...'}
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              Save Property
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
