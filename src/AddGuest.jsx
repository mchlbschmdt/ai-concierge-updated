
import React, { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Loader2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

export default function AddGuest() {
  const [guestName, setGuestName] = useState("");
  const [guestPhone, setGuestPhone] = useState("");
  const [guestPropertyId, setGuestPropertyId] = useState("");
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    // Load mock properties for the dropdown
    const mockProperties = [
      { id: 'prop1', property_name: 'Sunset Beach Villa', code: 'SBV001' },
      { id: 'prop2', property_name: 'Mountain Retreat Cabin', code: 'MRC002' },
      { id: 'prop3', property_name: 'Downtown Loft', code: 'DTL003' }
    ];
    setProperties(mockProperties);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate inputs
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
      // Mock adding a guest to the database
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const guestData = {
        name: guestName,
        phone: guestPhone,
        property_id: guestPropertyId,
        created_at: new Date()
      };
      
      console.log("Adding guest:", guestData);
      
      // In production, this would write to Firestore
      // await addDoc(collection(db, "guests"), guestData);
      
      // Show success toast
      toast({
        title: "Success",
        description: "Guest added successfully!"
      });
      
      // Reset form
      setGuestName("");
      setGuestPhone("");
      setGuestPropertyId("");
      
      // Navigate to guests page
      navigate("/dashboard/guests-manager");
    } catch (err) {
      console.error("Error adding guest:", err);
      toast({
        title: "Error",
        description: "Failed to add guest: " + (err.message || "Unknown error"),
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Add Guest</h2>
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
          >
            <option value="">Select a property</option>
            {properties.map(property => (
              <option key={property.id} value={property.id}>
                {property.property_name} ({property.code})
              </option>
            ))}
          </select>
        </div>
        
        <Button 
          type="submit" 
          className="w-full mt-4"
          disabled={loading}
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
