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
    console.log("PropertyManager component mounted - starting data fetch");
    
    const loadProperties = async () => {
      try {
        console.log("Setting loading to true and clearing error");
        setLoading(true);
        setError(null);
        
        console.log("About to call fetchProperties...");
        const startTime = Date.now();
        const propertiesData = await fetchProperties();
        const endTime = Date.now();
        
        console.log(`fetchProperties completed in ${endTime - startTime}ms`);
        console.log("Raw properties data received:", propertiesData);
        console.log("Properties data type:", typeof propertiesData);
        console.log("Properties data length:", propertiesData?.length);
        
        if (Array.isArray(propertiesData)) {
          console.log("Setting properties array with", propertiesData.length, "items");
          setProperties(propertiesData);
        } else {
          console.log("Properties data is not an array, setting empty array");
          setProperties([]);
        }
        
        console.log("Successfully completed property loading");
      } catch (error) {
        console.error("Error in loadProperties:", error);
        console.error("Error stack:", error.stack);
        console.error("Error message:", error.message);
        setError(error.message);
        setProperties([]);
        toast({
          title: "Error",
          description: `Failed to load properties: ${error.message}`,
          variant: "destructive"
        });
      } finally {
        console.log("Setting loading to false");
        setLoading(false);
      }
    };
    
    // Add a timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      console.log("TIMEOUT: Loading took too long, forcing loading to false");
      setLoading(false);
      setError("Loading timeout - please refresh the page");
    }, 10000); // 10 second timeout
    
    loadProperties().finally(() => {
      clearTimeout(timeoutId);
    });
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
      throw error;
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
      throw error;
    }
  };
  
  const handleFileAdded = (propertyId, fileData) => {
    console.log("File added to property:", propertyId, fileData);
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
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        messages: [...(p.messages || []), ...messages]
      };
    }));
  };

  console.log("PropertyManager render state:", { 
    loading, 
    error, 
    propertiesCount: properties.length,
    propertiesData: properties
  });

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-primary">Manage Properties</h1>
        </div>
        <LoadingSpinner />
        <div className="mt-4 text-center text-sm text-gray-500">
          If this takes too long, try refreshing the page
        </div>
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
        <h1 className="text-2xl font-bold text-primary">Manage Properties ({properties.length})</h1>
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
        <div className="space-y-4">
          {properties.map((property) => (
            <PropertyCard
              key={property.id}
              property={property}
              onUpdate={handlePropertyUpdate}
              onDelete={handlePropertyDelete}
              onFileAdded={handleFileAdded}
              onFileDeleted={handleFileDeleted}
              onMessagesAdded={handleMessagesAdded}
            />
          ))}
        </div>
      )}
    </div>
  );
}
