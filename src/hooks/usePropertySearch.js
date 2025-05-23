
import { useState, useEffect } from "react";

export default function usePropertySearch(properties, searchTerm) {
  const [suggestions, setSuggestions] = useState([]);
  
  useEffect(() => {
    if (searchTerm.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate suggestions based on search input
    const matches = properties.filter(property =>
      (property.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.property_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
      (property.knowledge_base || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Get unique suggestion values across different fields
    const uniqueSuggestions = new Set();
    matches.forEach(property => {
      if ((property.code || "").toLowerCase().includes(searchTerm.toLowerCase())) {
        uniqueSuggestions.add(property.code);
      }
      if ((property.address || "").toLowerCase().includes(searchTerm.toLowerCase())) {
        uniqueSuggestions.add(property.address);
      }
      if ((property.property_name || "").toLowerCase().includes(searchTerm.toLowerCase())) {
        uniqueSuggestions.add(property.property_name);
      }
    });
    
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5)); // Limit to 5 suggestions
  }, [searchTerm, properties]);

  const filteredProperties = properties.filter(property =>
    (property.code || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.address || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.property_name || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (property.knowledge_base || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return {
    suggestions,
    filteredProperties
  };
}
