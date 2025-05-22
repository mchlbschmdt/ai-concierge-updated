
import React, { useEffect, useState } from 'react';
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import PropertyCard from '../components/PropertyCard';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyProperties from '../components/EmptyProperties';
import { fetchProperties, updateProperty, deleteProperty } from '../services/propertyService';

export default function PropertyManager() {
  const { toast } = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setLoading(true);
        const propertiesData = await fetchProperties();
        setProperties(propertiesData);
      } catch (error) {
        console.error("Error fetching properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties",
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
        description: "Failed to update property",
        variant: "destructive"
      });
    }
  };
  
  const handlePropertyDelete = async (propertyId) => {
    try {
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
        description: "Failed to delete property",
        variant: "destructive"
      });
    }
  };
  
  const handleFileAdded = (propertyId, fileData) => {
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
    // Update the local state to include the new messages
    setProperties(prev => prev.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        messages: [...(p.messages || []), ...messages]
      };
    }));
  };

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

      {loading ? (
        <LoadingSpinner />
      ) : properties.length === 0 ? (
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
