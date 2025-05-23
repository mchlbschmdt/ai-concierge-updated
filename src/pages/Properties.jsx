
import { useState, useEffect } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchProperties } from "../services/propertyService";
import { Button } from "@/components/ui/button";
import PropertySearch from "../components/properties/PropertySearch";
import PropertyGrid from "../components/properties/PropertyGrid";
import PropertyLoadingState from "../components/properties/PropertyLoadingState";
import PropertyErrorState from "../components/properties/PropertyErrorState";
import PropertyEmptyState from "../components/properties/PropertyEmptyState";
import usePropertySearch from "../hooks/usePropertySearch";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Extract the timestamp parameter that forces a refresh
  const refreshTimestamp = searchParams.get('t');
  
  // Use the custom hook for search functionality
  const { suggestions, filteredProperties } = usePropertySearch(properties, search);

  useEffect(() => {
    console.log("Properties component mounted, path:", location.pathname);
    console.log("Loading properties, refresh trigger:", location.key, refreshTimestamp);
    
    async function loadProperties() {
      try {
        setLoading(true);
        setError(null);
        console.log("Fetching properties data...");
        const propertiesData = await fetchProperties();
        console.log("Properties loaded:", propertiesData);
        
        // Ensure we have an array, even if API returns null or undefined
        if (!propertiesData) {
          console.warn("Properties data is null or undefined");
          setProperties([]);
          toast({
            title: "Notice",
            description: "No properties found or could not connect to database.",
            variant: "default"
          });
        } else {
          setProperties(Array.isArray(propertiesData) ? propertiesData : []);
        }
      } catch (error) {
        console.error("Error loading properties:", error);
        // Handle storage errors specifically
        const errorMessage = error.message || "Failed to load properties";
        const isStorageError = errorMessage.includes("storage") || 
                              errorMessage.includes("space") ||
                              errorMessage.includes("quota");
        
        setError(isStorageError 
          ? "Browser storage is full. Please clear some space and try again." 
          : errorMessage);
          
        toast({
          title: "Error",
          description: isStorageError 
            ? "Browser storage issue detected. Try clearing your browser cache." 
            : `Failed to load properties. ${errorMessage}`,
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadProperties();
  }, [toast, location.key, refreshTimestamp]);

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
  };

  const handleAddProperty = () => {
    navigate("/dashboard/add-property");
  };

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Properties</h2>
        </div>
        <PropertyLoadingState />
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Properties</h2>
          <Button
            onClick={handleAddProperty}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add Property
          </Button>
        </div>
        <PropertyErrorState error={error} />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Properties</h2>
        <div className="flex items-center gap-2">
          <PropertySearch 
            search={search} 
            setSearch={setSearch} 
            suggestions={suggestions} 
            handleSuggestionSelect={handleSuggestionSelect}
          />
          <Button
            onClick={handleAddProperty}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add Property
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <PropertyEmptyState isSearchResults={false} />
      ) : filteredProperties.length === 0 ? (
        <PropertyEmptyState isSearchResults={true} />
      ) : (
        <PropertyGrid properties={filteredProperties} />
      )}
    </div>
  );
}
