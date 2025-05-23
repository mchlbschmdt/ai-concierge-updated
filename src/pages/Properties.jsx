
import { useState, useEffect } from "react";
import { Link, useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { Plus, Search as SearchIcon, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { fetchProperties } from "../services/propertyService";
import { Button } from "@/components/ui/button";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const { toast } = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Extract the timestamp parameter that forces a refresh
  const refreshTimestamp = searchParams.get('t');

  useEffect(() => {
    console.log("Loading properties, refresh trigger:", location.key, refreshTimestamp);
    
    async function loadProperties() {
      try {
        setLoading(true);
        setError(null);
        const propertiesData = await fetchProperties();
        console.log("Properties loaded:", propertiesData);
        setProperties(Array.isArray(propertiesData) ? propertiesData : []);
      } catch (error) {
        console.error("Error loading properties:", error);
        setError(error.message || "Failed to load properties");
        toast({
          title: "Error",
          description: "Failed to load properties. " + (error.message || "Unknown error"),
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadProperties();
    
    // This will force a reload when we navigate back to this page
    // after adding a property or when the t parameter changes
  }, [toast, location.key, refreshTimestamp]); 

  useEffect(() => {
    if (search.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate suggestions based on search input
    const matches = properties.filter(property =>
      (property.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (property.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (property.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
      (property.knowledge_base || "").toLowerCase().includes(search.toLowerCase())
    );
    
    // Get unique suggestion values across different fields
    const uniqueSuggestions = new Set();
    matches.forEach(property => {
      if ((property.code || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(property.code);
      }
      if ((property.address || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(property.address);
      }
      if ((property.property_name || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(property.property_name);
      }
    });
    
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5)); // Limit to 5 suggestions
  }, [search, properties]);

  const filtered = properties.filter(property =>
    (property.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (property.address || "").toLowerCase().includes(search.toLowerCase()) ||
    (property.property_name || "").toLowerCase().includes(search.toLowerCase()) ||
    (property.knowledge_base || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
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
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading properties...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Properties</h2>
        </div>
        <div className="flex justify-center items-center h-64 flex-col">
          <div className="text-red-500 mb-2">Error: {error}</div>
          <Button onClick={() => window.location.reload()} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
        <h2 className="text-2xl font-bold">Properties</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              placeholder="Search properties..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 pr-3 py-2 border rounded focus:outline-primary bg-white"
            />
            <SearchIcon className="absolute left-2 top-2.5 text-gray-400" size={18} />
            
            {suggestions.length > 0 && (
              <div className="absolute left-0 right-0 mt-1 bg-white border rounded shadow-lg z-10">
                {suggestions.map((suggestion, index) => (
                  <div 
                    key={index} 
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSuggestionSelect(suggestion)}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button
            onClick={handleAddProperty}
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add Property
          </Button>
        </div>
      </div>

      {properties.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No properties found. Add your first property to get started.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No properties match your search criteria.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(property => (
            <Link to={`/dashboard/properties-manager#${property.id}`} key={property.id || property.code} 
              className="border p-4 bg-white shadow rounded hover:shadow-md transition">
              <h3 className="text-xl font-semibold text-primary">{property.property_name || "Unnamed Property"}</h3>
              <p className="text-gray-500 text-sm">Code: {property.code || "No Code"}</p>
              <p className="text-gray-600">{property.address || "No Address"}</p>
              <div className="mt-2 flex justify-between">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  {property.files?.length || 0} files
                </span>
                <span className="text-xs text-primary">View Details →</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
