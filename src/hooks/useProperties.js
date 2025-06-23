
import { useState, useEffect, useCallback } from 'react';
import { fetchProperties, updateProperty, deleteProperty } from '../services/propertyService';
import { useToast } from "@/components/ui/use-toast";

// Global state to prevent multiple fetches
let propertiesCache = null;
let isFetching = false;
let fetchPromise = null;

export function useProperties() {
  const { toast } = useToast();
  const [properties, setProperties] = useState(propertiesCache || []);
  const [loading, setLoading] = useState(!propertiesCache);
  const [error, setError] = useState(null);

  const loadProperties = useCallback(async () => {
    // If already fetching, wait for the existing promise
    if (isFetching && fetchPromise) {
      try {
        const result = await fetchPromise;
        setProperties(result);
        setLoading(false);
        return result;
      } catch (err) {
        setError(err.message);
        setLoading(false);
        throw err;
      }
    }

    // If we have cached data and no error, return it
    if (propertiesCache && !error) {
      setProperties(propertiesCache);
      setLoading(false);
      return propertiesCache;
    }

    // Only fetch if not already fetching
    if (!isFetching) {
      isFetching = true;
      setLoading(true);
      setError(null);

      fetchPromise = fetchProperties()
        .then((data) => {
          propertiesCache = data;
          setProperties(data);
          setLoading(false);
          isFetching = false;
          fetchPromise = null;
          return data;
        })
        .catch((err) => {
          console.error("Error loading properties:", err);
          setError(err.message);
          setLoading(false);
          isFetching = false;
          fetchPromise = null;
          toast({
            title: "Error",
            description: `Failed to load properties: ${err.message}`,
            variant: "destructive"
          });
          throw err;
        });

      return fetchPromise;
    }
  }, [toast, error]);

  useEffect(() => {
    loadProperties();
  }, [loadProperties]);

  const handlePropertyUpdate = useCallback(async (propertyId, updatedData) => {
    try {
      console.log("Updating property in hook:", propertyId, updatedData);
      const result = await updateProperty(propertyId, updatedData);
      
      // Update both local state and cache with the returned data
      const updatedProperties = properties.map(p => 
        p.id === propertyId ? { ...p, ...result.property } : p
      );
      setProperties(updatedProperties);
      propertiesCache = updatedProperties;
      
      toast({
        title: "Success",
        description: "Property updated successfully"
      });
      
      return result;
    } catch (error) {
      console.error("Error updating property:", error);
      toast({
        title: "Error",
        description: `Failed to update property: ${error.message}`,
        variant: "destructive"
      });
      throw error;
    }
  }, [properties, toast]);
  
  const handlePropertyDelete = useCallback(async (propertyId) => {
    try {
      await deleteProperty(propertyId);
      
      // Update both local state and cache
      const filteredProperties = properties.filter(p => p.id !== propertyId);
      setProperties(filteredProperties);
      propertiesCache = filteredProperties;
      
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
  }, [properties, toast]);

  const handleFileAdded = useCallback((propertyId, fileData) => {
    const updatedProperties = properties.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        files: [...(p.files || []), fileData]
      };
    });
    setProperties(updatedProperties);
    propertiesCache = updatedProperties;
  }, [properties]);
  
  const handleFileDeleted = useCallback((propertyId, filePath) => {
    const updatedProperties = properties.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        files: (p.files || []).filter(file => file.path !== filePath)
      };
    });
    setProperties(updatedProperties);
    propertiesCache = updatedProperties;
  }, [properties]);
  
  const handleMessagesAdded = useCallback((propertyId, messages) => {
    const updatedProperties = properties.map(p => {
      if (p.id !== propertyId) return p;
      
      return {
        ...p,
        messages: [...(p.messages || []), ...messages]
      };
    });
    setProperties(updatedProperties);
    propertiesCache = updatedProperties;
  }, [properties]);

  const refreshProperties = useCallback(async () => {
    propertiesCache = null; // Clear cache to force refresh
    return loadProperties();
  }, [loadProperties]);

  return {
    properties,
    loading,
    error,
    loadProperties,
    refreshProperties,
    handlePropertyUpdate,
    handlePropertyDelete,
    handleFileAdded,
    handleFileDeleted,
    handleMessagesAdded
  };
}
