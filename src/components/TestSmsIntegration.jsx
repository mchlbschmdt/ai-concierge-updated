
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { addTestPropertyCodes } from "@/utils/addTestPropertyCodes";

export default function TestSmsIntegration() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleAddTestData = async () => {
    setLoading(true);
    try {
      const result = await addTestPropertyCodes();
      
      if (result.success) {
        toast({
          title: "Test Data Added",
          description: "Sample property codes have been added successfully",
        });
      } else {
        toast({
          title: "Error",
          description: "Failed to add test data: " + result.error?.message,
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error", 
        description: "An error occurred while adding test data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-4">
      <h3 className="text-lg font-semibold mb-4">SMS Integration Test Setup</h3>
      
      <div className="space-y-4">
        <div className="text-sm text-gray-600">
          <p>To test the SMS integration, you'll need some property codes in the database.</p>
          <p className="mt-2">Test property codes that will be added:</p>
          <ul className="list-disc list-inside mt-1 text-xs">
            <li>1001 - Downtown Loft</li>
            <li>1002 - Beachfront Villa</li> 
            <li>1003 - Mountain Cabin</li>
          </ul>
        </div>

        <Button onClick={handleAddTestData} disabled={loading}>
          {loading ? "Adding..." : "Add Test Property Codes"}
        </Button>

        <div className="mt-4 p-3 bg-blue-50 rounded text-sm">
          <p className="font-medium">Testing Instructions:</p>
          <ol className="list-decimal list-inside mt-1 space-y-1 text-xs">
            <li>Make sure your OpenPhone webhook URL is set to: <br/>
                <code className="bg-gray-100 px-1 rounded">https://tulhwmzrvbzzacphunes.supabase.co/functions/v1/openphone-webhook</code>
            </li>
            <li>Send an SMS to your OpenPhone number with "1001", "1002", or "1003"</li>
            <li>The bot should respond asking for confirmation</li>
            <li>Reply with "Y" to confirm</li>
            <li>The bot should then be ready to help with inquiries</li>
          </ol>
        </div>
      </div>
    </div>
  );
}
