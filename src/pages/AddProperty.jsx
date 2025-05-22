
import React, { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { Loader2, Save } from "lucide-react";

export default function AddProperty() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  
  const [form, setForm] = useState({
    property_name: '',
    code: '',
    address: '',
    check_in_time: '4 PM',
    check_out_time: '10 AM',
    local_recommendations: '',
    knowledge_base: ''
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      // Validate required fields
      if (!form.property_name || !form.address) {
        toast({
          title: "Missing Information",
          description: "Please fill in all required fields.",
          variant: "destructive"
        });
        setLoading(false);
        return;
      }

      // Create a timestamped property code if one isn't provided
      const propertyCode = form.code || `PROP-${Date.now()}`;
      
      console.log("Saving property with data:", {
        ...form,
        code: propertyCode
      });
      
      // Add document to Firestore with error handling
      const docRef = await addDoc(collection(db, 'properties'), {
        ...form,
        code: propertyCode,
        created_at: new Date(),
        files: [],
        messages: []
      });
      
      console.log("Property document written with ID: ", docRef.id);
      
      toast({
        title: "Success!",
        description: "Property has been successfully added.",
      });
      
      // Redirect to property manager
      navigate("/dashboard/properties-manager");
    } catch (error) {
      console.error("Error adding property:", error);
      toast({
        title: "Error",
        description: `Failed to add property: ${error.message}`,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto bg-white rounded-lg shadow-sm">
      <h1 className="text-2xl font-bold mb-4 text-primary">Add New Property</h1>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="property_name" className="block text-sm font-medium mb-1">Property Name *</label>
          <Input 
            id="property_name"
            name="property_name" 
            value={form.property_name} 
            onChange={handleChange} 
            placeholder="Beach House" 
            required 
          />
        </div>
        
        <div>
          <label htmlFor="code" className="block text-sm font-medium mb-1">Unique Code</label>
          <Input 
            id="code"
            name="code" 
            value={form.code} 
            onChange={handleChange} 
            placeholder="BEACH-01 (auto-generated if empty)" 
          />
        </div>
        
        <div>
          <label htmlFor="address" className="block text-sm font-medium mb-1">Address *</label>
          <Input 
            id="address"
            name="address" 
            value={form.address} 
            onChange={handleChange} 
            placeholder="123 Main St, City, State" 
            required 
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="check_in_time" className="block text-sm font-medium mb-1">Check-in Time</label>
            <Input 
              id="check_in_time"
              name="check_in_time" 
              value={form.check_in_time} 
              onChange={handleChange} 
            />
          </div>
          <div>
            <label htmlFor="check_out_time" className="block text-sm font-medium mb-1">Check-out Time</label>
            <Input 
              id="check_out_time"
              name="check_out_time" 
              value={form.check_out_time} 
              onChange={handleChange} 
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="local_recommendations" className="block text-sm font-medium mb-1">Local Recommendations</label>
          <Input 
            id="local_recommendations"
            name="local_recommendations" 
            value={form.local_recommendations} 
            onChange={handleChange} 
            placeholder="Restaurants, attractions, etc." 
          />
        </div>
        
        <div>
          <label htmlFor="knowledge_base" className="block text-sm font-medium mb-1">Knowledge Base</label>
          <Textarea
            id="knowledge_base"
            name="knowledge_base"
            value={form.knowledge_base}
            onChange={handleChange}
            placeholder="Include important property details, house rules, wifi passwords, etc."
            className="resize-y min-h-[100px] max-h-[250px] bg-gray-50 border border-gray-300"
          />
        </div>
        
        <Button 
          type="submit" 
          className="w-full flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Adding Property...
            </>
          ) : (
            <>
              <Save className="h-4 w-4" />
              Save Property
            </>
          )}
        </Button>
      </form>
    </div>
  );
}
