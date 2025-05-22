
import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, Search as SearchIcon } from "lucide-react";
import { fetchProperties } from "../services/propertyService";
import LoadingSpinner from "../components/LoadingSpinner";
import { useToast } from "@/components/ui/use-toast";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const { toast } = useToast();

  useEffect(() => {
    async function loadProperties() {
      try {
        setLoading(true);
        const data = await fetchProperties();
        setProperties(data);
      } catch (error) {
        console.error("Error loading properties:", error);
        toast({
          title: "Error",
          description: "Failed to load properties",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    }
    
    loadProperties();
  }, [toast]);

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

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Properties</h2>
        </div>
        <LoadingSpinner />
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
            
            {/* Suggestions dropdown */}
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
          <Link
            to="/dashboard/add-property"
            className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg shadow hover:bg-primary/90 transition"
          >
            <Plus size={18} /> Add Property
          </Link>
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
        filtered.map(property => (
          <div key={property.id || property.code} className="border p-4 mb-4 bg-white shadow rounded">
            <h3 className="text-xl font-semibold text-primary">{property.property_name}</h3>
            <p><strong>Code:</strong> {property.code}</p>
            <p><strong>Address:</strong> {property.address}</p>
            <p><strong>Files:</strong> {property.files?.length || 0}</p>
            <div>
              <strong>Knowledge Base:</strong>
              <div className="overflow-auto bg-gray-100 p-2 rounded border mt-1 max-h-36 text-sm whitespace-pre-line">
                {property.knowledge_base}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
