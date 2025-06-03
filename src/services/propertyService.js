import { supabase } from '../integrations/supabase/client';

export async function fetchProperties() {
  try {
    console.log("=== fetchProperties START ===");
    console.log("Supabase client:", supabase);
    console.log("About to query properties table...");
    
    const { data: properties, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    console.log("Supabase query completed");
    console.log("Error:", error);
    console.log("Data:", properties);
    
    if (error) {
      console.error("Supabase error details:", {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      throw new Error(`Database error: ${error.message}`);
    }
    
    console.log("Query successful, returning properties:", properties);
    console.log("=== fetchProperties END ===");
    return properties || [];
  } catch (error) {
    console.error("=== fetchProperties ERROR ===");
    console.error("Caught error:", error);
    console.error("Error type:", typeof error);
    console.error("Error constructor:", error.constructor.name);
    throw error;
  }
}

export async function updateProperty(propertyId, propertyData) {
  try {
    console.log(`Updating property ${propertyId}:`, propertyData);
    
    const { error } = await supabase
      .from('properties')
      .update({
        ...propertyData,
        updated_at: new Date().toISOString()
      })
      .eq('id', propertyId);
    
    if (error) {
      console.error("Update error:", error);
      throw new Error(`Failed to update: ${error.message}`);
    }
    
    console.log("Property updated successfully");
    return { success: true };
  } catch (error) {
    console.error("Error in updateProperty:", error);
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
      console.error("Delete error:", error);
      throw new Error(`Failed to delete: ${error.message}`);
    }
    
    console.log("Property deleted successfully");
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
    
    // Ensure we have all required fields with defaults
    const insertData = {
      property_name: propertyData.property_name,
      code: propertyData.code || `PROP-${Date.now()}`,
      address: propertyData.address,
      check_in_time: propertyData.check_in_time || '4:00 PM',
      check_out_time: propertyData.check_out_time || '11:00 AM',
      knowledge_base: propertyData.knowledge_base || '',
      local_recommendations: propertyData.local_recommendations || '',
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
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${file.name.replace(/\s/g, '_')}`;
    const filePath = `properties/${propertyId}/knowledge_base/${fileName}`;
    
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
