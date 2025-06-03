
import { supabase } from '../integrations/supabase/client';

export async function fetchProperties() {
  try {
    console.log("Fetching properties from Supabase");
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error("Error fetching properties from Supabase:", error);
      throw new Error(`Failed to fetch properties: ${error.message}`);
    }
    
    console.log("Properties fetched from Supabase:", properties);
    return properties || [];
  } catch (error) {
    console.error("Exception fetching properties:", error);
    throw error; // Don't fall back to mock data - let the error bubble up
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log(`Updating property ${propertyId} with data:`, propertyData);
    
    const updateData = {
      ...propertyData,
      updated_at: new Date().toISOString()
    };
    
    const { error } = await supabase
      .from('properties')
      .update(updateData)
      .eq('id', propertyId);
    
    if (error) {
      console.error("Supabase error updating property:", error);
      throw new Error(`Failed to update property: ${error.message}`);
    }
    
    console.log("Property updated successfully");
    return { success: true, message: "Property updated successfully" };
  } catch (error) {
    console.error("Error updating property:", error);
    throw error;
  }
}

export async function deleteProperty(propertyId) {
  try {
    console.log(`Deleting property ${propertyId}`);
    
    const { error } = await supabase
      .from('properties')
      .delete()
      .eq('id', propertyId);
    
    if (error) {
      console.error("Supabase error deleting property:", error);
      throw new Error(`Failed to delete property: ${error.message}`);
    }
    
    console.log("Property deleted successfully");
    return { success: true, message: "Property deleted successfully" };
  } catch (error) {
    console.error("Error deleting property:", error);
    throw error;
  }
}

export async function addProperty(propertyData) {
  try {
    console.log(`Adding new property with data:`, propertyData);
    
    // Ensure we have required fields
    if (!propertyData.property_name || !propertyData.address) {
      throw new Error("Property name and address are required");
    }
    
    // Add timestamps
    const newProperty = {
      ...propertyData,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const { data, error } = await supabase
      .from('properties')
      .insert(newProperty)
      .select()
      .single();
    
    if (error) {
      console.error("Supabase error adding property:", error);
      throw new Error(`Failed to add property: ${error.message}`);
    }
    
    console.log("Property added successfully:", data);
    return { 
      success: true, 
      message: "Property added successfully",
      propertyId: data.id,
      property: data
    };
  } catch (error) {
    console.error("Error adding property:", error);
    throw error;
  }
}

export async function uploadFile(propertyId, file) {
  try {
    console.log(`Uploading file for property ${propertyId}:`, file.name);
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const filePath = `properties/${propertyId}/knowledge_base/${fileName}`;
    
    const { data, error } = await supabase.storage
      .from('property-files')
      .upload(filePath, file);
    
    if (error) {
      console.error("Storage upload error:", error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('property-files')
      .getPublicUrl(filePath);
    
    // Create file metadata
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
      message: "File uploaded successfully",
      file: fileData
    };
  } catch (error) {
    console.error("Error uploading file:", error);
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
      throw new Error(`Failed to delete file: ${error.message}`);
    }
    
    console.log("File deleted successfully");
    return {
      success: true,
      message: "File deleted successfully"
    };
  } catch (error) {
    console.error("Error deleting file:", error);
    throw error;
  }
}
