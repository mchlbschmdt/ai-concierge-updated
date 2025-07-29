
import { supabase } from '../integrations/supabase/client';

export async function fetchProperties() {
  try {
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Supabase error:", error.message);
      throw new Error(`Database error: ${error.message}`);
    }
    
    return properties || [];
  } catch (error) {
    console.error("Error fetching properties:", error);
    throw error;
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log("Updating property with data:", propertyData);
    
    // Ensure all fields are included in the update
    const updateData = {
      property_name: propertyData.property_name,
      address: propertyData.address,
      code: propertyData.code,
      check_in_time: propertyData.check_in_time,
      check_out_time: propertyData.check_out_time,
      wifi_name: propertyData.wifi_name,
      wifi_password: propertyData.wifi_password,
      access_instructions: propertyData.access_instructions,
      directions_to_property: propertyData.directions_to_property,
      parking_instructions: propertyData.parking_instructions,
      emergency_contact: propertyData.emergency_contact,
      house_rules: propertyData.house_rules,
      amenities: propertyData.amenities,
      local_recommendations: propertyData.local_recommendations,
      cleaning_instructions: propertyData.cleaning_instructions,
      special_notes: propertyData.special_notes,
      knowledge_base: propertyData.knowledge_base,
      updated_at: new Date().toISOString()
    };
    
    console.log("Final update data:", updateData);
    
    const { data, error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId)
      .select()
      .single();
    
    if (error) {
      console.error("Update error:", error);
      throw new Error(`Failed to update: ${error.message}`);
    }
    
    console.log("Property updated successfully:", data);
    return { success: true, property: data };
  } catch (error) {
    console.error("Error in updateProperty:", error);
    throw error;
  }
}

export async function deleteProperty(propertyId) {
  try {
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);
    
    if (error) {
      console.error("Delete error:", error);
      throw new Error(`Failed to delete: ${error.message}`);
    }
    
    return { success: true };
  } catch (error) {
    console.error("Error in deleteProperty:", error);
    throw error;
  }
}

export async function addProperty(propertyData) {
  try {
    console.log("Adding property:", propertyData);
    
    if (!propertyData.property_name || !propertyData.address) {
      throw new Error("Property name and address are required");
    }

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required to add property");
    }
    
    // Ensure we have all required fields with defaults
    const insertData = {
      property_name: propertyData.property_name,
      code: propertyData.code || `PROP-${Date.now()}`,
      address: propertyData.address,
      user_id: user.id, // Add user_id for RLS
      check_in_time: propertyData.check_in_time || '4:00 PM',
      check_out_time: propertyData.check_out_time || '11:00 AM',
      wifi_name: propertyData.wifi_name || '',
      wifi_password: propertyData.wifi_password || '',
      access_instructions: propertyData.access_instructions || '',
      directions_to_property: propertyData.directions_to_property || '',
      parking_instructions: propertyData.parking_instructions || '',
      emergency_contact: propertyData.emergency_contact || '',
      house_rules: propertyData.house_rules || '',
      amenities: propertyData.amenities || '[]',
      local_recommendations: propertyData.local_recommendations || '',
      cleaning_instructions: propertyData.cleaning_instructions || '',
      special_notes: propertyData.special_notes || '',
      knowledge_base: propertyData.knowledge_base || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log("Insert data:", insertData);
    
    const { data, error } = await supabase
      .from('properties')
      .insert(insertData)
      .select()
      .single();
    
    if (error) {
      console.error("Insert error:", error);
      throw new Error(`Failed to add property: ${error.message}`);
    }
    
    console.log("Property added successfully:", data);
    return { 
      success: true, 
      propertyId: data.id,
      property: data
    };
  } catch (error) {
    console.error("Error in addProperty:", error);
    throw error;
  }
}

export async function uploadFile(propertyId, file) {
  try {
    console.log(`Uploading file for property ${propertyId}:`, file.name);
    
    // Get current user for file path security
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error("Authentication required to upload files");
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const filePath = `${user.id}/${propertyId}/knowledge_base/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('property-files')
      .upload(filePath, file);
    
    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Upload failed: ${error.message}`);
    }
    
    const { data: urlData } = supabase.storage
      .from('property-files')
      .getPublicUrl(filePath);
    
    const fileData = {
      name: file.name,
      path: filePath,
      type: fileExt || 'unknown',
      size: `${(file.size / 1024).toFixed(2)} KB`,
      uploaded_at: new Date().toISOString(),
      url: urlData?.publicUrl
    };
    
    console.log("File uploaded successfully:", fileData);
    return {
      success: true,
      file: fileData
    };
  } catch (error) {
    console.error("Error in uploadFile:", error);
    throw error;
  }
}

export async function deleteFile(propertyId, filePath) {
  try {
    console.log(`Deleting file from property ${propertyId}:`, filePath);
    
    const { error } = await supabase.storage
      .from('property-files')
      .remove([filePath]);
    
    if (error) {
      console.error("Storage delete error:", error);
      throw new Error(`Delete failed: ${error.message}`);
    }
    
    console.log("File deleted successfully");
    return { success: true };
  } catch (error) {
    console.error("Error in deleteFile:", error);
    throw error;
  }
}
