
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Copy } from "lucide-react";

export default function PropertyCodeManager() {
  const [propertyCodes, setPropertyCodes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCode, setNewCode] = useState({
    code: '',
    property_name: '',
    address: '',
    property_id: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    fetchPropertyCodes();
  }, []);

  const fetchPropertyCodes = async () => {
    try {
      const { data, error } = await supabase
        .from('property_codes')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPropertyCodes(data || []);
    } catch (error) {
      console.error('Error fetching property codes:', error);
      toast({
        title: "Error",
        description: "Failed to load property codes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addPropertyCode = async () => {
    if (!newCode.code || !newCode.property_name || !newCode.address) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('property_codes')
        .insert({
          code: newCode.code,
          property_id: newCode.property_id || newCode.code,
          property_name: newCode.property_name,
          address: newCode.address
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property code added successfully"
      });

      setNewCode({ code: '', property_name: '', address: '', property_id: '' });
      fetchPropertyCodes();
    } catch (error) {
      console.error('Error adding property code:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to add property code",
        variant: "destructive"
      });
    }
  };

  const deletePropertyCode = async (id) => {
    try {
      const { error } = await supabase
        .from('property_codes')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Property code deleted successfully"
      });

      fetchPropertyCodes();
    } catch (error) {
      console.error('Error deleting property code:', error);
      toast({
        title: "Error",
        description: "Failed to delete property code",
        variant: "destructive"
      });
    }
  };

  const copyInstructions = (code) => {
    const instructions = `Text ${code} to 833-330-1032 to get started with your stay!`;
    navigator.clipboard.writeText(instructions);
    toast({
      title: "Copied!",
      description: "Guest instructions copied to clipboard"
    });
  };

  if (loading) {
    return <div className="text-center py-4">Loading property codes...</div>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Add New Property Code</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Property Code *</label>
              <Input
                placeholder="e.g., 1234"
                value={newCode.code}
                onChange={(e) => setNewCode({ ...newCode, code: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Property ID</label>
              <Input
                placeholder="Internal ID (optional)"
                value={newCode.property_id}
                onChange={(e) => setNewCode({ ...newCode, property_id: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Property Name *</label>
            <Input
              placeholder="e.g., Sunset Beach Villa"
              value={newCode.property_name}
              onChange={(e) => setNewCode({ ...newCode, property_name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address *</label>
            <Input
              placeholder="e.g., 123 Oceanfront Drive, Malibu, CA"
              value={newCode.address}
              onChange={(e) => setNewCode({ ...newCode, address: e.target.value })}
            />
          </div>
          <Button onClick={addPropertyCode} className="w-full">
            <Plus className="mr-2 h-4 w-4" />
            Add Property Code
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Existing Property Codes</CardTitle>
        </CardHeader>
        <CardContent>
          {propertyCodes.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No property codes found</p>
          ) : (
            <div className="space-y-4">
              {propertyCodes.map((property) => (
                <div key={property.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-primary">Code: {property.code}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => copyInstructions(property.code)}
                          className="h-7"
                        >
                          <Copy className="h-3 w-3 mr-1" />
                          Copy Instructions
                        </Button>
                      </div>
                      <p className="font-semibold">{property.property_name}</p>
                      <p className="text-gray-600">{property.address}</p>
                      <p className="text-sm text-gray-500">Property ID: {property.property_id}</p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deletePropertyCode(property.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    <strong>Guest Instructions:</strong> Text {property.code} to 833-330-1032 to get started with your stay!
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
