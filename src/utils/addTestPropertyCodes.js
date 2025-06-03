
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
    },
    {
      property_id: "prop-004",
      property_name: "User Property",
      address: "Your Property Address",
      code: "0404"
    }
  ];

  try {
    // First, check if any of these codes already exist
    const { data: existingCodes, error: checkError } = await supabase
      .from('property_codes')
      .select('code')
      .in('code', testProperties.map(p => p.code));

    if (checkError) {
      console.error('Error checking existing codes:', checkError);
      return { success: false, error: checkError };
    }

    // Filter out codes that already exist
    const existingCodeSet = new Set(existingCodes?.map(c => c.code) || []);
    const newProperties = testProperties.filter(p => !existingCodeSet.has(p.code));

    if (newProperties.length === 0) {
      console.log('All test properties already exist');
      return { success: true, data: [], message: 'All test properties already exist' };
    }

    const { data, error } = await supabase
      .from('property_codes')
      .insert(newProperties);

    if (error) {
      console.error('Error adding test properties:', error);
      return { success: false, error };
    }

    console.log('Test properties added successfully:', data);
    return { success: true, data, message: `Added ${newProperties.length} new property codes` };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error };
  }
};

// Function to check current property codes in database
export const checkPropertyCodes = async () => {
  try {
    const { data, error } = await supabase
      .from('property_codes')
      .select('*')
      .order('code');

    if (error) {
      console.error('Error fetching property codes:', error);
      return { success: false, error };
    }

    console.log('Current property codes:', data);
    return { success: true, data };
  } catch (error) {
    console.error('Error:', error);
    return { success: false, error };
  }
};
