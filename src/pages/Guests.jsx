
// src/pages/Guests.jsx
import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar";
import { Link } from "react-router-dom";
import { Users, Search as SearchIcon } from "lucide-react";

export default function Guests() {
  const [guests, setGuests] = useState([]);
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/guests")
      .then(res => res.json())
      .then(data => setGuests(data));
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    // Generate suggestions based on search input
    const matches = guests.filter(guest =>
      (guest.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (guest.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (guest.property_id || "").toLowerCase().includes(search.toLowerCase())
    );
    
    // Get unique suggestion values across different fields
    const uniqueSuggestions = new Set();
    matches.forEach(guest => {
      if ((guest.name || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(guest.name);
      }
      if ((guest.phone || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(guest.phone);
      }
      if ((guest.property_id || "").toLowerCase().includes(search.toLowerCase())) {
        uniqueSuggestions.add(guest.property_id);
      }
    });
    
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5)); // Limit to 5 suggestions
  }, [search, guests]);

  const filtered = guests.filter(guest =>
    (guest.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.property_id || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="p-6 flex-1">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
          <h2 className="text-2xl font-bold">Guests</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search guests..."
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
              to="/dashboard/guests-manager"
              className="flex items-center gap-2 bg-accent text-white px-4 py-2 rounded-lg shadow hover:bg-accent/90 transition"
            >
              <Users size={18} /> Manage Guests
            </Link>
          </div>
        </div>
        {filtered.map(guest => (
          <div key={guest.phone} className="border p-4 mb-2 bg-white rounded shadow">
            <p><strong>Name:</strong> {guest.name}</p>
            <p><strong>Phone:</strong> {guest.phone}</p>
            <p><strong>Property:</strong> {guest.property_id}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
