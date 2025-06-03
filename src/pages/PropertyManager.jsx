
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyProperties from '../components/EmptyProperties';
import { fetchProperties, updateProperty, deleteProperty } from '../services/propertyService';

export default function PropertyManager() {
  const { toast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        setError(null);
        console.log("Loading properties...");
        const propertiesData = await fetchProperties();
        console.log("Properties loaded successfully:", propertiesData);
        setProperties(propertiesData);
      } catch (error) {
        console.error("Error loading properties:", error);
        setError(error.message);
        toast({
          title: "Error",
          description: `Failed to load properties: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadProperties();
  }, [toast]);

  const handlePropertyUpdate = async (propertyId, updatedData) => {
    try {
      console.log("Updating property:", propertyId, updatedData);
      await updateProperty(propertyId, updatedData);
      
      // Update local state
      setProperties(prev => prev.map(p => 
        p.id === propertyId ? { ...p, ...updatedData } : p
      ));
      
      toast({
        title: "Success",
        description: "Property updated successfully"
      });
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: `Failed to update property: ${error.message}`,
        variant: "destructive"
      });
      throw error; // Re-throw to let the component handle it
    }
  };
  
  const handlePropertyDelete = async (propertyId) => {
    try {
      console.log("Deleting property:", propertyId);
      await deleteProperty(propertyId);
      
      // Update local state
      setProperties(prev => prev.filter(p => p.id !== propertyId));
      
      toast({
        title: "Success",
        description: "Property deleted successfully"
      });
    } catch (error) {
      console.error("Error deleting property:", error);
      toast({
        title: "Error",
        description: `Failed to delete property: ${error.message}`,
        variant: "destructive"
      });
      throw error; // Re-throw to let the component handle it
    }
  };
  
  const handleFileAdded = (propertyId, fileData) => {
    console.log("File added to property:", propertyId, fileData);
    // Update the local state to include the new file
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        files: [...(p.files || []), fileData]
      };
    }));
  };
  
  const handleFileDeleted = (propertyId, filePath) => {
    console.log("File deleted from property:", propertyId, filePath);
    // Update the local state to remove the deleted file
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        files: (p.files || []).filter(file => file.path !== filePath)
      };
    }));
  };
  
  const handleMessagesAdded = (propertyId, messages) => {
    console.log("Messages added to property:", propertyId, messages);
    // Update the local state to include the new messages
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        messages: [...(p.messages || []), ...messages]
      };
    }));
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
        </div>
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
          <Link 
            to="/dashboard/add-property" 
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add New Property
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium mb-2">Error Loading Properties</h3>
          <p className="text-red-600">{error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 text-red-800 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
        <Link 
          to="/dashboard/add-property" 
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
        >
          <Plus size={18} /> Add New Property
        </Link>
      </div>

      {properties.length === 0 ? (
        <EmptyProperties />
      ) : (
        properties.map((property) => (
          <PropertyCard
            key={property.id}
            property={property}
            onUpdate={handlePropertyUpdate}
            onDelete={handlePropertyDelete}
            onFileAdded={handleFileAdded}
            onFileDeleted={handleFileDeleted}
            onMessagesAdded={handleMessagesAdded}
          />
        ))
      )}
    </div>
  );
}
