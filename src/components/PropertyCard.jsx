
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import PropertyEditForm from './PropertyEditForm';
import PropertyDetails from './PropertyDetails';
import PropertyFilesTab from './PropertyFilesTab';
import PropertyMessagesTab from './PropertyMessagesTab';

export default function PropertyCard({ 
  property, 
  onUpdate, 
  onFileAdded, 
  onMessagesAdded 
}) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({ ...property });

  const handleEdit = () => {
    setEditing(true);
    setFormData({ ...property });
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleUpdate = async () => {
    await onUpdate(property.id, formData);
    setEditing(false);
  };

  if (editing) {
    return (
      <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
        <PropertyEditForm 
          formData={formData}
          setFormData={setFormData}
          handleUpdate={handleUpdate}
          handleCancel={handleCancel}
        />
      </div>
    );
  }

  return (
    <div className="border rounded-lg p-4 mb-6 bg-white shadow-sm">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-semibold text-primary">{property.property_name}</h2>
          <p className="text-sm text-gray-600">{property.address}</p>
          <p className="text-xs text-gray-500">Code: {property.code}</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleEdit} className="self-start">
          Edit Property
        </Button>
      </div>
      
      <Tabs defaultValue="details" className="mt-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="files">Files</TabsTrigger>
          <TabsTrigger value="messages">Messages</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4 mt-4">
          <PropertyDetails property={property} />
        </TabsContent>
        
        <TabsContent value="files" className="space-y-4 mt-4">
          <PropertyFilesTab 
            property={property} 
            onFileAdded={onFileAdded} 
          />
        </TabsContent>
        
        <TabsContent value="messages" className="space-y-4 mt-4">
          <PropertyMessagesTab 
            property={property} 
            onMessagesAdded={onMessagesAdded} 
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
