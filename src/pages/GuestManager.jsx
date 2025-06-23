
import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Edit } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import Layout from '../components/Layout';

export default function GuestManager() {
  const [guests, setGuests] = useState([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [search, setSearch] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const { toast } = useToast();

  // For editing
  const [editId, setEditId] = useState(null);
  const [editGuest, setEditGuest] = useState({
    name: "",
    phone: "",
    property_id: "",
  });

  const fetchGuests = async () => {
    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setGuests(data || []);
    } catch (error) {
      console.error("Error fetching guests:", error);
      toast({
        title: "Error",
        description: "Failed to load guests: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleAddGuest = async () => {
    if (!name || !phone || !propertyId) {
      toast({
        title: "Missing Information",
        description: "Please fill in all guest fields",
        variant: "destructive"
      });
      return;
    }
    
    try {
      const { error } = await supabase
        .from('guests')
        .insert([{
          name,
          phone,
          property_id: propertyId,
        }]);
      
      if (error) throw error;
      
      toast({
        title: "Success",
        description: "Guest added successfully"
      });
      
      setName("");
      setPhone("");
      setPropertyId("");
      fetchGuests();
    } catch (error) {
      console.error("Error adding guest:", error);
      toast({
        title: "Error",
        description: "Failed to add guest: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditClick = (guest) => {
    setEditId(guest.id);
    setEditGuest({
      name: guest.name,
      phone: guest.phone,
      property_id: guest.property_id,
    });
  };

  const handleEditChange = (field, value) => {
    setEditGuest((prev) => ({ ...prev, [field]: value }));
  };

  const handleEditSave = async (guestId) => {
    try {
      const { error } = await supabase
        .from('guests')
        .update({
          name: editGuest.name,
          phone: editGuest.phone,
          property_id: editGuest.property_id,
        })
        .eq('id', guestId);
      
      if (error) throw error;
      
      setEditId(null);
      setEditGuest({ name: "", phone: "", property_id: "" });
      fetchGuests();
      
      toast({
        title: "Success",
        description: "Guest updated successfully"
      });
    } catch (error) {
      console.error("Error updating guest:", error);
      toast({
        title: "Error",
        description: "Failed to update guest: " + error.message,
        variant: "destructive"
      });
    }
  };

  const handleEditCancel = () => {
    setEditId(null);
    setEditGuest({ name: "", phone: "", property_id: "" });
  };

  useEffect(() => {
    fetchGuests();
  }, []);

  useEffect(() => {
    if (search.trim() === '') {
      setSuggestions([]);
      return;
    }
    
    const matches = guests.filter(guest =>
      (guest.name || "").toLowerCase().includes(search.toLowerCase()) ||
      (guest.phone || "").toLowerCase().includes(search.toLowerCase()) ||
      (guest.property_id || "").toLowerCase().includes(search.toLowerCase())
    );
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
    setSuggestions(Array.from(uniqueSuggestions).slice(0, 5));
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
    <Layout>
      <div className="p-6 space-y-6">
        <h2 className="text-2xl font-bold">Add New Guest</h2>
        <div className="flex flex-col md:flex-row gap-4">
          <Input
            placeholder="Guest Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Phone Number"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="flex-1"
          />
          <Input
            placeholder="Property ID (e.g., PR1234)"
            value={propertyId}
            onChange={(e) => setPropertyId(e.target.value)}
            className="flex-1"
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
            <li key={guest.id} className="border p-4 rounded-lg bg-white shadow-sm flex flex-col gap-2">
              {editId === guest.id ? (
                <div className="flex flex-col gap-2">
                  <Input
                    value={editGuest.name}
                    onChange={(e) => handleEditChange("name", e.target.value)}
                    placeholder="Guest Name"
                  />
                  <Input
                    value={editGuest.phone}
                    onChange={(e) => handleEditChange("phone", e.target.value)}
                    placeholder="Phone Number"
                  />
                  <Input
                    value={editGuest.property_id}
                    onChange={(e) => handleEditChange("property_id", e.target.value)}
                    placeholder="Property ID"
                  />
                  <div className="flex gap-2 mt-2">
                    <Button onClick={() => handleEditSave(guest.id)}>Save</Button>
                    <Button onClick={handleEditCancel} variant="destructive">Cancel</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div>
                    <p><strong>Name:</strong> {guest.name}</p>
                    <p><strong>Phone:</strong> {guest.phone}</p>
                    <p><strong>Property:</strong> {guest.property_id}</p>
                  </div>
                  <Button onClick={() => handleEditClick(guest)} size="sm">
                    <Edit size={16} className="inline mr-1" /> Edit
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </Layout>
  );
}
