
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "./integrations/supabase/client";
import { fetchProperties } from "./services/propertyService";

export default function AddGuest() {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPropertyId, setGuestPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingProperties, setLoadingProperties] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadProperties() {
      try {
        console.log("Loading properties for guest form...");
        const propertiesData = await fetchProperties();
        setProperties(propertiesData || []);
      } catch (error) {
        console.error("Error loading properties:", error);
        toast({
          title: "Warning",
          description: "Could not load properties. You may need to add properties first.",
          variant: "default"
        });
        setProperties([]);
      } finally {
        setLoadingProperties(false);
      }
    }
    
    loadProperties();
  }, [toast]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!guestName.trim() || !guestPhone.trim() || !guestPropertyId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    setLoading(true);
    
    try {
      console.log("Adding guest to database...");
      
      const { data, error } = await supabase
        .from('sms_conversations')
        .insert({
          phone_number: guestPhone,
          property_id: guestPropertyId,
          conversation_state: 'property_confirmed',
          property_confirmed: true
        })
        .select()
        .single();
      
      if (error) {
        console.error("Database error:", error);
        throw new Error(error.message);
      }
      
      console.log("Guest added successfully:", data);
      
      toast({
        title: "Success",
        description: "Guest added successfully!"
      });
      
      // Reset form
      setGuestName("");
      setGuestPhone("");
      setGuestPropertyId("");
      
      // Navigate to guests manager
      navigate("/dashboard/guests-manager");
    } catch (error) {
      console.error("Error adding guest:", error);
      toast({
        title: "Error",
        description: `Failed to add guest: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingProperties) {
    return (
      <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
        <div className="flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading properties...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Guest</h2>
      
      {properties.length === 0 && (
        <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
          <p className="text-yellow-800 text-sm">
            No properties found. Please add a property first before adding guests.
          </p>
          <Button 
            onClick={() => navigate("/dashboard/add-property")}
            variant="outline"
            size="sm"
            className="mt-2"
          >
            Add Property
          </Button>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="guestName" className="block text-sm font-medium mb-1">Guest Name *</label>
          <Input
            id="guestName"
            type="text"
            placeholder="Full Name"
            value={guestName}
            onChange={(e) => setGuestName(e.target.value)}
            className="w-full"
            required
          />
        </div>
        
        <div>
          <label htmlFor="guestPhone" className="block text-sm font-medium mb-1">Phone Number *</label>
          <Input
            id="guestPhone"
            type="text"
            placeholder="+1 (555) 123-4567"
            value={guestPhone}
            onChange={(e) => setGuestPhone(e.target.value)}
            className="w-full"
            required
          />
        </div>
        
        <div>
          <label htmlFor="guestPropertyId" className="block text-sm font-medium mb-1">Property *</label>
          <select
            id="guestPropertyId"
            value={guestPropertyId}
            onChange={(e) => setGuestPropertyId(e.target.value)}
            className="w-full p-2 border rounded"
            required
            disabled={properties.length === 0}
          >
            <option value="">Select a property</option>
            {properties.map(property => (
              <option key={property.id} value={property.code}>
                {property.property_name} ({property.code})
              </option>
            ))}
          </select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full mt-4"
          disabled={loading || properties.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Adding Guest...
            </>
          ) : (
            "Add Guest"
          )}
        </Button>
      </form>
    </div>
  );
}
