
import React, { useState } from 'react';
import { Loader2, Save } from "lucide-react";
import Layout from '../components/Layout';
import useAddPropertyForm from '../hooks/useAddPropertyForm';
import BasicInfoSection from '../components/property-forms/BasicInfoSection';
import WifiAccessSection from '../components/property-forms/WifiAccessSection';
import DirectionsParkingSection from '../components/property-forms/DirectionsParkingSection';
import EmergencyContactSection from '../components/property-forms/EmergencyContactSection';
import HouseRulesAmenitiesSection from '../components/property-forms/HouseRulesAmenitiesSection';
import AdditionalInfoSection from '../components/property-forms/AdditionalInfoSection';
import FileUploadSection from '../components/property-forms/FileUploadSection';
import { SaveButton } from '@/components/ui/SaveButton';
import { FormErrorAlert } from '@/components/ui/FormErrorAlert';
import { FieldError } from '@/components/ui/FieldError';

export default function AddProperty() {
  const {
    form,
    loading,
    error,
    fieldErrors,
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
    <Layout>
      <div className="p-6 max-w-4xl mx-auto bg-background rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold mb-6 text-foreground">Add New Vacation Rental Property</h1>
        
        {error && (
          <FormErrorAlert 
            error={error} 
            onDismiss={() => {}} 
            className="mb-6"
          />
        )}
        
        <form className="space-y-6" onSubmit={onSubmit}>
          <div>
            <BasicInfoSection form={form} handleChange={handleChange} />
            {fieldErrors.property_name && <FieldError error={fieldErrors.property_name} />}
            {fieldErrors.address && <FieldError error={fieldErrors.address} />}
          </div>
          
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
          
          <SaveButton
            type="submit"
            loading={loading}
            disabled={loading}
            loadingText={selectedFile ? 'Uploading...' : 'Adding Property...'}
            className="w-full py-3 text-lg"
            size="lg"
          >
            Save Property
          </SaveButton>
        </form>
      </div>
    </Layout>
  );
}
