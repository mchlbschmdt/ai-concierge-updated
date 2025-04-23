
// src/pages/Properties.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Plus, Search as SearchIcon } from "lucide-react";

export default function Properties() {
  const [properties, setProperties] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/properties")
      .then(res => res.json())
      .then(data => setProperties(data));
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate suggestions based on search input
    const matches = properties.filter(property =>
      (property.code || "").toLowerCase().includes(search.toLowerCase()) ||
      (property.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (property.knowledgeBase || property.knowledge_base || "").toLowerCase().includes(search.toLowerCase())
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
    });
    
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5)); // Limit to 5 suggestions
  }, [search, properties]);

  const filtered = properties.filter(property =>
    (property.code || "").toLowerCase().includes(search.toLowerCase()) ||
    (property.address || "").toLowerCase().includes(search.toLowerCase()) ||
    (property.knowledgeBase || property.knowledge_base || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="p-6 flex-1 space-y-6">
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
        {filtered.map(property => (
          <div key={property.code} className="border p-4 mb-2 bg-white shadow rounded">
            <p><strong>Code:</strong> {property.code}</p>
            <p><strong>Address:</strong> {property.address}</p>
            <p><strong>User Assigned:</strong> {property.user_id}</p>
            <div>
              <strong>Knowledge Base:</strong>
              <div className="overflow-auto bg-gray-100 p-2 rounded border mt-1 max-h-36 text-sm whitespace-pre-line">
                {property.knowledgeBase || property.knowledge_base}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
