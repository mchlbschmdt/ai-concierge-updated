
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Loader2, Save } from "lucide-react";
import useAddPropertyForm from '../hooks/useAddPropertyForm';
import BasicInfoSection from '../components/property-forms/BasicInfoSection';
import WifiAccessSection from '../components/property-forms/WifiAccessSection';
import DirectionsParkingSection from '../components/property-forms/DirectionsParkingSection';
import EmergencyContactSection from '../components/property-forms/EmergencyContactSection';
import HouseRulesAmenitiesSection from '../components/property-forms/HouseRulesAmenitiesSection';
import AdditionalInfoSection from '../components/property-forms/AdditionalInfoSection';
import FileUploadSection from '../components/property-forms/FileUploadSection';

export default function AddProperty() {
  const {
    form,
    loading,
    uploadProgress,
    handleChange,
    handleAmenityToggle,
    handleSubmit
  } = useAddPropertyForm();
  
  const [selectedFile, setSelectedFile] = useState(null);

  const onSubmit = async (e) => {
    e.preventDefault();
    await handleSubmit(selectedFile);
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-6 text-primary">Add New Vacation Rental Property</h1>
      <form className="space-y-6" onSubmit={onSubmit}>
        
        <BasicInfoSection form={form} handleChange={handleChange} />
        
        <WifiAccessSection form={form} handleChange={handleChange} />
        
        <DirectionsParkingSection form={form} handleChange={handleChange} />
        
        <EmergencyContactSection form={form} handleChange={handleChange} />
        
        <HouseRulesAmenitiesSection 
          form={form} 
          handleChange={handleChange} 
          handleAmenityToggle={handleAmenityToggle} 
        />
        
        <AdditionalInfoSection form={form} handleChange={handleChange} />
        
        <FileUploadSection 
          onFileChange={setSelectedFile} 
          uploadProgress={uploadProgress} 
        />
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2 py-3 text-lg"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {selectedFile ? 'Uploading...' : 'Adding Property...'}
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
