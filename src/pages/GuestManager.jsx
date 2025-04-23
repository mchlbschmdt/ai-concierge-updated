
import React, { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  addDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);

  const fetchGuests = async () => {
    const snapshot = await getDocs(collection(db, "guests"));
    const data = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    setGuests(data);
  };

  const handleAddGuest = async () => {
    if (!name || !phone || !propertyId) return;
    await addDoc(collection(db, "guests"), {
      name,
      phone,
      property_id: propertyId,
    });
    setName("");
    setPhone("");
    setPropertyId("");
    fetchGuests();
  };

  useEffect(() => {
    fetchGuests();
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

  const handleSuggestionSelect = (suggestion) => {
    setSearch(suggestion);
    setSuggestions([]);
  };

  const filtered = guests.filter(guest =>
    !search || 
    (guest.name || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.phone || "").toLowerCase().includes(search.toLowerCase()) ||
    (guest.property_id || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Add New Guest</h2>
      <div className="flex gap-4">
        <Input
          placeholder="Guest Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Input
          placeholder="Phone Number"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <Input
          placeholder="Property ID (e.g., PR1234)"
          value={propertyId}
          onChange={(e) => setPropertyId(e.target.value)}
        />
        <Button onClick={handleAddGuest}>Add</Button>
      </div>

      <div className="relative max-w-md mb-4">
        <Input
          type="text"
          placeholder="Search guests..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-8 pr-3 py-2 bg-white w-full"
        />
        <Search className="absolute left-2 top-2.5 text-gray-400" size={18} />
        
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

      <h3 className="text-xl font-semibold">Guest List</h3>
      <ul className="space-y-2">
        {filtered.map((guest) => (
          <li key={guest.id} className="border p-4 rounded-lg bg-white shadow-sm">
            <p><strong>Name:</strong> {guest.name}</p>
            <p><strong>Phone:</strong> {guest.phone}</p>
            <p><strong>Property:</strong> {guest.property_id}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
