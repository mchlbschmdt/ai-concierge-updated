
import { supabase } from "@/integrations/supabase/client";

// This is a utility to add test property codes - you can run this once to populate test data
export const addTestPropertyCodes = async () => {
  const testProperties = [
    {
      property_id: "prop-001",
      property_name: "Downtown Loft",
      address: "123 Main St, Downtown",
      code: "1001"
    },
    {
      property_id: "prop-002", 
      property_name: "Beachfront Villa",
      address: "456 Ocean Ave, Beachside",
      code: "1002"
    },
    {
      property_id: "prop-003",
      property_name: "Mountain Cabin",
      address: "789 Pine Ridge, Mountains",
      code: "1003"
    }
  ];

  try {
    const { data, error } = await supabase
      .from('property_codes')
      .insert(testProperties);

    if (error) {
      console.error('Error adding test properties:', error);
      return { success: false, error };
    }

    console.log('Test properties added successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error };
  }
};
